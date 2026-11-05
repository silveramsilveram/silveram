// Single source of truth for where media lives in Cloudinary.
//
//   <root>/<env>/products/<sku>/<generated-id>   product gallery images
//   <root>/<env>/site/<area>/<generated-id>      hero, categories, editorial, etc.
//
// <env> keeps development uploads out of production's media library.

const SEGMENT = /^[a-z0-9][a-z0-9_-]{0,63}$/;
export const SITE_AREAS = ['hero', 'categories', 'editorial', 'avatars'];

export function slugSegment(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function segment(value, label) {
  const slug = slugSegment(value);
  if (!SEGMENT.test(slug)) throw new Error(`Invalid ${label} for media folder.`);
  return slug;
}

export function envRoot(config) {
  return `${config.cloudinaryRootFolder}/${config.isProduction ? 'production' : 'development'}`;
}

export function productFolder(config, sku, environment = config.isProduction ? 'production' : 'development') {
  if (!['development', 'production'].includes(environment)) throw new Error('Invalid media environment.');
  return `${config.cloudinaryRootFolder}/${environment}/products/${segment(sku, 'SKU')}`;
}

export function siteFolder(config, area, environment = config.isProduction ? 'production' : 'development') {
  if (!SITE_AREAS.includes(area)) throw new Error('Invalid site media area.');
  if (!['development', 'production'].includes(environment)) throw new Error('Invalid media environment.');
  return `${config.cloudinaryRootFolder}/${environment}/site/${area}`;
}

/** True only for ids Cloudinary generated inside this product's folder. */
export function isProductPublicId(config, sku, publicId) {
  if (typeof publicId !== 'string' || publicId.length > 255) return false;
  const prefix = `${productFolder(config, sku)}/`;
  return publicId.startsWith(prefix) && /^[A-Za-z0-9_-]+$/.test(publicId.slice(prefix.length));
}
