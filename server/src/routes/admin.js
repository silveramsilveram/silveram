import { Router } from 'express';
import { z } from 'zod';
import { getAppwrite, getDocument, listDocuments, Query, runTransaction, updateDocument } from '../platform/appwrite.js';
import { requireAdmin, requireUser } from '../middleware.js';

const orderStatuses = new Set(['fulfilled']);

function orderData(order) {
  try {
    const { itemsJson, shippingJson, ...fields } = order;
    return {
      ...fields,
      items: JSON.parse(itemsJson),
      shipping: JSON.parse(shippingJson),
      id: order.$id,
    };
  } catch (error) {
    throw new Error(`Order ${order.$id} contains invalid data: ${error.message}`);
  }
}

export function createAdminRouter(config) {
  const router = Router();
  router.use(requireUser, requireAdmin(config));

  router.get('/orders', async (req, res, next) => {
    try {
      const limit = Math.min(Number.parseInt(req.query.limit, 10) || 50, 100);
      const rows = await listDocuments('orders', [Query.orderDesc('createdAt'), Query.limit(limit)]);
      return res.json({ orders: rows.map(orderData) });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/orders/:id/status', async (req, res, next) => {
    try {
      const parsed = z.object({ status: z.string() }).strict().safeParse(req.body);
      if (!parsed.success || !orderStatuses.has(parsed.data.status)) {
        return res.status(400).json({ error: 'Choose a supported order status.' });
      }
      const existing = await getDocument('orders', req.params.id);
      if (!existing) return res.status(404).json({ error: 'Order not found.' });
      if (!['placed_cod', 'paid'].includes(existing.status)) {
        return res.status(409).json({ error: 'Only placed or paid orders can be marked fulfilled.' });
      }
      const updated = await updateDocument('orders', req.params.id, {
        status: parsed.data.status,
        updatedAt: Date.now(),
      });
      return res.json({ order: orderData(updated) });
    } catch (error) {
      if (error?.code === 409) return res.status(409).json({ error: 'The order status changed. Refresh and try again.' });
      next(error);
    }
  });

  router.post('/orders/:id/cancel', async (req, res, next) => {
    try {
      const cancelled = await runTransaction(async (transactionId) => {
        const { databases, databaseId, collections } = getAppwrite();
        const order = await getDocument('orders', req.params.id);
        if (!order || order.status !== 'placed_cod') return order || null;
        const { items } = orderData(order);
        for (const item of items) {
          const product = await getDocument('products', item.productId);
          if (!product) throw new Error(`Cannot restore stock: product ${item.productId} is missing.`);
          await databases.updateDocument({
            databaseId,
            collectionId: collections.products,
            documentId: product.$id,
            data: { stockQuantity: product.stockQuantity + item.quantity, updatedAt: Date.now() },
            transactionId,
          });
        }
        await updateDocument('orders', order.$id, {
          status: 'cancelled',
          cancellationRecordedAt: Date.now(),
          updatedAt: Date.now(),
        }, transactionId);
        return order;
      });
      if (!cancelled) return res.status(404).json({ error: 'Order not found.' });
      if (cancelled.status !== 'placed_cod') {
        return res.status(409).json({ error: 'Only unfulfilled cash-on-delivery orders can be cancelled this way.' });
      }
      return res.json({ success: true, orderId: cancelled.$id });
    } catch (error) {
      if (error?.code === 409) return res.status(409).json({ error: 'The order changed while cancellation was being processed. Refresh and try again.' });
      next(error);
    }
  });

  return router;
}
