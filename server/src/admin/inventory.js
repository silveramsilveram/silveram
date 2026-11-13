import { z } from 'zod';
import {
  getDocument, incrementAttribute, listDocumentsPage, Query, runTransaction, updateDocument,
} from '../platform/appwrite.js';
import { listAllDocuments } from '../platform/paging.js';
import { TtlCache } from '../cache.js';
import { invalidateAdminCaches, registerCache } from './caches.js';
import {
  actorOf, cleanSearch, DAY_MS, httpError, idSchema, pageQuerySchema, parse, route, startOfDayIst, ymdSchema,
} from './common.js';
import { recordInventoryMovement } from './ledger.js';

export const MOVEMENT_TYPES = [
  'initial_stock', 'restock', 'manual_adjustment', 'correction', 'order_reservation', 'reservation_release', 'cancellation_restore',
];

const reservedCache = registerCache(new TtlCache({ ttlMs: 30 * 1000, maxEntries: 2 }));

/** Units held by unexpired pending-payment orders. Their stock is already deducted from stockQuantity. */
async function reservedByProduct() {
  return reservedCache.getOrLoad('reserved', async () => {
    const { documents } = await listAllDocuments('orders', [
      Query.equal('status', 'pending_payment'),
      Query.greaterThan('reservationExpiresAt', Date.now()),
    ], { maxDocuments: 1000 });
    const map = {};
    for (const order of documents) {
      try {
        for (const item of JSON.parse(order.itemsJson)) map[item.productId] = (map[item.productId] || 0) + (Number(item.quantity) || 0);
      } catch {
        // an unreadable order contributes nothing to reservations
      }
    }
    return map;
  });
}

function serializeStock(product, reserved, threshold) {
  const stock = product.stockQuantity;
  return {
    id: product.$id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    active: product.active === true,
    stockQuantity: stock,
    reservedQuantity: reserved[product.$id] || 0,
    state: stock <= 0 ? 'out' : stock <= threshold ? 'low' : 'ok',
    updatedAt: product.updatedAt,
  };
}

export function serializeMovement(row) {
  return {
    id: row.$id,
    productId: row.productId,
    sku: row.sku,
    productName: row.productName,
    type: row.type,
    delta: row.delta,
    quantityBefore: row.quantityBefore ?? null,
    quantityAfter: row.quantityAfter ?? null,
    orderId: row.orderId || null,
    reason: row.reason || null,
    actor: row.actor,
    createdAt: row.createdAt,
  };
}

const listSchema = pageQuerySchema.extend({
  state: z.enum(['all', 'low', 'out']).default('all'),
  search: z.string().optional(),
  sort: z.enum(['stockQuantity', 'name', 'updatedAt']).default('stockQuantity'),
  dir: z.enum(['asc', 'desc']).default('asc'),
});

const movementsSchema = pageQuerySchema.extend({
  productId: idSchema.optional(),
  orderId: idSchema.optional(),
  type: z.enum(MOVEMENT_TYPES).optional(),
  from: ymdSchema.optional(),
  to: ymdSchema.optional(),
});

const adjustSchema = z.object({
  requestId: idSchema,
  type: z.enum(['restock', 'manual_adjustment', 'correction']),
  mode: z.enum(['delta', 'set']),
  value: z.number().int().min(-1_000_000).max(2_147_483_647),
  reason: z.string().trim().min(3).max(200),
}).strict();

export function registerInventoryRoutes(router, config, { clearCatalogueCache }) {
  router.get('/inventory', route(async (req, res) => {
    const input = parse(listSchema, req.query, 'Check the inventory filters.');
    const queries = [Query.isNull('deletedAt')];
    if (input.state === 'out') queries.push(Query.lessThanEqual('stockQuantity', 0));
    if (input.state === 'low') {
      queries.push(Query.greaterThan('stockQuantity', 0), Query.lessThanEqual('stockQuantity', config.lowStockThreshold));
    }
    const search = cleanSearch(input.search);
    if (search) queries.push(Query.or([Query.search('name', search), Query.startsWith('sku', search)]));
    const [page, reserved] = await Promise.all([
      listDocumentsPage('products', [
        ...queries,
        input.dir === 'asc' ? Query.orderAsc(input.sort) : Query.orderDesc(input.sort),
        Query.limit(input.limit),
        Query.offset((input.page - 1) * input.limit),
      ]),
      reservedByProduct(),
    ]);
    return res.json({
      data: page.documents.map((product) => serializeStock(product, reserved, config.lowStockThreshold)),
      total: page.total,
      page: input.page,
      limit: input.limit,
      lowStockThreshold: config.lowStockThreshold,
    });
  }));

  router.get('/inventory/summary', route(async (_req, res) => {
    const base = [Query.isNull('deletedAt'), Query.limit(1)];
    const [all, active, out, low] = await Promise.all([
      listDocumentsPage('products', base),
      listDocumentsPage('products', [...base, Query.equal('active', true)]),
      listDocumentsPage('products', [...base, Query.equal('active', true), Query.lessThanEqual('stockQuantity', 0)]),
      listDocumentsPage('products', [...base, Query.equal('active', true), Query.greaterThan('stockQuantity', 0), Query.lessThanEqual('stockQuantity', config.lowStockThreshold)]),
    ]);
    return res.json({
      products: all.total,
      activeProducts: active.total,
      outOfStock: out.total,
      lowStock: low.total,
      lowStockThreshold: config.lowStockThreshold,
    });
  }));

  router.get('/inventory/movements', route(async (req, res) => {
    const input = parse(movementsSchema, req.query, 'Check the movement filters.');
    const queries = [];
    if (input.productId) queries.push(Query.equal('productId', input.productId));
    if (input.orderId) queries.push(Query.equal('orderId', input.orderId));
    if (input.type) queries.push(Query.equal('type', input.type));
    if (input.from) queries.push(Query.greaterThanEqual('createdAt', startOfDayIst(input.from)));
    if (input.to) queries.push(Query.lessThan('createdAt', startOfDayIst(input.to) + DAY_MS));
    const page = await listDocumentsPage('inventoryMovements', [
      ...queries,
      Query.orderDesc('createdAt'),
      Query.limit(input.limit),
      Query.offset((input.page - 1) * input.limit),
    ]);
    return res.json({
      data: page.documents.map(serializeMovement),
      total: page.total,
      page: input.page,
      limit: input.limit,
    });
  }));

  // Every stock edit needs a reason and leaves an immutable movement row. `requestId` makes a
  // double-submitted form harmless: the second attempt hits the same movement id and fails.
  router.post('/inventory/:productId/adjust', route(async (req, res) => {
    parse(idSchema, req.params.productId, 'Product not found.');
    const input = parse(adjustSchema, req.body, 'Choose an adjustment and give a reason.');
    const product = await getDocument('products', req.params.productId);
    if (!product) throw httpError(404, 'Product not found.');
    const before = product.stockQuantity;
    const delta = input.mode === 'set' ? input.value - before : input.value;
    if (input.mode === 'set' && input.value < 0) throw httpError(400, 'Stock cannot be negative.');
    if (delta === 0) throw httpError(400, 'That would not change the stock level.');
    if (input.type === 'restock' && delta < 0) throw httpError(400, 'A restock must add stock.');
    if (before + delta < 0) throw httpError(409, 'That adjustment would make stock negative.');
    if (before + delta > 2_147_483_647) throw httpError(400, 'Stock is above the supported limit.');
    const actor = actorOf(req);
    try {
      await runTransaction(async (transactionId) => {
        await recordInventoryMovement({
          productId: product.$id, sku: product.sku, productName: product.name, type: input.type, delta,
          quantityBefore: before, quantityAfter: before + delta, reason: input.reason, actor, idKey: input.requestId,
        }, transactionId);
        await incrementAttribute('products', product.$id, 'stockQuantity', delta, transactionId, { min: 0 });
        await updateDocument('products', product.$id, { updatedAt: Date.now() }, transactionId);
      });
    } catch (error) {
      if (error?.code === 409) throw httpError(409, 'This adjustment was already submitted, or stock changed. Refresh and check the movement history.');
      if (error?.code === 400) throw httpError(409, 'That adjustment would make stock negative.');
      throw error;
    }
    clearCatalogueCache();
    reservedCache.clear();
    const updated = await getDocument('products', product.$id);
    return res.json({ product: serializeStock(updated, await reservedByProduct(), config.lowStockThreshold) });
  }));
}

/** Tests only. */
export const resetInventoryCaches = invalidateAdminCaches;
