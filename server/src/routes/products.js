import { Router } from 'express';
import { z } from 'zod';
import { PRODUCT_CATEGORIES } from '../catalog.js';
import { createDocument, getDocument, ID, listDocuments, Query, runTransaction, updateDocument } from '../platform/appwrite.js';
import { actorOf } from '../admin/common.js';
import { recordInventoryMovement, recordPriceChange } from '../admin/ledger.js';
import { TtlCache } from '../cache.js';
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

export function serializeProduct(product, config) {
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

/**
 * The public catalogue is read by every visitor but changes only when an admin edits it, so it is
 * served from memory for a minute, and the CDN may keep it for a minute too (and serve a stale copy
 * for five more while it refreshes in the background). Admin writes clear the memory copy at once.
 */
const catalogueCache = new TtlCache({ ttlMs: 60 * 1000, maxEntries: 50 });
export const clearCatalogueCache = () => catalogueCache.clear();
const PUBLIC_CACHE_CONTROL = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

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
      const products = await catalogueCache.getOrLoad(`${category || 'all'}:${limit}`, async () => {
        const queries = [Query.equal('active', true), Query.limit(limit)];
        if (category) queries.push(Query.equal('category', category));
        const rows = await listDocuments('products', queries);
        return rows.map((row) => serializeProduct(row, config));
      });
      res.set('Cache-Control', PUBLIC_CACHE_CONTROL);
      return res.json({ products });
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
      const actor = actorOf(req);
      // The product and its first price / stock audit rows commit together or not at all.
      const created = await runTransaction(async (transactionId) => {
        const id = ID.unique();
        await createDocument('products', id, product, transactionId);
        await recordPriceChange({
          productId: id, sku: product.sku, productName: product.name, newPriceInPaise: product.priceInPaise, actor, reason: 'Product created', now,
        }, transactionId);
        if (product.stockQuantity > 0) {
          await recordInventoryMovement({
            productId: id, sku: product.sku, productName: product.name, type: 'initial_stock', delta: product.stockQuantity,
            quantityBefore: 0, quantityAfter: product.stockQuantity, reason: 'Product created', actor, idKey: 'initial', now,
          }, transactionId);
        }
        return id;
      });
      catalogueCache.clear();
      return res.status(201).json({ product: serializeProduct(await getDocument('products', created), config) });
    } catch (error) {
      if (error?.code === 409) return res.status(409).json({ error: 'That SKU is already in use.' });
      next(error);
    }
  });

  router.patch('/admin/:id', ...admin, async (req, res, next) => {
    try {
      const { priceChangeReason, ...productFields } = req.body ?? {};
      const reasonCheck = z.string().trim().max(200).optional().safeParse(priceChangeReason);
      const parsed = productSchema.partial().strict().safeParse(productFields);
      if (!reasonCheck.success || !parsed.success || Object.keys(parsed.data || {}).length === 0) {
        return res.status(400).json({ error: 'Provide valid product fields to update.' });
      }
      const existing = await getDocument('products', req.params.id);
      if (!existing) return res.status(404).json({ error: 'Product not found.' });
      if (parsed.data.stockQuantity !== undefined && parsed.data.stockQuantity !== existing.stockQuantity) {
        return res.status(400).json({ error: 'Change stock from Inventory so the reason and movement are recorded.' });
      }
      const media = parsed.data.media || parsed.data.images;
      if (media) {
        if (parsed.data.sku && parsed.data.sku !== existing.sku) {
          return res.status(400).json({ error: 'Change the SKU separately from its media.' });
        }
        if (!mediaAreOwned(config, existing.sku, media)) {
          return res.status(400).json({ error: 'Upload product media through the Cloudinary uploader.' });
        }
      }
      const { images, media: _media, stockQuantity: _stock, ...fields } = parsed.data;
      const now = Date.now();
      const priceChanged = fields.priceInPaise !== undefined && fields.priceInPaise !== existing.priceInPaise;
      const data = {
        ...fields,
        ...(media && { imagesJson: JSON.stringify(media) }),
        // Re-activating a product that was soft-deleted also clears the deactivation stamp.
        ...(fields.active === true && existing.deletedAt && { deletedAt: null }),
        updatedAt: now,
      };
      await runTransaction(async (transactionId) => {
        await updateDocument('products', req.params.id, data, transactionId);
        if (priceChanged) {
          await recordPriceChange({
            productId: existing.$id, sku: fields.sku || existing.sku, productName: fields.name || existing.name,
            previousPriceInPaise: existing.priceInPaise, newPriceInPaise: fields.priceInPaise,
            actor: actorOf(req), reason: reasonCheck.data, now,
          }, transactionId);
        }
      });
      catalogueCache.clear();
      return res.json({ product: serializeProduct(await getDocument('products', req.params.id), config) });
    } catch (error) {
      if (error?.code === 409) return res.status(409).json({ error: 'That SKU is already in use.' });
      next(error);
    }
  });

  router.delete('/admin/:id', ...admin, async (req, res, next) => {
    try {
      const existing = await getDocument('products', req.params.id);
      if (!existing) return res.status(404).json({ error: 'Product not found.' });
      catalogueCache.clear();
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
