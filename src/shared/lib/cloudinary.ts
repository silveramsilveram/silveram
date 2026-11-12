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

/** Site areas mirror SITE_AREAS in server/src/storage/cloudinary/folders.js (read-only reference). */
export type SiteMediaArea = 'hero' | 'categories' | 'editorial' | 'avatars';

/** Site photograph: `<root>/<env>/site/<area>/<name>`. Same transforms as product images. */
export function siteImageUrl(area: SiteMediaArea, name: string, width = 1400, fallbackSrc = ''): string {
  if (!CLOUD_NAME) return fallbackSrc;
  const publicId = `${ROOT}/${ENV_FOLDER}/site/${area}/${name}`;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_limit,w_${width}/${publicId}`;
}

/**
 * Product film: `<root>/<env>/products/<sku>/<name>` as a Cloudinary *video* resource.
 * `f_auto` lets Cloudinary pick WebM or MP4 for the browser; `c_limit` never enlarges the original.
 * Returns '' when Cloudinary is not configured (there is no bundled fallback film).
 */
export function productVideoUrl(sku: string, name: string, width = 1280): string {
  if (!CLOUD_NAME) return '';
  const publicId = `${ROOT}/${ENV_FOLDER}/products/${sku.toLowerCase()}/${name}`;
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/f_auto,q_auto,c_limit,w_${width}/${publicId}`;
}

/** Still frame (first frame) of a product film, for the `poster` attribute and reduced-motion view. */
export function productVideoPosterUrl(sku: string, name: string, width = 1280): string {
  if (!CLOUD_NAME) return '';
  const publicId = `${ROOT}/${ENV_FOLDER}/products/${sku.toLowerCase()}/${name}`;
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_0,f_jpg,q_auto,c_limit,w_${width}/${publicId}.jpg`;
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

/** Responsive widths that never exceed the photograph's own pixel width, so nothing is upscaled. */
export function nativeWidths(native: number, steps: readonly number[] = [320, 480, 720, 922]): number[] {
  return [...steps.filter((width) => width < native), native];
}
