import { createHash } from 'node:crypto';

export const IMAGE_FORMATS = 'jpg,jpeg,png,webp,avif';
export const VIDEO_FORMATS = 'mp4,mov,webm,m4v';

export function cloudinaryEnabled(config) {
  return Boolean(config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret);
}

export function assertCloudinary(config) {
  if (!cloudinaryEnabled(config)) {
    const error = new Error('Cloudinary is not configured.');
    error.status = 503;
    throw error;
  }
}

// https://cloudinary.com/documentation/authentication_signatures
export function signParams(params, apiSecret) {
  const payload = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(payload + apiSecret).digest('hex');
}

/** Parameters the browser needs to upload straight to Cloudinary into `folder`. */
export function createUploadSignature(config, folder, now = Date.now(), resourceType = 'image') {
  assertCloudinary(config);
  if (!['image', 'video'].includes(resourceType)) {
    throw new Error('Unsupported Cloudinary resource type.');
  }
  const params = {
    folder,
    allowed_formats: resourceType === 'video' ? VIDEO_FORMATS : IMAGE_FORMATS,
    timestamp: Math.floor(now / 1000),
  };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudinaryCloudName}/${resourceType}/upload`,
    apiKey: config.cloudinaryApiKey,
    signature: signParams(params, config.cloudinaryApiSecret),
    ...params,
    resourceType,
  };
}

/** Optimised delivery URL (auto format/quality, width-capped). */
export function mediaUrl(config, publicId, { width = 1200, resourceType = 'image' } = {}) {
  const transformations = resourceType === 'video'
    ? `f_auto,q_auto,c_limit,w_${width}`
    : `f_auto,q_auto,c_limit,w_${width}`;
  return `https://res.cloudinary.com/${config.cloudinaryCloudName}/${resourceType}/upload/${transformations}/${publicId}`;
}

export function imageUrl(config, publicId, options = {}) {
  return mediaUrl(config, publicId, { ...options, resourceType: 'image' });
}

export async function destroyImage(config, publicId) {
  assertCloudinary(config);
  const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000), invalidate: 'true' };
  const body = new URLSearchParams({
    ...params,
    api_key: config.cloudinaryApiKey,
    signature: signParams(params, config.cloudinaryApiSecret),
  });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudinaryCloudName}/image/destroy`, {
    method: 'POST',
    body,
  });
  if (!response.ok) throw new Error('Cloudinary could not delete the image.');
}
