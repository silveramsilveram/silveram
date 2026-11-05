import { Router } from 'express';
import { z } from 'zod';
import { createDocument, getAppwrite, getDocument, listDocuments, Query, runTransaction, updateDocument } from '../platform/appwrite.js';
import { optionalUser, requireUser } from '../middleware.js';
import { sendOrderConfirmationBestEffort } from '../mail/orderConfirmation.js';
import { consumeRateLimit } from '../security.js';
import {
  createRazorpayOrder,
  verifyCapturedPayment,
  verifyRazorpayCheckoutSignature,
} from '../payments/razorpay/client.js';

const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase());
const orderIdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/);
const GUEST_ID = 'guest';
const HOUR = 60 * 60 * 1000;

const requestSchema = z.object({
  requestId: orderIdSchema,
  paymentMethod: z.enum(['razorpay', 'cod', 'test']),
  // Required only when nobody is signed in (guest checkout).
  guestEmail: emailSchema.optional(),
  customer: z.object({
    name: z.string().trim().min(1).max(100),
    phone: z.string().regex(/^\d{10}$/),
    address: z.string().trim().min(1).max(300),
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

function orderResponse(order, keyId) {
  return {
    order: publicOrder(order),
    orderId: order.$id,
    amountInPaise: order.amountInPaise,
    currency: 'INR',
    paymentMethod: order.paymentMethod,
    status: order.status,
    ...(order.razorpayOrderId && { razorpayOrderId: order.razorpayOrderId, razorpayKeyId: keyId }),
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
    if (existing.paymentMethod === 'cod' || existing.paymentMethod === 'test' || existing.razorpayOrderId) return existing;
  }

  if (!order) {
    try {
      order = await runTransaction(async (transactionId) => {
        const { databases, databaseId, collections } = getAppwrite();
        const lines = [];
        let total = 0;
        for (const [id, quantity] of requested) {
          const product = await getDocument('products', id);
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
          await databases.updateDocument({
            databaseId,
            collectionId: collections.products,
            documentId: product.$id,
            data: { stockQuantity: product.stockQuantity - quantity, updatedAt: Date.now() },
            transactionId,
          });
        }
        if (!Number.isSafeInteger(total) || total > 2147483647) {
          throw Object.assign(new Error('The order total is above the supported checkout limit.'), { status: 400 });
        }
        const now = Date.now();
        const data = {
          userId: identity.id,
          email: identity.email,
          status: input.paymentMethod === 'cod' ? 'placed_cod' : 'pending_payment',
          paymentMethod: input.paymentMethod,
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
  if (order.razorpayOrderId) return order;
  const razorpayOrder = await createRazorpayOrder(config, {
    ...orderData(order),
    _id: order.$id,
  }, { id: identity.id });
  order = await updateDocument('orders', order.$id, {
    razorpayOrderId: razorpayOrder.id,
    updatedAt: Date.now(),
  });
  return order;
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

export function createOrdersRouter(config) {
  const router = Router();
  router.use(requireUser);

  router.get('/', async (req, res, next) => {
    try {
      const rows = await listDocuments('orders', [
        Query.equal('userId', req.user.id),
        Query.orderDesc('createdAt'),
        Query.limit(50),
      ]);
      return res.json({
        orders: rows.map((order) => {
          const { shipping, email, userId, items, ...fields } = orderData(order);
          return { ...fields, items, id: order.$id };
        }),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      if (!config.liveCheckout) {
        return res.status(503).json({ error: 'Checkout is not enabled yet. Please contact the store.' });
      }
      const parsed = requestSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Check your delivery details and bag.' });
      if (parsed.data.paymentMethod === 'razorpay' && !config.razorpayEnabled) {
        return res.status(503).json({ error: 'Online payments are not enabled. Please choose cash on delivery.' });
      }
      const order = await reserveOrder(config, parsed.data, req.user);
      if (order.status === 'placed_cod') queueOrderConfirmation(config, order.$id);
      return res.json(orderResponse(order, config.razorpayKeyId));
    } catch (error) {
      if (error?.status) return res.status(error.status).json({ error: error.message });
      next(error);
    }
  });

  router.post('/:id/verify', async (req, res, next) => {
    try {
      if (!config.liveCheckout || !config.razorpayEnabled) {
        return res.status(503).json({ error: 'Payment verification is not configured.' });
      }
      const input = z.object({
        razorpay_payment_id: z.string().min(1).max(100),
        razorpay_order_id: z.string().min(1).max(100),
        razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
      }).strict().safeParse(req.body);
      if (!input.success) return res.status(400).json({ error: 'The payment response is invalid.' });

      const { razorpay_payment_id: paymentId, razorpay_order_id: razorpayOrderId, razorpay_signature: signature } = input.data;
      const order = await getDocument('orders', req.params.id);
      if (!order || order.userId !== req.user.id || order.paymentMethod !== 'razorpay' || order.razorpayOrderId !== razorpayOrderId) {
        return res.status(403).json({ error: 'This payment does not match your order.' });
      }
      if (order.status === 'paid' && order.razorpayPaymentId === paymentId) {
        queueOrderConfirmation(config, order.$id);
        return res.json({ success: true, orderId: order.$id });
      }
      if (order.status !== 'pending_payment') {
        return res.status(409).json({ error: 'This order is no longer awaiting payment.' });
      }
      if (!verifyRazorpayCheckoutSignature(razorpayOrderId, paymentId, signature, config.razorpayKeySecret)) {
        return res.status(400).json({ error: 'Payment verification failed.' });
      }
      if (!(await verifyCapturedPayment(config, { ...order, _id: order.$id }, paymentId))) {
        return res.status(409).json({ error: 'The payment has not been captured. Please contact the store if your account was charged.' });
      }
      const latest = await getDocument('orders', order.$id);
      if (latest?.status === 'pending_payment' && latest.razorpayOrderId === razorpayOrderId) {
        await updateDocument('orders', order.$id, {
          status: 'paid',
          razorpayPaymentId: paymentId,
          updatedAt: Date.now(),
        });
      } else if (latest?.status !== 'paid' || latest.razorpayPaymentId !== paymentId) {
        return res.status(409).json({ error: 'The order status changed while payment was being verified.' });
      }
      queueOrderConfirmation(config, order.$id);
      return res.json({ success: true, orderId: order.$id });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
