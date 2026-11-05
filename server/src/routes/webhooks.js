import { Router } from 'express';
import { createHash } from 'node:crypto';
import { createDocument, findDocument, getAppwrite, runTransaction, updateDocument } from '../platform/appwrite.js';
import { queueOrderConfirmation } from '../mail/orderConfirmation.js';
import { verifyRazorpayWebhookSignature } from '../payments/razorpay/signatures.js';

export function createWebhookRouter(config) {
  const router = Router();
  router.post('/razorpay', async (req, res, next) => {
    try {
      if (!config.razorpayEnabled || !Buffer.isBuffer(req.body) || !verifyRazorpayWebhookSignature(
        req.body,
        req.get('x-razorpay-signature'),
        config.razorpayWebhookSecret,
      )) {
        return res.status(400).json({ error: 'Webhook signature is invalid.' });
      }
      const eventId = req.get('x-razorpay-event-id');
      if (!eventId || eventId.length > 200) {
        return res.status(400).json({ error: 'Webhook event ID is missing.' });
      }
      const event = JSON.parse(req.body.toString('utf8'));
      const payment = event.payload?.payment?.entity;
      const eventDocId = createHash('sha256').update(eventId).digest('hex').slice(0, 36);
      if (await findDocument('webhookEvents', 'eventId', eventId)) return res.status(200).json({ received: true });
      let confirmationOrderId;
      try {
        await runTransaction(async (transactionId) => {
          const { databases, databaseId, collections } = getAppwrite();
          await createDocument('webhookEvents', eventDocId, {
            eventId,
            eventType: String(event.event || 'unknown').slice(0, 100),
            receivedAt: Date.now(),
          }, transactionId);
          if (!payment?.order_id) return;

          const order = await findDocument('orders', 'razorpayOrderId', payment.order_id);
          if (!order) return;
          if (event.event === 'payment.captured') {
            if (
              order.status === 'pending_payment' &&
              order.amountInPaise === payment.amount &&
              order.currency === payment.currency
            ) {
              await databases.updateDocument({
                databaseId,
                collectionId: collections.orders,
                documentId: order.$id,
                data: { status: 'paid', razorpayPaymentId: payment.id, updatedAt: Date.now() },
                transactionId,
              });
              confirmationOrderId = order.$id;
            } else if (order.status === 'expired') {
              await databases.updateDocument({
                databaseId,
                collectionId: collections.orders,
                documentId: order.$id,
                data: { status: 'payment_review', razorpayPaymentId: payment.id, updatedAt: Date.now() },
                transactionId,
              });
            }
          } else if (event.event === 'payment.refunded' && order.status === 'paid') {
            await databases.updateDocument({
              databaseId,
              collectionId: collections.orders,
              documentId: order.$id,
              data: { status: 'refunded', updatedAt: Date.now() },
              transactionId,
            });
          }
        });
      } catch (error) {
        if (error?.code === 409 && await findDocument('webhookEvents', 'eventId', eventId)) {
          return res.status(200).json({ received: true });
        }
        throw error;
      }
      if (confirmationOrderId) queueOrderConfirmation(config, confirmationOrderId);
      return res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
