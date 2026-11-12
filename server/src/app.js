import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createAuthRouter } from './routes/auth.js';
import { createProductsRouter } from './routes/products.js';
import { createOrdersRouter } from './routes/orders.js';
import { createAdminRouter } from './routes/admin.js';
import { createUploadsRouter } from './routes/uploads.js';
import { createWebhookRouter } from './routes/webhooks.js';
import { createNewsletterRouter } from './routes/newsletter.js';
import { createCartRouter } from './routes/cart.js';
import { createMaintenanceRouter } from './routes/maintenance.js';
import { checkDatabase } from './platform/appwrite.js';

export function createApp(config) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxyHops);
  app.use(helmet());
  app.use(cors((req, callback) => {
    const origin = req.get('origin');
    // Browsers attach Origin to same-origin POSTs too; a page calling its own host (e.g. the
    // www/apex domain the site is actually served from) is never a cross-site request.
    const sameOrigin = Boolean(origin) && origin === `https://${req.get('host')}`;
    const allowed = !origin || sameOrigin || config.origins.includes(origin);
    callback(
      allowed ? null : Object.assign(new Error('This website origin is not allowed.'), { status: 403 }),
      {
        origin: allowed,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      },
    );
  }));
  app.use(cookieParser());
  app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '1mb' }));
  app.use('/api/webhooks', createWebhookRouter(config));
  app.use(express.json({ limit: '32kb' }));

  // Uptime monitors poll this often: the database check is remembered for 30 s instead of
  // costing a cross-region Appwrite call every time.
  let lastDatabaseCheck = 0;
  app.get('/api/health', async (_req, res) => {
    if (Date.now() - lastDatabaseCheck > 30_000) {
      await checkDatabase();
      lastDatabaseCheck = Date.now();
    }
    res.set('Cache-Control', 'no-store');
    return res.json({ status: 'ok' });
  });
  app.use('/api/auth', createAuthRouter(config));
  app.use('/api/products', createProductsRouter(config));
  app.use('/api/uploads', createUploadsRouter(config));
  app.use('/api/orders', createOrdersRouter(config));
  app.use('/api/cart', createCartRouter(config));
  app.use('/api/newsletter', createNewsletterRouter(config));
  app.use('/api/cron', createMaintenanceRouter(config));
  app.use('/api/admin', createAdminRouter(config));

  app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
  app.use((error, req, res, _next) => {
    if (res.headersSent) return;
    const status = error?.status || (error?.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) {
      // Never log request bodies or headers; the provider's code/type is what makes a 500 diagnosable.
      console.error('API request failed:', `${req.method} ${req.path}`, error?.code ?? '', error?.type ?? '', error?.message || 'Unknown error');
    }
    res.status(status).json({
      error: status === 400
        ? 'Request body is invalid.'
        : status === 403 ? 'This website origin is not allowed.'
        : 'The server could not complete this request.',
    });
  });
  return app;
}
