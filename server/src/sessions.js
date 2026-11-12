import { TtlCache } from './cache.js';
import { findDocument } from './platform/appwrite.js';

/**
 * Every signed-in request used to cost one Appwrite round trip just to look up the session.
 * Sessions are now cached in memory for a short time. Only *valid* sessions are cached, and
 * logging out removes the entry immediately on the instance that handled it. Other warm
 * instances may keep honouring a logged-out cookie for at most SESSION_CACHE_MS.
 */
export const SESSION_CACHE_MS = 30 * 1000;

const sessionCache = new TtlCache({ ttlMs: SESSION_CACHE_MS, maxEntries: 1000 });

/** Returns the session document for a token hash, or null if it is missing or expired. */
export async function lookupSession(tokenHash) {
  const session = await sessionCache.getOrLoad(tokenHash, async () => {
    const found = await findDocument('sessions', 'tokenHash', tokenHash);
    return found && found.expiresAt > Date.now() ? found : undefined; // undefined = do not cache
  });
  if (!session) return null;
  // A cached entry can outlive the session's own expiry by a few seconds: re-check.
  return session.expiresAt > Date.now() ? session : null;
}

export function forgetSession(tokenHash) {
  sessionCache.delete(tokenHash);
}

/**
 * `/auth/me` runs on every page load, and the Appwrite user record (email, name) almost never
 * changes, so it is cached a little longer. Sign-in invalidates it (the name may have changed).
 * `load` should resolve to `undefined` (not throw) for a missing user so a miss is never cached.
 */
const userCache = new TtlCache({ ttlMs: 60 * 1000, maxEntries: 1000 });

export function getCachedUser(userId, load) {
  return userCache.getOrLoad(userId, load);
}

export function forgetUser(userId) {
  userCache.delete(userId);
}
