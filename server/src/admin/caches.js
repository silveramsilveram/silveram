/**
 * Short-lived in-memory caches (analytics scans, reserved-stock totals) register here so any write
 * that could change them clears them at once: an admin edit, or a verified payment webhook.
 * Other warm serverless instances keep their copy for at most the cache's few-second TTL.
 */
const registry = new Set();

export function registerCache(cache) {
  registry.add(cache);
  return cache;
}

export function invalidateAdminCaches() {
  for (const cache of registry) cache.clear();
}
