import { z } from 'zod';
import { createDocument, findDocument, getDocument, listDocumentsPage, Query } from '../platform/appwrite.js';
import { listAllDocuments } from '../platform/paging.js';
import { recordTransaction } from './ledger.js';
import { actorOf, deterministicId, httpError, pageQuerySchema, parse, route } from './common.js';

const pageSchema = pageQuerySchema;
const paise = z.number().int().safe().min(0).max(2_000_000_000);
const refundSchema = z.object({
  orderId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/),
  providerRefundId: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._-]+$/),
  amountInPaise: paise.refine((amount) => amount > 0),
  occurredAt: z.number().int().positive(),
  reason: z.string().trim().min(3).max(300),
  confirmed: z.literal(true),
}).strict();

const settlementSchema = z.object({
  settlementId: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
  settledAt: z.number().int().positive(),
  grossInPaise: paise,
  feesInPaise: paise,
  taxInPaise: paise,
  adjustmentsInPaise: z.number().int().safe().min(-2_000_000_000).max(2_000_000_000).default(0),
  bankReceivedInPaise: paise,
  bankUtr: z.string().trim().min(1).max(100),
  note: z.string().trim().max(300).optional(),
}).strict();

function assertCashfreeEnabled(config) {
  if (!config.cashfreeEnabled) throw httpError(503, 'Cashfree is disabled; reconciliation is unavailable.');
}

function sameRefund(row, order, input) {
  return row?.type === 'refund' &&
    row.status === 'success' &&
    row.provider === 'cashfree' &&
    row.orderId === order.$id &&
    row.providerRefundId === input.providerRefundId &&
    row.amountInPaise === input.amountInPaise;
}

function sameSettlement(row, data) {
  return row?.settledAt === data.settledAt &&
    row.grossInPaise === data.grossInPaise &&
    row.feesInPaise === data.feesInPaise &&
    row.taxInPaise === data.taxInPaise &&
    row.adjustmentsInPaise === data.adjustmentsInPaise &&
    row.netPayoutInPaise === data.netPayoutInPaise &&
    row.bankReceivedInPaise === data.bankReceivedInPaise &&
    row.bankUtr === data.bankUtr &&
    (row.note || '') === (data.note || '');
}

export function registerCashfreeRoutes(router, config) {
  router.post('/cashfree/refunds', route(async (req, res) => {
    assertCashfreeEnabled(config);
    const input = parse(refundSchema, req.body, 'Enter a valid completed Cashfree refund.');
    if (input.occurredAt > Date.now()) throw httpError(400, 'The refund date cannot be in the future.');

    const order = await getDocument('orders', input.orderId);
    if (!order) throw httpError(404, 'Order not found.');
    if (order.paymentMethod !== 'cashfree' || !order.cashfreeOrderId || !order.cashfreePaymentId ||
      !['paid', 'fulfilled', 'refunded', 'payment_review'].includes(order.status)) {
      throw httpError(409, 'Only an order with a recorded Cashfree payment can have a refund recorded.');
    }

    const eventKey = `cashfree-refund:${input.providerRefundId}`;
    const existing = await findDocument('transactions', 'eventKey', eventKey);
    if (existing) {
      if (!sameRefund(existing, order, input)) throw httpError(409, 'That Cashfree refund reference is already used by a different ledger entry.');
      return res.status(200).json({ success: true, duplicate: true });
    }

    const refunds = await listAllDocuments('transactions', [
      Query.equal('orderId', order.$id),
      Query.equal('type', 'refund'),
      Query.equal('status', 'success'),
      Query.equal('test', false),
    ], { maxDocuments: 1000 });
    if (refunds.truncated) throw httpError(503, 'The refund history is too large to validate safely. Review it before recording another refund.');
    const recordedInPaise = refunds.documents.reduce((sum, row) => sum + row.amountInPaise, 0);
    if (input.amountInPaise > order.amountInPaise - recordedInPaise) {
      throw httpError(409, "The refund amount exceeds the order's remaining recorded balance.");
    }

    const result = await recordTransaction({
      eventKey,
      orderId: order.$id,
      provider: 'cashfree',
      type: 'refund',
      status: 'success',
      amountInPaise: input.amountInPaise,
      providerOrderId: order.cashfreeOrderId,
      providerRefundId: input.providerRefundId,
      occurredAt: input.occurredAt,
      source: 'manual',
      actor: actorOf(req),
      reconciliation: 'operator_recorded',
      reference: input.providerRefundId,
      note: input.reason,
      test: false,
    });
    if (!result.created) {
      const raced = await findDocument('transactions', 'eventKey', eventKey);
      if (!sameRefund(raced, order, input)) throw httpError(409, 'That Cashfree refund reference is already used by a different ledger entry.');
      return res.status(200).json({ success: true, duplicate: true });
    }
    return res.status(201).json({ success: true, duplicate: false });
  }));

  router.get('/cashfree/settlements', route(async (req, res) => {
    assertCashfreeEnabled(config);
    const input = parse(pageSchema, req.query, 'Check the settlement filters.');
    const page = await listDocumentsPage('cashfreeSettlements', [
      Query.orderDesc('settledAt'),
      Query.limit(input.limit),
      Query.offset((input.page - 1) * input.limit),
    ]);
    return res.json({
      data: page.documents.map((row) => ({ ...row, id: row.$id, note: row.note || null })),
      total: page.total,
      page: input.page,
      limit: input.limit,
    });
  }));

  router.post('/cashfree/settlements', route(async (req, res) => {
    assertCashfreeEnabled(config);
    const input = parse(settlementSchema, req.body, 'Enter a valid Cashfree settlement summary.');
    if (input.settledAt > Date.now()) throw httpError(400, 'The settlement date cannot be in the future.');
    const netPayoutInPaise = input.grossInPaise - input.feesInPaise - input.taxInPaise + input.adjustmentsInPaise;
    if (netPayoutInPaise < 0) throw httpError(400, 'Fees, tax and adjustments cannot exceed the gross settlement amount.');
    const data = {
      settlementId: input.settlementId,
      settledAt: input.settledAt,
      grossInPaise: input.grossInPaise,
      feesInPaise: input.feesInPaise,
      taxInPaise: input.taxInPaise,
      adjustmentsInPaise: input.adjustmentsInPaise,
      netPayoutInPaise,
      bankReceivedInPaise: input.bankReceivedInPaise,
      differenceInPaise: input.bankReceivedInPaise - netPayoutInPaise,
      bankUtr: input.bankUtr,
      ...(input.note && { note: input.note }),
      recordedBy: actorOf(req),
      recordedAt: Date.now(),
    };
    const id = deterministicId('cashfree-settlement', input.settlementId);
    try {
      await createDocument('cashfreeSettlements', id, data);
      return res.status(201).json({ success: true, duplicate: false, settlement: { id, ...data } });
    } catch (error) {
      if (error?.code !== 409) throw error;
      const existing = await getDocument('cashfreeSettlements', id);
      if (!existing || !sameSettlement(existing, data)) {
        throw httpError(409, 'That Cashfree settlement ID already exists with different details.');
      }
      return res.status(200).json({ success: true, duplicate: true, settlement: { id, ...existing } });
    }
  }));
}
