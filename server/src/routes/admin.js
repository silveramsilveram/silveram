import { Router } from 'express';
import { listDocumentsPage, Query } from '../platform/appwrite.js';
import { ADMIN_COLLECTION_KEYS } from '../platform/appwrite-schema.js';
import { requireAdmin, requireUser } from '../middleware.js';
import { consumeRateLimit } from '../security.js';
import { TtlCache } from '../cache.js';
import { mailConfigured } from '../mail/transport.js';
import { clearCatalogueCache } from './products.js';
import { actorOf, IST_OFFSET_MS, requireTrustedOrigin, route, STORE_TIMEZONE } from '../admin/common.js';
import { registerOrderRoutes } from '../admin/orders.js';
import { registerTransactionRoutes } from '../admin/transactions.js';
import { registerInventoryRoutes } from '../admin/inventory.js';
import { registerCustomerRoutes } from '../admin/customers.js';
import { registerProductAdminRoutes } from '../admin/productsAdmin.js';
import { registerAnalyticsRoutes } from '../admin/analytics.js';
import { registerReportRoutes } from '../admin/reports.js';

/** Bumped when the admin API contract changes; the admin app checks it and warns on a mismatch. */
export const ADMIN_API_VERSION = 1;
const HOUR = 60 * 60 * 1000;
const schemaCache = new TtlCache({ ttlMs: 60 * 1000, maxEntries: 1 });

/**
 * Probes (with ordinary document queries, no schema-admin key) that the additive admin schema has
 * been provisioned, so a newer admin app fails with a clear message against an older database.
 */
async function probeSchema() {
  return schemaCache.getOrLoad('schema', async () => {
    const missing = [];
    const probe = async (label, collection, queries) => {
      try {
        await listDocumentsPage(collection, [...queries, Query.limit(1)]);
      } catch (error) {
        if (error?.code === 404 || error?.code === 400) missing.push(label);
        else throw error;
      }
    };
    await Promise.all([
      ...ADMIN_COLLECTION_KEYS.map((key) => probe(key, key, [])),
      probe('orders.shippingStatus', 'orders', [Query.equal('shippingStatus', 'pending')]),
      probe('orders.customerPhone', 'orders', [Query.equal('customerPhone', '0000000000')]),
      probe('orders.search', 'orders', [Query.search('customerName', 'x')]),
      probe('products.search', 'products', [Query.search('name', 'x')]),
    ]);
    return { ready: missing.length === 0, missing };
  });
}

/** Per-admin throttles: reads are generous, writes tighter, money/stock writes tightest. */
function throttle(action, limit) {
  return async (req, res, next) => {
    try {
      if (!(await consumeRateLimit(actorOf(req), action, limit, HOUR))) {
        return res.status(429).json({ error: 'Too many requests. Please slow down and try again later.' });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

const SENSITIVE_WRITE = /\/(cod-collection|cod-remittance|cancel|adjust)$/;

export function createAdminRouter(config) {
  const router = Router();
  // Every route below needs a signed-in session AND membership of the server-side ADMIN_EMAILS list.
  router.use(requireUser, requireAdmin(config), requireTrustedOrigin(config));
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    // Reads are not throttled in the database (that would add an Appwrite call to every page load);
    // they are already limited to allow-listed admins.
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    return throttle(SENSITIVE_WRITE.test(req.path) ? 'admin-money-write' : 'admin-write', SENSITIVE_WRITE.test(req.path) ? 120 : 600)(req, res, next);
  });

  router.get('/me', route(async (req, res) => {
    const schema = await probeSchema();
    return res.json({
      user: { id: req.user.id, email: req.user.email },
      permissions: ['admin'],
      apiVersion: ADMIN_API_VERSION,
      store: { timezone: STORE_TIMEZONE, utcOffsetMinutes: IST_OFFSET_MS / 60000, currency: 'INR', lowStockThreshold: config.lowStockThreshold },
      schema,
    });
  }));

  // Read-only integration readiness. Booleans and enum-like values only: never a secret or a key.
  router.get('/status', route(async (_req, res) => {
    const schema = await probeSchema();
    return res.json({
      store: { timezone: STORE_TIMEZONE, currency: 'INR', lowStockThreshold: config.lowStockThreshold },
      environment: config.isProduction ? 'production' : 'development',
      integrations: {
        appwrite: { configured: true, schemaReady: schema.ready, missing: schema.missing },
        cloudinary: { configured: Boolean(config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret), rootFolder: config.cloudinaryRootFolder },
        email: { configured: mailConfigured(config) },
        cashfree: { enabled: config.cashfreeEnabled, mode: config.cashfreeEnv },
      },
      checkout: { live: config.liveCheckout, cod: config.codEnabled, testPayments: config.testPayments },
      capabilities: {
        // Not built, deliberately: surfaced so the UI can show a clear "not available" state.
        refunds: false,
        settlements: false,
        courierTracking: false,
        partialCodCollection: false,
      },
      adminCount: config.adminEmails.size,
    });
  }));

  registerAnalyticsRoutes(router, config);
  registerOrderRoutes(router, config);
  registerTransactionRoutes(router, config);
  registerInventoryRoutes(router, config, { clearCatalogueCache });
  registerCustomerRoutes(router, config);
  registerProductAdminRoutes(router, config);
  registerReportRoutes(router, config);

  return router;
}
