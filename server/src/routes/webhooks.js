import { Router } from 'express';
import { createHash } from 'node:crypto';
import { createDocument, findDocument, getAppwrite, runTransaction, updateDocument } from '../platform/appwrite.js';
import { queueOrderConfirmation } from '../mail/orderConfirmation.js';
import { verifyCashfreeWebhookSignature } from '../payments/cashfree/signatures.js';
import { channelFor, toPaise } from '../payments/cashfree/client.js';
import { bestEffort, paymentLedgerEntry, recordTransaction } from '../admin/ledger.js';
import { invalidateAdminCaches } from '../admin/caches.js';

const providerTime = (value) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
};

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
      // Ledger rows are written after the idempotent order update commits, never inside it, so a
      // missing/unprovisioned ledger can never make Cashfree retry a payment webhook.
      const ledgerEntries = [];
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
              ledgerEntries.push(paymentLedgerEntry(order, {
                provider: 'cashfree', providerPaymentId: cashfreePaymentId, channel, occurredAt: providerTime(payment.payment_time), source: 'webhook',
              }));
            } else if (order.status === 'expired' || (order.status === 'pending_payment' && !amountMatches)) {
              // Money was taken for an order we released (or for the wrong amount): a human must look.
              await update({ status: 'payment_review', cashfreePaymentId });
              ledgerEntries.push({
                ...paymentLedgerEntry(order, {
                  provider: 'cashfree', providerPaymentId: cashfreePaymentId, channel: channelFor(payment.payment_group), occurredAt: providerTime(payment.payment_time), source: 'webhook',
                }),
                amountInPaise: toPaise(payment.payment_amount),
                reconciliation: 'needs_review',
                note: 'Money was taken for an order that had expired or whose amount did not match.',
              });
            }
          } else if (type === 'PAYMENT_FAILED_WEBHOOK' && payment?.cf_payment_id) {
            // A failed attempt is recorded as an attempt, never as a collection.
            ledgerEntries.push({
              eventKey: `cashfree-attempt:${payment.cf_payment_id}:failed`,
              orderId: order.$id, provider: 'cashfree', type: 'payment_attempt', status: 'failed',
              amountInPaise: toPaise(payment.payment_amount), channel: channelFor(payment.payment_group),
              providerOrderId: cfOrderId, providerPaymentId: String(payment.cf_payment_id),
              occurredAt: providerTime(payment.payment_time), source: 'webhook', actor: 'system:cashfree-webhook',
              reconciliation: 'provider_reported', test: false,
            });
          } else if (type === 'REFUND_STATUS_WEBHOOK' && refund?.refund_status === 'SUCCESS' &&
            order.status === 'paid' && toPaise(refund.refund_amount) >= order.amountInPaise) {
            await update({ status: 'refunded' });
          }
          if (type === 'REFUND_STATUS_WEBHOOK' && refund?.refund_status === 'SUCCESS' && refund.cf_refund_id) {
            ledgerEntries.push({
              eventKey: `cashfree-refund:${refund.cf_refund_id}`,
              orderId: order.$id, provider: 'cashfree', type: 'refund', status: 'success',
              amountInPaise: toPaise(refund.refund_amount), providerOrderId: cfOrderId,
              providerRefundId: String(refund.cf_refund_id), occurredAt: providerTime(refund.processed_at),
              source: 'webhook', actor: 'system:cashfree-webhook', reconciliation: 'provider_verified', test: false,
            });
          }
        });
      } catch (error) {
        if (error?.code === 409 && await findDocument('webhookEvents', 'eventId', eventId)) {
          return res.status(200).json({ received: true });
        }
        throw error;
      }
      for (const entry of ledgerEntries) await bestEffort('Recording webhook ledger entry', () => recordTransaction(entry));
      invalidateAdminCaches();
      if (confirmationOrderId) queueOrderConfirmation(config, confirmationOrderId);
      return res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
