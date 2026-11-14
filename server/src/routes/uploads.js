import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, requireUser } from '../middleware.js';
import { requireTrustedOrigin } from '../admin/common.js';
import { createUploadSignature } from '../storage/cloudinary/client.js';
import { productFolder, siteFolder, SITE_AREAS } from '../storage/cloudinary/folders.js';

const signSchema = z.union([
  z.object({
    target: z.literal('product'),
    sku: z.string().trim().min(1).max(64),
    resourceType: z.enum(['image', 'video']).default('image'),
  }).strict(),
  z.object({
    target: z.literal('site'),
    area: z.enum(SITE_AREAS),
    resourceType: z.enum(['image', 'video']).default('image'),
  }).strict(),
]);

// Admin-only. Binary data never passes through this API: the browser uploads
// to Cloudinary with these short-lived signed parameters.
export function createUploadsRouter(config) {
  const router = Router();
  router.post('/sign', requireUser, requireAdmin(config), requireTrustedOrigin(config), (req, res, next) => {
    try {
      const parsed = signSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Choose a valid upload target.' });
      const folder = parsed.data.target === 'product'
        ? productFolder(config, parsed.data.sku)
        : siteFolder(config, parsed.data.area);
      return res.json({
        upload: createUploadSignature(config, folder, Date.now(), parsed.data.resourceType),
      });
    } catch (error) {
      if (error?.status) return res.status(error.status).json({ error: 'Image storage is not configured.' });
      if (/Invalid/.test(error?.message)) return res.status(400).json({ error: 'Choose a valid upload target.' });
      next(error);
    }
  });
  return router;
}
