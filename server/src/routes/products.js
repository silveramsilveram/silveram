import { Router } from 'express';
import { z } from 'zod';
import { PRODUCT_CATEGORIES } from '../catalog.js';
import { createDocument, getDocument, ID, listDocuments, Query, updateDocument } from '../platform/appwrite.js';
import { requireAdmin, requireUser } from '../middleware.js';
import { cloudinaryEnabled, mediaUrl as cloudinaryUrl } from '../storage/cloudinary/client.js';
import { isProductPublicId } from '../storage/cloudinary/folders.js';

function createProductSchema(config) {
  const imageUrl = z.string().trim().min(1).max(500).refine((value) => {
    if (value.startsWith('/images/')) {
      return value.slice('/images/'.length).split('/').every((segment) =>
        /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/.test(segment),
      );
    }
    try {
      const url = new URL(value);
      return url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        config.productImageHosts.has(url.hostname.toLowerCase());
    } catch {
      return false;
    }
  });

  const mediaSchema = z.object({
    publicId: z.string().trim().min(1).max(255),
    resourceType: z.enum(['image', 'video']).default('image'),
    width: z.number().int().positive().max(20000),
    height: z.number().int().positive().max(20000),
    duration: z.number().positive().max(86400).optional(),
    format: z.string().trim().toLowerCase().regex(/^[a-z0-9]{1,10}$/).optional(),
    alt: z.string().trim().max(200).default(''),
  }).strict();

  return z.object({
    sku: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(4000),
    category: z.enum(PRODUCT_CATEGORIES),
    priceInPaise: z.number().int().positive().max(2147483647),
    currency: z.literal('INR').default('INR'),
    stockQuantity: z.number().int().min(0).max(2147483647),
    imageUrl: imageUrl.optional(),
    images: z.array(mediaSchema.omit({ resourceType: true, duration: true, format: true })).max(10).optional(),
    media: z.array(mediaSchema).max(10).optional(),
    active: z.boolean().default(false),
  }).strict().refine((value) => !(value.images && value.media), {
    message: 'Send either images or media, not both.',
  }).refine((value) => !value.media || value.media.every((item) =>
    item.resourceType !== 'video' || item.duration !== undefined,
  ), {
    message: 'Video metadata must include its duration.',
  });
}

function serializeProduct(product, config) {
  const { $id, imagesJson, ...fields } = product;
  let media = [];
  try {
    media = JSON.parse(imagesJson || '[]');
  } catch (error) {
    console.error(`Invalid image metadata for product ${$id}:`, error?.message || error);
  }
  media = media.map((asset) => ({
    ...asset,
    resourceType: asset.resourceType || 'image',
    url: cloudinaryUrl(config, asset.publicId, { resourceType: asset.resourceType || 'image' }),
  }));
  const images = media.filter((asset) => asset.resourceType === 'image');
  return {
    ...fields,
    id: $id,
    media,
    images,
    imageUrl: images[0]?.url || product.imageUrl,
  };
}

function mediaAreOwned(config, sku, media) {
  if (!media || media.length === 0) return true;
  return cloudinaryEnabled(config) && media.every((asset) => isProductPublicId(config, sku, asset.publicId));
}

export function createProductsRouter(config) {
  const router = Router();
  const productSchema = createProductSchema(config);

  router.get('/', async (req, res, next) => {
    try {
      const category = req.query.category;
      if (category && !PRODUCT_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'Choose a valid product category.' });
      }
      const limit = Math.min(Number.parseInt(req.query.limit, 10) || 24, 100);
      const queries = [Query.equal('active', true), Query.limit(limit)];
      if (category) queries.push(Query.equal('category', category));
      const rows = await listDocuments('products', queries);
      return res.json({ products: rows.map((row) => serializeProduct(row, config)) });
    } catch (error) {
      next(error);
    }
  });

  const admin = [requireUser, requireAdmin(config)];
  router.get('/admin', ...admin, async (_req, res, next) => {
    try {
      const rows = await listDocuments('products', [Query.limit(500)]);
      return res.json({ products: rows.map((row) => serializeProduct(row, config)) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/admin', ...admin, async (req, res, next) => {
    try {
      const parsed = productSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Check the product fields and try again.' });
      const media = parsed.data.media || parsed.data.images || [];
      if (!mediaAreOwned(config, parsed.data.sku, media)) {
        return res.status(400).json({ error: 'Upload product media through the Cloudinary uploader.' });
      }
      const now = Date.now();
      const { images, media: _media, ...fields } = parsed.data;
      const product = { ...fields, imagesJson: JSON.stringify(media), createdAt: now, updatedAt: now };
      const created = await createDocument('products', ID.unique(), product);
      return res.status(201).json({ product: serializeProduct(created, config) });
    } catch (error) {
      if (error?.code === 409) return res.status(409).json({ error: 'That SKU is already in use.' });
      next(error);
    }
  });

  router.patch('/admin/:id', ...admin, async (req, res, next) => {
    try {
      const parsed = productSchema.partial().strict().safeParse(req.body);
      if (!parsed.success || Object.keys(parsed.data || {}).length === 0) {
        return res.status(400).json({ error: 'Provide valid product fields to update.' });
      }
      const existing = await getDocument('products', req.params.id);
      if (!existing) return res.status(404).json({ error: 'Product not found.' });
      const media = parsed.data.media || parsed.data.images;
      if (media) {
        if (parsed.data.sku && parsed.data.sku !== existing.sku) {
          return res.status(400).json({ error: 'Change the SKU separately from its media.' });
        }
        if (!mediaAreOwned(config, existing.sku, media)) {
          return res.status(400).json({ error: 'Upload product media through the Cloudinary uploader.' });
        }
      }
      const { images, media: _media, ...fields } = parsed.data;
      const updated = await updateDocument('products', req.params.id, {
        ...fields,
        ...(media && { imagesJson: JSON.stringify(media) }),
        updatedAt: Date.now(),
      });
      return res.json({ product: serializeProduct(updated, config) });
    } catch (error) {
      if (error?.code === 409) return res.status(409).json({ error: 'That SKU is already in use.' });
      next(error);
    }
  });

  router.delete('/admin/:id', ...admin, async (req, res, next) => {
    try {
      const existing = await getDocument('products', req.params.id);
      if (!existing) return res.status(404).json({ error: 'Product not found.' });
      await updateDocument('products', req.params.id, {
        active: false,
        deletedAt: Date.now(),
        updatedAt: Date.now(),
      });
      return res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
