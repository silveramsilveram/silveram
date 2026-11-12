import { createHash, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { deleteDocument, listDocuments, Query } from '../platform/appwrite.js';
import { releaseExpiredReservations } from './orders.js';

async function deleteBefore(collection, field, cutoff) {
  let deleted = 0;
  while (true) {
    const rows = await listDocuments(collection, [
      Query.lessThan(field, cutoff),
      Query.limit(100),
    ]);
    if (rows.length) {
      await Promise.all(rows.map((row) => deleteDocument(collection, row.$id)));
      deleted += rows.length;
    }
    if (rows.length < 100) return deleted;
  }
}

async function deleteByQueries(collection, queries) {
  let deleted = 0;
  while (true) {
    const rows = await listDocuments(collection, [...queries, Query.limit(100)]);
    if (rows.length) {
      await Promise.all(rows.map((row) => deleteDocument(collection, row.$id)));
      deleted += rows.length;
    }
    if (rows.length < 100) return deleted;
  }
}

function matchesCronSecret(provided, expected) {
  const providedDigest = createHash('sha256').update(provided).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

function authorizeCron(req, res, config) {
  if (!config.cronSecret) {
    res.status(503).json({ error: 'Scheduled maintenance is not configured.' });
    return false;
  }
  const authorization = req.get('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token || !matchesCronSecret(token, config.cronSecret)) {
    res.status(401).json({ error: 'Unauthorized.' });
    return false;
  }
  return true;
}

export function createMaintenanceRouter(config) {
  const router = Router();

  router.get('/reservations', async (req, res, next) => {
    try {
      if (!authorizeCron(req, res, config)) return;
      await releaseExpiredReservations();
      return res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.get('/cleanup', async (req, res, next) => {
    try {
      if (!authorizeCron(req, res, config)) return;

      const now = Date.now();
      const removed = {
        sessions: await deleteBefore('sessions', 'expiresAt', now),
        authChallenges: await deleteBefore('authChallenges', 'expiresAt', now),
        authConsumptions: await deleteBefore('authConsumptions', 'consumedAt', now - 24 * 60 * 60 * 1000),
        rateLimits: await deleteBefore('rateLimits', 'windowStart', now - 24 * 60 * 60 * 1000),
        webhookEvents: await deleteBefore('webhookEvents', 'receivedAt', now - 180 * 24 * 60 * 60 * 1000),
        staleEmailClaims: await deleteByQueries('emailClaims', [
          Query.lessThan('claimedAt', now - 5 * 60 * 1000),
          Query.isNull('sentAt'),
        ]),
        oldEmailClaims: await deleteBefore('emailClaims', 'sentAt', now - 180 * 24 * 60 * 60 * 1000),
      };
      return res.json({ success: true, removed });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
