// Usage: node --env-file=.env src/scripts/upload-catalog-images.js <imagesDir> [--no-db]
// Uploads launch catalogue photographs (WebP, PNG, or JPEG) to this environment's
// Cloudinary product folders, using
// the fixed public id <root>/<env>/products/<sku>/<file name without extension>.
// Re-running overwrites the same ids, so it is idempotent. Unless --no-db is passed it
// then stores the Cloudinary REFERENCES (never image data) on the three product records.
// It does not touch price, stock or the active flag.
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from '../config.js';
import { configureAppwrite, findDocument, updateDocument } from '../platform/appwrite.js';
import { assertCloudinary, signParams } from '../storage/cloudinary/client.js';
import { productFolder } from '../storage/cloudinary/folders.js';

const CATALOG = [
  { id: 'product-1', sku: 'SV-001', prefix: 'silver-frame', count: 6 },
  { id: 'product-2', sku: 'SV-002', prefix: 'silver-kada', count: 1 },
  { id: 'product-3', sku: 'SV-003', prefix: 'peacock-ring', count: 2 },
];
const ALT = {
  'silver-frame': 'Silver Frame with Lakshmi and Ganesha devotional relief',
  'silver-kada': 'Silver Kada with patterned bangle design',
  'peacock-ring': 'Peacock-inspired statement ring with colourful detailing',
};

const [dir, ...flags] = process.argv.slice(2);
if (!dir) throw new Error('Usage: upload-catalog-images.js <imagesDir> [--no-db]');
const writeDb = !flags.includes('--no-db');

const config = loadConfig();
configureAppwrite(config);
assertCloudinary(config);

async function upload(file, publicId) {
  const params = { public_id: publicId, overwrite: 'true', timestamp: Math.floor(Date.now() / 1000) };
  const contentType = {
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  }[path.extname(file).toLowerCase()];
  if (!contentType) throw new Error(`Unsupported image format: ${file}`);
  const form = new FormData();
  form.set('file', new Blob([await readFile(file)], { type: contentType }), path.basename(file));
  form.set('api_key', config.cloudinaryApiKey);
  form.set('signature', signParams(params, config.cloudinaryApiSecret));
  for (const [key, value] of Object.entries(params)) form.set(key, String(value));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudinaryCloudName}/image/upload`, { method: 'POST', body: form });
  const result = await response.json();
  if (!response.ok) throw new Error(`Upload failed for ${file}: ${result?.error?.message}`);
  return result;
}

async function findImage(directory, name) {
  for (const extension of ['.webp', '.png', '.jpg', '.jpeg']) {
    const file = path.join(directory, `${name}${extension}`);
    try {
      await access(file);
      return file;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  throw new Error(`No WebP, PNG, or JPEG image found for ${name} in ${directory}.`);
}

const byProduct = new Map();
for (const product of CATALOG) {
  const images = [];
  for (let n = 1; n <= product.count; n += 1) {
    const name = `${product.prefix}-${String(n).padStart(2, '0')}`;
    const file = await findImage(dir, name);
    const result = await upload(file, `${productFolder(config, product.sku)}/${name}`);
    images.push({ publicId: result.public_id, width: result.width, height: result.height, alt: ALT[product.prefix] });
    console.error(`uploaded ${name} -> ${result.public_id}`);
  }
  byProduct.set(product.id, images);
}
console.error(`Cloudinary cloud name (public, for VITE_CLOUDINARY_CLOUD_NAME): ${config.cloudinaryCloudName}`);

if (writeDb) {
  for (const product of CATALOG) {
    const record = await findDocument('products', 'sku', product.sku);
    if (!record) {
      console.error(`${product.sku}: NOT FOUND (run seed:catalog first)`);
      continue;
    }
    await updateDocument('products', record.$id, {
      imagesJson: JSON.stringify(byProduct.get(product.id)),
      updatedAt: Date.now(),
    });
    console.error(`${product.sku}: image references saved in Appwrite`);
  }
}
