import { hashToken } from './security.js';
import { lookupSession } from './sessions.js';

export function requireLiveCheckout(config) {
  return (req, res, next) => {
    if (!config.liveCheckout) {
      return res.status(503).json({ error: 'Checkout is not enabled yet. Please contact the store.' });
    }
    next();
  };
}

export async function requireUser(req, res, next) {
  try {
    const token = req.cookies?.silveram_session;
    if (!token) return res.status(401).json({ error: 'Verify your email before continuing.' });
    const session = await lookupSession(hashToken(token));
    if (!session) {
      return res.status(401).json({ error: 'Your session expired. Verify your email again.' });
    }
    req.user = { id: session.userId, email: session.email };
    req.sessionTokenHash = session.tokenHash;
    next();
  } catch (error) {
    next(error);
  }
}

// Attaches req.user when a valid session cookie is present; otherwise carries on as a guest.
export async function optionalUser(req, _res, next) {
  try {
    const token = req.cookies?.silveram_session;
    if (token) {
      const session = await lookupSession(hashToken(token));
      if (session) {
        req.user = { id: session.userId, email: session.email };
      }
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(config) {
  return (req, res, next) => {
    if (!req.user || !config.adminEmails.has(req.user.email)) {
      return res.status(403).json({ error: 'Administrator access is required.' });
    }
    next();
  };
}
