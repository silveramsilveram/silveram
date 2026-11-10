import { Router } from 'express';
import { createHash } from 'node:crypto';
import { createDocument, findDocument, getAppwrite, runTransaction, updateDocument } from '../platform/appwrite.js';
import { queueOrderConfirmation } from '../mail/orderConfirmation.js';
import { verifyCashfreeWebhookSignature } from '../payments/cashfree/signatures.js';
import { channelFor, toPaise } from '../payments/cashfree/client.js';

export function createWebhookRouter(config) {
  const router = Router();
  router.post('/cashfree', async (req, res, next) => {
    try {
      if (!config.cashfreeEnabled || !Buffer.isBuffer(req.body) || !verifyCashfreeWebhookSignature(
        req.body,
        req.get('x-webhook-signature'),
        req.get('x-webhook-timestamp'),
        config.cashfreeSecretKey,
      )) {
        return res.status(400).json({ error: 'Webhook signature is invalid.' });
      }
      const event = JSON.parse(req.body.toString('utf8'));
      const type = String(event.type || 'unknown').slice(0, 100);
      const cfOrderId = event.data?.order?.order_id;
      const payment = event.data?.payment;
      const refund = event.data?.refund;
      // Cashfree has no event id header, so identify an event by what it says happened.
      const eventId = createHash('sha256').update(JSON.stringify([
        type, cfOrderId, payment?.cf_payment_id, payment?.payment_status, refund?.cf_refund_id, refund?.refund_status,
      ])).digest('hex');
      const eventDocId = eventId.slice(0, 36);
      if (await findDocument('webhookEvents', 'eventId', eventId)) return res.status(200).json({ received: true });
      let confirmationOrderId;
      try {
        await runTransaction(async (transactionId) => {
          const { databases, databaseId, collections } = getAppwrite();
          await createDocument('webhookEvents', eventDocId, { eventId, eventType: type, receivedAt: Date.now() }, transactionId);
          if (typeof cfOrderId !== 'string') return;
          const order = await findDocument('orders', 'cashfreeOrderId', cfOrderId);
          if (!order) return;
          const update = (data) => databases.updateDocument({
            databaseId,
            collectionId: collections.orders,
            documentId: order.$id,
            data: { ...data, updatedAt: Date.now() },
            transactionId,
          });
          if (type === 'PAYMENT_SUCCESS_WEBHOOK' && payment?.payment_status === 'SUCCESS') {
            const amountMatches = toPaise(payment.payment_amount) === order.amountInPaise && payment.payment_currency === 'INR';
            const cashfreePaymentId = String(payment.cf_payment_id).slice(0, 100);
            if (order.status === 'pending_payment' && amountMatches) {
              const channel = channelFor(payment.payment_group);
              await update({ status: 'paid', cashfreePaymentId, ...(channel && { paymentChannel: channel }) });
              confirmationOrderId = order.$id;
            } else if (order.status === 'expired' || (order.status === 'pending_payment' && !amountMatches)) {
              // Money was taken for an order we released (or for the wrong amount): a human must look.
              await update({ status: 'payment_review', cashfreePaymentId });
            }
          } else if (type === 'REFUND_STATUS_WEBHOOK' && refund?.refund_status === 'SUCCESS' &&
            order.status === 'paid' && toPaise(refund.refund_amount) >= order.amountInPaise) {
            await update({ status: 'refunded' });
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
