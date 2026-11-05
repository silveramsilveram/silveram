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
import { createMaintenanceRouter } from './routes/maintenance.js';
import { checkDatabase } from './platform/appwrite.js';

export function createApp(config) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxyHops);
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.origins.includes(origin)) return callback(null, true);
      return callback(new Error('This website origin is not allowed.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Razorpay-Signature', 'X-Razorpay-Event-Id'],
  }));
  app.use(cookieParser());
  app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '1mb' }));
  app.use('/api/webhooks', createWebhookRouter(config));
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', async (_req, res) => {
    await checkDatabase();
    return res.json({ status: 'ok' });
  });
  app.use('/api/auth', createAuthRouter(config));
  app.use('/api/products', createProductsRouter(config));
  app.use('/api/uploads', createUploadsRouter(config));
  app.use('/api/orders', createOrdersRouter(config));
  app.use('/api/newsletter', createNewsletterRouter(config));
  app.use('/api/cron', createMaintenanceRouter(config));
  app.use('/api/admin', createAdminRouter(config));

  app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
  app.use((error, _req, res, _next) => {
    if (res.headersSent) return;
    const status = error?.status || (error?.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error('API request failed:', error?.message || 'Unknown error');
    res.status(status).json({
      error: status === 400 ? 'Request body is invalid.' : 'The server could not complete this request.',
    });
  });
  return app;
}
