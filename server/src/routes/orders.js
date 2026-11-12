import { Router } from 'express';
import { z } from 'zod';
import { createDocument, getAppwrite, getDocument, listDocuments, Query, runTransaction, updateDocument } from '../platform/appwrite.js';
import { optionalUser, requireUser } from '../middleware.js';
import { sendOrderConfirmationBestEffort } from '../mail/orderConfirmation.js';
import { consumeRateLimit } from '../security.js';
import { recordCustomerOrder } from '../customers.js';
import {
  channelFor,
  createCashfreeOrder,
  findSuccessfulPayment,
  getCashfreeOrder,
} from '../payments/cashfree/client.js';

const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase());
const orderIdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/);
const GUEST_ID = 'guest';
const HOUR = 60 * 60 * 1000;

const requestSchema = z.object({
  requestId: orderIdSchema,
  // Cash on delivery and Cashfree (UPI / QR / cards) are the real methods; 'test' is a dummy gateway.
  paymentMethod: z.enum(['cod', 'cashfree', 'test']),
  // How the customer chose to pay (UPI or card); recorded for the receipt and for support.
  paymentChannel: z.enum(['upi', 'card']).optional(),
  // Required only when nobody is signed in (guest checkout).
  guestEmail: emailSchema.optional(),
  customer: z.object({
    name: z.string().trim().min(1).max(100),
    phone: z.string().regex(/^\d{10}$/),
    altPhone: z.string().regex(/^\d{10}$/).optional(),
    address: z.string().trim().min(1).max(300),
    landmark: z.string().trim().min(1).max(120).optional(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    postalCode: z.string().regex(/^\d{6}$/),
    country: z.literal('IN'),
  }).strict(),
  items: z.array(z.object({
    id: z.string().min(1).max(36),
    quantity: z.number().int().min(1).max(10),
  }).strict()).min(1).max(20),
}).strict();

function orderData(order) {
  try {
    return {
      ...order,
      items: JSON.parse(order.itemsJson),
      shipping: JSON.parse(order.shippingJson),
    };
  } catch (error) {
    throw new Error(`Order ${order.$id} contains invalid data: ${error.message}`);
  }
}

function sameOrder(existing, identity, paymentMethod, requestedItems, shipping) {
  const data = orderData(existing);
  const existingItems = data.items
    .map(({ productId, quantity }) => [productId, quantity])
    .sort(([left], [right]) => left.localeCompare(right));
  const expectedItems = [...requestedItems]
    .map(([id, quantity]) => [id, quantity])
    .sort(([left], [right]) => left.localeCompare(right));
  return existing.userId === identity.id &&
    existing.email === identity.email &&
    existing.paymentMethod === paymentMethod &&
    JSON.stringify(existingItems) === JSON.stringify(expectedItems) &&
    JSON.stringify(data.shipping) === JSON.stringify(shipping);
}

// What the order's owner (signed-in user, or a guest who proved their email) may see.
function publicOrder(order) {
  const { items, shipping } = orderData(order);
  return {
    id: order.$id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentChannel: order.paymentChannel || null,
    amountInPaise: order.amountInPaise,
    currency: order.currency,
    createdAt: order.createdAt,
    email: order.email,
    guest: order.userId === GUEST_ID,
    items: items.map(({ productId, sku, name, quantity, unitPriceInPaise, lineTotalInPaise }) => ({
      productId, sku, name, quantity, unitPriceInPaise, lineTotalInPaise,
    })),
    shipping,
  };
}

function orderResponse(order, config) {
  return {
    order: publicOrder(order),
    orderId: order.$id,
    amountInPaise: order.amountInPaise,
    currency: 'INR',
    paymentMethod: order.paymentMethod,
    status: order.status,
    ...(order.cashfreePaymentSessionId && order.status === 'pending_payment' && {
      cashfreePaymentSessionId: order.cashfreePaymentSessionId,
      cashfreeMode: config.cashfreeEnv,
    }),
  };
}

async function reserveOrder(config, input, identity) {
  const requested = new Map();
  for (const item of input.items) {
    if (requested.has(item.id)) throw Object.assign(new Error('Your bag contains a duplicate item.'), { status: 400 });
    requested.set(item.id, item.quantity);
  }

  const existing = await getDocument('orders', input.requestId);
  let order = existing;
  if (existing) {
    if (!sameOrder(existing, identity, input.paymentMethod, requested, input.customer)) {
      throw Object.assign(new Error('This order request is no longer available.'), { status: 409 });
    }
    if (
      ['expired', 'cancelled', 'refunded', 'fulfilled', 'payment_review'].includes(existing.status) ||
      (existing.status === 'pending_payment' && existing.reservationExpiresAt <= Date.now())
    ) {
      throw Object.assign(new Error('This order can no longer be paid. Please contact the store.'), { status: 409 });
    }
    if (existing.paymentMethod === 'cod' || existing.paymentMethod === 'test') return existing;
    if (existing.paymentMethod === 'cashfree' && existing.cashfreeOrderId) {
      if (existing.status === 'pending_payment') {
        existing.cashfreePaymentSessionId = (await getCashfreeOrder(config, existing.$id)).payment_session_id;
      }
      return existing;
    }
  }

  if (!order) {
    try {
      order = await runTransaction(async (transactionId) => {
        const { databases, databaseId, collections } = getAppwrite();
        const lines = [];
        let total = 0;
        // Read every product at once (a 3-item bag costs one round trip, not three).
        const entries = [...requested];
        const products = await Promise.all(entries.map(([id]) => getDocument('products', id)));
        const stockUpdates = [];
        for (const [index, [, quantity]] of entries.entries()) {
          const product = products[index];
          if (!product || product.active !== true || product.currency !== 'INR') {
            throw Object.assign(new Error('An item in your bag is no longer available.'), { status: 400 });
          }
          if (!Number.isSafeInteger(product.priceInPaise) || product.priceInPaise < 1) {
            throw new Error('A product has an invalid configured price.');
          }
          if (!Number.isSafeInteger(product.stockQuantity) || product.stockQuantity < quantity) {
            throw Object.assign(new Error('An item in your bag is out of stock.'), { status: 409 });
          }
          const lineTotalInPaise = product.priceInPaise * quantity;
          total += lineTotalInPaise;
          lines.push({
            productId: product.$id,
            sku: product.sku,
            name: product.name,
            quantity,
            unitPriceInPaise: product.priceInPaise,
            lineTotalInPaise,
          });
          stockUpdates.push(databases.updateDocument({
            databaseId,
            collectionId: collections.products,
            documentId: product.$id,
            data: { stockQuantity: product.stockQuantity - quantity, updatedAt: Date.now() },
            transactionId,
          }));
        }
        await Promise.all(stockUpdates);
        if (!Number.isSafeInteger(total) || total > 2147483647) {
          throw Object.assign(new Error('The order total is above the supported checkout limit.'), { status: 400 });
        }
        const now = Date.now();
        const data = {
          userId: identity.id,
          email: identity.email,
          // COD orders are confirmed immediately (stock is held, payment is collected on delivery).
          status: input.paymentMethod === 'cod' ? 'placed_cod' : 'pending_payment',
          paymentMethod: input.paymentMethod,
          ...(input.paymentChannel && { paymentChannel: input.paymentChannel }),
          amountInPaise: total,
          currency: 'INR',
          itemsJson: JSON.stringify(lines),
          shippingJson: JSON.stringify(input.customer),
          createdAt: now,
          updatedAt: now,
          confirmationEmailAttempts: 0,
          ...(input.paymentMethod !== 'cod' && { reservationExpiresAt: now + 30 * 60 * 1000 }),
        };
        return createDocument('orders', input.requestId, data, transactionId);
      });
    } catch (error) {
      if (error?.code === 409) {
        const duplicate = await getDocument('orders', input.requestId);
        if (duplicate && sameOrder(duplicate, identity, input.paymentMethod, requested, input.customer)) {
          order = duplicate;
        } else {
          throw Object.assign(new Error('Inventory changed during checkout. Please refresh your bag and try again.'), { status: 409 });
        }
      } else {
        throw error;
      }
    }
  }

  if (order.paymentMethod === 'cod' || order.paymentMethod === 'test') return order;
  if (order.paymentMethod === 'cashfree') {
    if (order.cashfreeOrderId) return order;
    const cashfreeOrder = await createCashfreeOrder(config, { ...orderData(order), _id: order.$id }, identity);
    const updated = await updateDocument('orders', order.$id, {
      cashfreeOrderId: String(cashfreeOrder.order_id || order.$id).slice(0, 100),
      updatedAt: Date.now(),
    });
    updated.cashfreePaymentSessionId = cashfreeOrder.payment_session_id;
    return updated;
  }
  return order;
}

let lastSweepAt = 0;
/** Best-effort, throttled to once a minute per instance; never blocks or fails a checkout. */
async function sweepExpiredReservations() {
  const now = Date.now();
  if (now - lastSweepAt < 60 * 1000) return;
  lastSweepAt = now;
  try {
    await releaseExpiredReservations();
  } catch (error) {
    console.error('Releasing expired reservations failed:', error?.code ?? '', error?.message || error);
  }
}

export async function releaseExpiredReservations() {
  const expired = await listDocuments('orders', [
    Query.equal('status', 'pending_payment'),
    Query.lessThan('reservationExpiresAt', Date.now()),
    Query.limit(50),
  ]);
  for (const candidate of expired) {
    try {
      await runTransaction(async (transactionId) => {
        const { databases, databaseId, collections } = getAppwrite();
        const current = await getDocument('orders', candidate.$id);
        if (!current || current.status !== 'pending_payment' || current.reservationExpiresAt > Date.now()) return;
        const { items } = orderData(current);
        for (const item of items) {
          const product = await getDocument('products', item.productId);
          if (!product) continue;
          await databases.updateDocument({
            databaseId,
            collectionId: collections.products,
            documentId: product.$id,
            data: { stockQuantity: product.stockQuantity + item.quantity, updatedAt: Date.now() },
            transactionId,
          });
        }
        await databases.updateDocument({
          databaseId,
          collectionId: collections.orders,
          documentId: current.$id,
          data: { status: 'expired', updatedAt: Date.now() },
          transactionId,
        });
      });
    } catch (error) {
      if (error?.code !== 409) throw error;
    }
  }
}

export function startReservationSweeper() {
  const timer = setInterval(() => {
    releaseExpiredReservations().catch((error) => {
      console.error('Reservation expiry sweep failed:', error?.message || error);
    });
  }, 60_000);
  timer.unref();
}

function sameEmail(left, right) {
  return typeof left === 'string' && typeof right === 'string' && left.toLowerCase() === right.toLowerCase();
}

// An order may be acted on by its signed-in owner, or - for guest orders - by someone who
// supplies the e-mail address the order was placed with.
function ownsOrder(order, user, email) {
  if (!order) return false;
  if (user) return order.userId === user.id;
  return order.userId === GUEST_ID && sameEmail(order.email, email);
}

async function markPaid(config, order, patch) {
  const latest = await getDocument('orders', order.$id);
  if (latest?.status === 'pending_payment') {
    await updateDocument('orders', order.$id, { status: 'paid', ...patch, updatedAt: Date.now() });
  } else if (latest?.status !== 'paid') {
    return false;
  }
  await sendOrderConfirmationBestEffort(config, order.$id);
  return true;
}

export function createOrdersRouter(config) {
  const router = Router();

  // Signed-in customer: their own orders.
  router.get('/', requireUser, async (req, res, next) => {
    try {
      const rows = await listDocuments('orders', [
        Query.equal('userId', req.user.id),
        Query.orderDesc('createdAt'),
        Query.limit(50),
      ]);
      return res.json({ orders: rows.map(publicOrder) });
    } catch (error) {
      next(error);
    }
  });

  // Guest: look an order up with its reference and the e-mail it was placed with.
  router.post('/lookup', async (req, res, next) => {
    try {
      const parsed = z.object({ orderId: orderIdSchema, email: emailSchema }).strict().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Enter your order reference and email address.' });
      if (!(await consumeRateLimit(req.ip, 'order-lookup-ip', 30, HOUR))) {
        return res.status(429).json({ error: 'Too many lookups. Please try again later.' });
      }
      const order = await getDocument('orders', parsed.data.orderId);
      if (!order || !sameEmail(order.email, parsed.data.email)) {
        return res.status(404).json({ error: 'We could not find an order with those details.' });
      }
      return res.json({ order: publicOrder(order) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', requireUser, async (req, res, next) => {
    try {
      if (!orderIdSchema.safeParse(req.params.id).success) return res.status(404).json({ error: 'Order not found.' });
      const order = await getDocument('orders', req.params.id);
      if (!ownsOrder(order, req.user)) return res.status(404).json({ error: 'Order not found.' });
      return res.json({ order: publicOrder(order) });
    } catch (error) {
      next(error);
    }
  });

  // Place an order: signed-in customer, or guest (guestEmail required).
  router.post('/', optionalUser, async (req, res, next) => {
    try {
      if (!config.liveCheckout) {
        return res.status(503).json({ error: 'Checkout is not enabled yet. Please contact the store.' });
      }
      const parsed = requestSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Check your contact details, delivery details and bag.' });
      const input = parsed.data;
      if (input.paymentMethod === 'cod' && !config.codEnabled) {
        return res.status(503).json({ error: 'Cash on delivery is not available right now. Please contact the store.' });
      }
      if (input.paymentMethod === 'cashfree' && !config.cashfreeEnabled) {
        return res.status(503).json({ error: 'Online payments are not available yet. Please try again soon.' });
      }
      if (input.paymentMethod === 'test' && !config.testPayments) {
        return res.status(503).json({ error: 'Test payments are not enabled.' });
      }

      let identity;
      if (req.user) {
        identity = { id: req.user.id, email: req.user.email };
      } else if (input.guestEmail) {
        identity = { id: GUEST_ID, email: input.guestEmail };
      } else {
        return res.status(400).json({ error: 'Enter your email address to check out as a guest.' });
      }

      const [ipAllowed, emailAllowed] = await Promise.all([
        consumeRateLimit(req.ip, 'order-ip', 30, HOUR),
        consumeRateLimit(identity.email, 'order-email', 15, HOUR),
      ]);
      if (!ipAllowed || !emailAllowed) {
        return res.status(429).json({ error: 'Too many order attempts. Please try again later.' });
      }

      // Hobby-plan crons run once a day, so also free expired reservations as customers check out.
      await sweepExpiredReservations();
      const order = await reserveOrder(config, input, identity);
      // Keep the contact (e-mail + phone) in Appwrite for guests and members alike. Best effort:
      // a bookkeeping failure must never undo an order that has already been placed.
      try {
        await recordCustomerOrder({
          email: identity.email,
          name: input.customer.name,
          phone: input.customer.phone,
          altPhone: input.customer.altPhone,
          address: input.customer,
          userId: req.user?.id,
          source: req.user ? 'account' : 'guest',
        });
      } catch (error) {
        console.error('Saving customer contact failed:', error?.message || error);
      }
      if (order.status === 'placed_cod') await sendOrderConfirmationBestEffort(config, order.$id);
      return res.json(orderResponse(order, config));
    } catch (error) {
      if (error?.status) return res.status(error.status).json({ error: error.message });
      next(error);
    }
  });

  // TEST MODE ONLY (PAYMENT_TEST_MODE=true): simulates the outcome of a card payment so the whole
  // cart-to-confirmation flow can be exercised before a real gateway is connected.
  router.post('/:id/test-payment', optionalUser, async (req, res, next) => {
    try {
      if (!config.liveCheckout || !config.testPayments) {
        return res.status(503).json({ error: 'Test payments are not enabled.' });
      }
      const input = z.object({
        outcome: z.enum(['success', 'declined']),
        email: emailSchema.optional(),
      }).strict().safeParse(req.body);
      if (!input.success || !orderIdSchema.safeParse(req.params.id).success) {
        return res.status(400).json({ error: 'The test payment request is invalid.' });
      }
      const order = await getDocument('orders', req.params.id);
      if (!ownsOrder(order, req.user, input.data.email) || order.paymentMethod !== 'test') {
        return res.status(404).json({ error: 'Order not found.' });
      }
      if (!(await consumeRateLimit(order.$id, 'test-payment-order', 20, HOUR))) {
        return res.status(429).json({ error: 'Too many payment attempts. Please try again later.' });
      }
      if (order.status === 'paid') return res.json({ success: true, order: publicOrder(order) });
      if (order.status !== 'pending_payment' || order.reservationExpiresAt <= Date.now()) {
        return res.status(409).json({ error: 'This order is no longer awaiting payment. Please start checkout again.' });
      }
      if (input.data.outcome === 'declined') {
        return res.status(402).json({ error: 'The test card was declined. Your order is still reserved, so you can try again.' });
      }
      if (!(await markPaid(config, order, {}))) {
        return res.status(409).json({ error: 'The order status changed while payment was being processed.' });
      }
      return res.json({ success: true, order: publicOrder(await getDocument('orders', order.$id)) });
    } catch (error) {
      next(error);
    }
  });

  // Called by the browser after Cashfree checkout closes (or when the customer returns to the
  // order page). The browser's word is never trusted: we ask Cashfree for the payment ourselves.
  router.post('/:id/verify-cashfree', optionalUser, async (req, res, next) => {
    try {
      if (!config.liveCheckout || !config.cashfreeEnabled) {
        return res.status(503).json({ error: 'Payment verification is not configured.' });
      }
      const input = z.object({ email: emailSchema.optional() }).strict().safeParse(req.body ?? {});
      if (!input.success || !orderIdSchema.safeParse(req.params.id).success) {
        return res.status(400).json({ error: 'The payment verification request is invalid.' });
      }
      const order = await getDocument('orders', req.params.id);
      if (!ownsOrder(order, req.user, input.data.email) || order.paymentMethod !== 'cashfree') {
        return res.status(404).json({ error: 'Order not found.' });
      }
      if (!(await consumeRateLimit(order.$id, 'cashfree-verify-order', 60, HOUR))) {
        return res.status(429).json({ error: 'Too many verification attempts. Please try again later.' });
      }
      if (order.status === 'paid') return res.json({ success: true, order: publicOrder(order) });
      if (order.status !== 'pending_payment') {
        return res.status(409).json({ error: 'This order is no longer awaiting payment.', order: publicOrder(order) });
      }
      const payment = await findSuccessfulPayment(config, order);
      if (!payment) {
        // Not an error: the customer may still be mid-payment, or the payment may have failed.
        return res.status(202).json({ success: false, pending: true, order: publicOrder(order) });
      }
      const channel = channelFor(payment.payment_group);
      await markPaid(config, order, {
        cashfreePaymentId: String(payment.cf_payment_id).slice(0, 100),
        ...(channel && { paymentChannel: channel }),
      });
      return res.json({ success: true, order: publicOrder(await getDocument('orders', order.$id)) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
