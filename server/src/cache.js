/**
 * Tiny in-memory TTL cache with a size cap and request coalescing.
 *
 * Vercel keeps a function instance warm for a while and reuses it, so a value cached here is shared
 * by every request that instance serves. It is deliberately simple (no dependency): each instance
 * has its own copy, so only cache data that may be a few seconds stale, and always keep an explicit
 * `delete`/`clear` for the places that change the data.
 */
export class TtlCache {
  /**
   * @param {{ ttlMs: number, maxEntries?: number }} options
   */
  constructor({ ttlMs, maxEntries = 500 }) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.entries = new Map(); // key -> { value, expiresAt }   (Map keeps insertion order => cheap LRU-ish eviction)
    this.pending = new Map(); // key -> Promise (requests for the same key share one loader call)
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs = this.ttlMs) {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    if (this.entries.size > this.maxEntries) {
      // Oldest entry first: O(1) because Map iterates in insertion order.
      this.entries.delete(this.entries.keys().next().value);
    }
    return value;
  }

  delete(key) {
    this.entries.delete(key);
    this.pending.delete(key);
  }

  clear() {
    this.entries.clear();
    this.pending.clear();
  }

  /**
   * Returns the cached value, or runs `loader` once (concurrent callers share the same promise).
   * `loader` may return `undefined` to say "do not cache this" (e.g. a missing session).
   */
  async getOrLoad(key, loader) {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const running = this.pending.get(key);
    if (running) return running;
    const promise = (async () => {
      try {
        const value = await loader();
        if (value !== undefined) this.set(key, value);
        return value;
      } finally {
        this.pending.delete(key);
      }
    })();
    this.pending.set(key, promise);
    return promise;
  }
}
