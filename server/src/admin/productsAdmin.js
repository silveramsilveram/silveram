import { z } from 'zod';
import { getDocument, listDocumentsPage, Query } from '../platform/appwrite.js';
import { serializeProduct } from '../routes/products.js';
import { PRODUCT_CATEGORIES } from '../catalog.js';
import {
  cleanSearch, DAY_MS, httpError, idSchema, pageQuerySchema, parse, route, startOfDayIst, ymdSchema,
} from './common.js';

const listSchema = pageQuerySchema.extend({
  search: z.string().optional(),
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  active: z.enum(['true', 'false']).optional(),
  stock: z.enum(['in', 'low', 'out']).optional(),
  deleted: z.enum(['exclude', 'only', 'include']).default('exclude'),
  updatedFrom: ymdSchema.optional(),
  updatedTo: ymdSchema.optional(),
  createdFrom: ymdSchema.optional(),
  createdTo: ymdSchema.optional(),
  sort: z.enum(['updatedAt', 'createdAt', 'priceInPaise', 'stockQuantity', 'name']).default('updatedAt'),
  dir: z.enum(['asc', 'desc']).default('desc'),
});

function serializePriceChange(row) {
  return {
    id: row.$id,
    productId: row.productId,
    sku: row.sku,
    productName: row.productName,
    previousPriceInPaise: row.previousPriceInPaise ?? null,
    newPriceInPaise: row.newPriceInPaise,
    currency: row.currency,
    changedAt: row.changedAt,
    changedBy: row.changedBy,
    reason: row.reason || null,
  };
}

function adminProduct(product, config) {
  return { ...serializeProduct(product, config), deleted: Boolean(product.deletedAt), lowStockThreshold: config.lowStockThreshold };
}

export function registerProductAdminRoutes(router, config) {
  router.get('/products', route(async (req, res) => {
    const input = parse(listSchema, req.query, 'Check the product filters.');
    const queries = [];
    if (input.deleted === 'exclude') queries.push(Query.isNull('deletedAt'));
    if (input.deleted === 'only') queries.push(Query.isNotNull('deletedAt'));
    if (input.category) queries.push(Query.equal('category', input.category));
    if (input.active) queries.push(Query.equal('active', input.active === 'true'));
    if (input.stock === 'out') queries.push(Query.lessThanEqual('stockQuantity', 0));
    if (input.stock === 'low') queries.push(Query.greaterThan('stockQuantity', 0), Query.lessThanEqual('stockQuantity', config.lowStockThreshold));
    if (input.stock === 'in') queries.push(Query.greaterThan('stockQuantity', config.lowStockThreshold));
    if (input.updatedFrom) queries.push(Query.greaterThanEqual('updatedAt', startOfDayIst(input.updatedFrom)));
    if (input.updatedTo) queries.push(Query.lessThan('updatedAt', startOfDayIst(input.updatedTo) + DAY_MS));
    if (input.createdFrom) queries.push(Query.greaterThanEqual('createdAt', startOfDayIst(input.createdFrom)));
    if (input.createdTo) queries.push(Query.lessThan('createdAt', startOfDayIst(input.createdTo) + DAY_MS));
    const search = cleanSearch(input.search);
    if (search) queries.push(Query.or([Query.search('name', search), Query.startsWith('sku', search)]));
    const page = await listDocumentsPage('products', [
      ...queries,
      input.dir === 'asc' ? Query.orderAsc(input.sort) : Query.orderDesc(input.sort),
      Query.limit(input.limit),
      Query.offset((input.page - 1) * input.limit),
    ]);
    return res.json({ data: page.documents.map((row) => adminProduct(row, config)), total: page.total, page: input.page, limit: input.limit });
  }));

  router.get('/products/:id', route(async (req, res) => {
    parse(idSchema, req.params.id, 'Product not found.');
    const product = await getDocument('products', req.params.id);
    if (!product) throw httpError(404, 'Product not found.');
    return res.json({ product: adminProduct(product, config) });
  }));

  router.get('/products/:id/price-history', route(async (req, res) => {
    parse(idSchema, req.params.id, 'Product not found.');
    const input = parse(pageQuerySchema, req.query);
    const [page, first] = await Promise.all([
      listDocumentsPage('productPriceHistory', [
        Query.equal('productId', req.params.id),
        Query.orderDesc('changedAt'),
        Query.limit(input.limit),
        Query.offset((input.page - 1) * input.limit),
      ]),
      // The earliest row anywhere tells the UI when tracking began ("History tracking started on …").
      listDocumentsPage('productPriceHistory', [Query.orderAsc('changedAt'), Query.limit(1)]),
    ]);
    return res.json({
      data: page.documents.map(serializePriceChange),
      total: page.total,
      page: input.page,
      limit: input.limit,
      trackingStartedAt: first.documents[0]?.changedAt ?? null,
    });
  }));

  // Store-wide price audit trail (the "Price history" page).
  router.get('/price-history', route(async (req, res) => {
    const input = parse(pageQuerySchema, req.query);
    const [page, first] = await Promise.all([
      listDocumentsPage('productPriceHistory', [
        Query.orderDesc('changedAt'),
        Query.limit(input.limit),
        Query.offset((input.page - 1) * input.limit),
      ]),
      listDocumentsPage('productPriceHistory', [Query.orderAsc('changedAt'), Query.limit(1)]),
    ]);
    return res.json({
      data: page.documents.map(serializePriceChange),
      total: page.total,
      page: input.page,
      limit: input.limit,
      trackingStartedAt: first.documents[0]?.changedAt ?? null,
    });
  }));
}
