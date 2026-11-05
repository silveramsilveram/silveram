import { Router } from 'express';
import { z } from 'zod';
import { getDocument } from '../platform/appwrite.js';
import { optionalUser } from '../middleware.js';
import { markCartEmailSent, recordCart } from '../customers.js';
import { getMailer } from '../mail/transport.js';
import { cartSavedEmail } from '../mail/templates.js';
import { consumeRateLimit } from '../security.js';

const HOUR = 60 * 60 * 1000;

const schema = z.object({
  // Guests supply their contact details; signed-in customers are identified by their session.
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()).optional(),
  name: z.string().trim().max(100).optional(),
  phone: z.string().regex(/^\d{10}$/).optional(),
  items: z.array(z.object({
    id: z.string().min(1).max(36),
    quantity: z.number().int().min(1).max(10),
  }).strict()).max(20),
}).strict();

export function createCartRouter(config) {
  const router = Router();

  // Saves the customer's bag against their e-mail (Appwrite `customers`) and, at most once every
  // few hours, e-mails them a link back to it. Works for guests as soon as they give an address.
  router.post('/sync', optionalUser, async (req, res, next) => {
    try {
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'The bag could not be saved.' });
      const { items, name, phone } = parsed.data;
      const email = req.user ? req.user.email : parsed.data.email;
      if (!email) return res.status(400).json({ error: 'Enter your email address first.' });

      if (
        !(await consumeRateLimit(req.ip, 'cart-ip', 60, HOUR)) ||
        !(await consumeRateLimit(email, 'cart-email', 30, HOUR))
      ) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }

      // Price the bag from Appwrite, never from the browser.
      const lines = [];
      for (const { id, quantity } of items) {
        const product = await getDocument('products', id);
        if (product?.active === true && Number.isSafeInteger(product.priceInPaise)) {
          lines.push({ id: product.$id, name: product.name, quantity, unitPriceInPaise: product.priceInPaise });
        }
      }

      const { shouldEmail, id } = await recordCart(
        { email, name: name || req.user?.name, phone, userId: req.user?.id, source: req.user ? 'account' : 'guest' },
        lines,
      );

      let emailed = false;
      const mailer = getMailer(config);
      if (shouldEmail && mailer && (await consumeRateLimit(req.ip, 'cart-email-send-ip', 10, HOUR))) {
        try {
          await mailer.sendMail({
            from: config.smtpFrom,
            to: email,
            ...(config.supportEmail && { replyTo: config.supportEmail }),
            ...cartSavedEmail(config, { name: name || req.user?.name || '', lines }),
          });
          await markCartEmailSent(id);
          emailed = true;
        } catch (error) {
          console.error('Saved-bag email failed:', error?.message || 'Unknown error');
        }
      }
      return res.json({ saved: true, emailed });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
