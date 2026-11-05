// Usage: node --env-file=.env src/scripts/upload-catalog-images.js <imagesDir> [--environment=production] [--no-appwrite]
// Uploads launch catalogue images and optional product videos to Cloudinary in the selected environment's
// Cloudinary product folders, using
// the fixed public id <root>/<env>/products/<sku>/<file name without extension>.
// Re-running overwrites the same ids, so it is idempotent. Unless --no-appwrite is passed it
// then stores Cloudinary references (never media binaries) in Appwrite.
// It does not touch price, stock or the active flag.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from '../config.js';
import { configureAppwrite, findDocument, updateDocument } from '../platform/appwrite.js';
import { assertCloudinary, signParams } from '../storage/cloudinary/client.js';
import { productFolder } from '../storage/cloudinary/folders.js';

const CATALOG = [
  { id: 'product-1', sku: 'SV-001', prefix: 'silver-frame' },
  { id: 'product-2', sku: 'SV-002', prefix: 'silver-kada' },
  { id: 'product-3', sku: 'SV-003', prefix: 'peacock-ring' },
];
const ALT = {
  'silver-frame': 'Silver Frame with Lakshmi and Ganesha devotional relief',
  'silver-kada': 'Silver Kada with patterned bangle design',
  'peacock-ring': 'Peacock-inspired statement ring with colourful detailing',
};

const [dir, ...flags] = process.argv.slice(2);
if (!dir) throw new Error('Usage: upload-catalog-images.js <imagesDir> [--environment=production] [--no-appwrite]');
const writeReferences = !flags.includes('--no-appwrite');
const environmentFlag = flags.find((flag) => flag.startsWith('--environment='));
const folderEnvironment = environmentFlag?.split('=')[1] || (process.env.NODE_ENV === 'production' ? 'production' : 'development');
if (!['development', 'production'].includes(folderEnvironment)) {
  throw new Error('Choose --environment=development or --environment=production.');
}

const config = loadConfig();
configureAppwrite(config);
assertCloudinary(config);

async function upload(file, publicId, resourceType) {
  const params = { public_id: publicId, overwrite: 'true', timestamp: Math.floor(Date.now() / 1000) };
  const contentType = {
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.avif': 'image/avif',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.m4v': 'video/x-m4v',
  }[path.extname(file).toLowerCase()];
  if (!contentType) throw new Error(`Unsupported image format: ${file}`);
  const form = new FormData();
  form.set('file', new Blob([await readFile(file)], { type: contentType }), path.basename(file));
  form.set('api_key', config.cloudinaryApiKey);
  form.set('signature', signParams(params, config.cloudinaryApiSecret));
  for (const [key, value] of Object.entries(params)) form.set(key, String(value));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudinaryCloudName}/${resourceType}/upload`, { method: 'POST', body: form });
  const result = await response.json();
  if (!response.ok) throw new Error(`Upload failed for ${file}: ${result?.error?.message}`);
  return result;
}

const imageExtensions = new Set(['.webp', '.png', '.jpg', '.jpeg', '.avif']);
const videoExtensions = new Set(['.mp4', '.mov', '.webm', '.m4v']);
const files = await readdir(dir);

const byProduct = new Map();
for (const product of CATALOG) {
  const media = [];
  const productFiles = files
    .filter((file) => {
      const extension = path.extname(file).toLowerCase();
      const baseName = path.basename(file, extension);
      return (imageExtensions.has(extension) && new RegExp(`^${product.prefix}-\\d{2,}$`).test(baseName)) ||
        (videoExtensions.has(extension) && new RegExp(`^${product.prefix}-video-\\d{2,}$`).test(baseName));
    })
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  if (productFiles.length === 0) throw new Error(`No supported images or videos found for ${product.sku} in ${dir}.`);

  for (const file of productFiles) {
    const extension = path.extname(file).toLowerCase();
    const resourceType = videoExtensions.has(extension) ? 'video' : 'image';
    const name = path.basename(file, extension);
    const result = await upload(
      path.join(dir, file),
      `${productFolder(config, product.sku, folderEnvironment)}/${name}`,
      resourceType,
    );
    media.push({
      publicId: result.public_id,
      resourceType,
      width: result.width,
      height: result.height,
      ...(result.duration && { duration: result.duration }),
      format: result.format,
      alt: ALT[product.prefix],
    });
    console.error(`uploaded ${name} (${resourceType}) -> ${result.public_id}`);
  }
  byProduct.set(product.id, media);
}
console.error(`Cloudinary cloud name (public, for VITE_CLOUDINARY_CLOUD_NAME): ${config.cloudinaryCloudName}`);

if (writeReferences) {
  for (const product of CATALOG) {
    const record = await findDocument('products', 'sku', product.sku);
    if (!record) {
      throw new Error(`${product.sku} is missing in Appwrite. Run seed:catalog before saving image references.`);
    }
    await updateDocument('products', record.$id, {
      imagesJson: JSON.stringify(byProduct.get(product.id)),
      updatedAt: Date.now(),
    });
    console.error(`${product.sku}: image references saved in Appwrite`);
  }
}
