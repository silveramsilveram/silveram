import { Router, urlencoded } from 'express';
import { z } from 'zod';
import { marketingConfigured, subscribeContact, unsubscribeContact } from '../mail/mailjet.js';
import { getDocument } from '../platform/appwrite.js';
import {
  markMarketingContactUnsubscribed, recordMarketingConsent, verifyMarketingUnsubscribeToken,
} from '../marketing.js';
import { consumeRateLimit } from '../security.js';

const schema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  name: z.string().trim().max(100).optional(),
  consent: z.literal(true),
}).strict();

export function createNewsletterRouter(config) {
  const router = Router();
  router.use(urlencoded({ extended: false, limit: '1kb' }));

  router.post('/subscribe', async (req, res, next) => {
    try {
      if (!marketingConfigured(config)) {
        return res.status(503).json({ error: 'Newsletter sign-up is not available yet.' });
      }
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email address.' });
      if (
        !(await consumeRateLimit(req.ip, 'newsletter-ip', 10, 60 * 60 * 1000)) ||
        !(await consumeRateLimit(parsed.data.email, 'newsletter-email', 3, 60 * 60 * 1000))
      ) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
      }
      const consent = await recordMarketingConsent(parsed.data.email, parsed.data.name);
      if (consent.contact?.status === 'subscribed') {
        await subscribeContact(config, parsed.data.email, parsed.data.name, { explicitResubscribe: consent.reOptedIn });
      }
      // Same answer whether or not the address was already subscribed.
      return res.status(202).json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.get('/unsubscribe', async (req, res, next) => {
    try {
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      const id = verifyMarketingUnsubscribeToken(token, config.otpPepper);
      if (!id) return res.status(400).type('html').send('<!doctype html><html lang="en"><meta charset="utf-8"><title>Invalid link</title><p>This unsubscribe link is invalid.</p></html>');
      const contact = await getDocument('marketingContacts', id);
      if (!contact || contact.status !== 'subscribed') {
        return res.type('html').send('<!doctype html><html lang="en"><meta charset="utf-8"><title>Unsubscribe</title><p>This address is already unsubscribed or the link is no longer active.</p></html>');
      }
      return res.type('html').send(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Unsubscribe</title><h1>Unsubscribe from Silveram updates</h1><p>Confirm to stop receiving marketing updates from Silveram.</p><form method="post" action="/api/newsletter/unsubscribe"><input type="hidden" name="token" value="${token}"><button type="submit">Unsubscribe</button></form></html>`);
    } catch (error) {
      next(error);
    }
  });

  router.post('/unsubscribe', async (req, res, next) => {
    try {
      const id = verifyMarketingUnsubscribeToken(req.body?.token, config.otpPepper);
      if (!id) return res.status(400).type('html').send('<!doctype html><html lang="en"><meta charset="utf-8"><title>Invalid link</title><p>This unsubscribe link is invalid.</p></html>');
      const result = await markMarketingContactUnsubscribed(id);
      if (!result) return res.status(400).type('html').send('<!doctype html><html lang="en"><meta charset="utf-8"><title>Invalid link</title><p>This unsubscribe link is no longer active.</p></html>');
      if (result.changed && marketingConfigured(config)) {
        await unsubscribeContact(config, result.contact.email);
      }
      return res.type('html').send('<!doctype html><html lang="en"><meta charset="utf-8"><title>Unsubscribed</title><h1>You are unsubscribed</h1><p>Silveram will not include this address in future marketing exports.</p></html>');
    } catch (error) {
      next(error);
    }
  });

  return router;
}
