/**
 * Product and site photographs are hosted on Cloudinary (never in Appwrite or the
 * repo). Public IDs follow server/src/storage/cloudinary/folders.js:
 *   <root>/<development|production>/products/<sku>/<name>
 * The cloud name is public (it appears in every image URL). Override it with
 * VITE_CLOUDINARY_CLOUD_NAME; VITE_CLOUDINARY_ROOT_FOLDER mirrors the server's root.
 */
const CLOUD_NAME = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
const ROOT = (import.meta.env.VITE_CLOUDINARY_ROOT_FOLDER || 'silveram').trim();
const ENV_FOLDER = import.meta.env.PROD ? 'production' : 'development';

export function productImageUrl(
  sku: string,
  name: string,
  width = 1400,
  fallbackSrc = '',
): string {
  if (!CLOUD_NAME) return fallbackSrc;
  const publicId = `${ROOT}/${ENV_FOLDER}/products/${sku.toLowerCase()}/${name}`;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_limit,w_${width}/${publicId}`;
}

/**
 * `srcset` for an image already built by productImageUrl(). Cloudinary URLs get one entry per
 * width (c_limit means a width above the original photograph returns the original, never an
 * upscaled copy). Returns undefined for local fallback paths, which have a single size.
 */
export function responsiveSrcSet(src: string | undefined, widths: readonly number[]): string | undefined {
  // The width transform sits inside the options segment, e.g. ".../upload/f_auto,q_auto,c_limit,w_1400/<id>".
  const widthParam = /(?<=[,/])w_\d+(?=[,/])/;
  if (!src || !src.includes('res.cloudinary.com') || !widthParam.test(src)) return undefined;
  return widths.map((width) => `${src.replace(widthParam, `w_${width}`)} ${width}w`).join(', ');
}
