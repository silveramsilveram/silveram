import { Router } from 'express';
import { z } from 'zod';
import { createDocument, deleteDocument, findDocument, getAppwrite, getDocument, ID, Query, updateDocument } from '../platform/appwrite.js';
import { getMailer } from '../mail/transport.js';
import { forgetSession, forgetUser, getCachedUser, lookupSession } from '../sessions.js';
import { consumeRateLimit, createOpaqueToken, createOtp, hashToken, otpDigest, safeEqualHex } from '../security.js';

const emailSchema = z.string().trim().email().max(254).transform((email) => email.toLowerCase());
const requestSchema = z.object({ email: emailSchema }).strict();
const verifySchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/),
  name: z.string().trim().min(1).max(100).optional(),
  // "signup" creates the account when none exists; "signin" never does.
  mode: z.enum(['signin', 'signup']).default('signup'),
}).strict();
const sessionDurationMs = 14 * 24 * 60 * 60 * 1000;

function challengeId(email) {
  return hashToken(email).slice(0, 36);
}

function setSessionCookie(res, token, config) {
  res.cookie('silveram_session', token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/api',
    maxAge: sessionDurationMs,
  });
}

export function createAuthRouter(config) {
  const router = Router();
  const mailer = getMailer(config);

  router.post('/otp', async (req, res, next) => {
    try {
      const parsed = requestSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email address.' });
      if (!mailer) {
        return res.status(503).json({ error: 'Email verification is not configured yet.' });
      }

      const email = parsed.data.email;
      // Independent Appwrite calls run together: one network wait instead of three in a row.
      const id = challengeId(email);
      const [ipAllowed, emailAllowed, existing] = await Promise.all([
        consumeRateLimit(req.ip, 'otp-ip', 10, 60 * 60 * 1000),
        consumeRateLimit(email, 'otp-email', 5, 60 * 60 * 1000),
        getDocument('authChallenges', id),
      ]);
      if (!ipAllowed || !emailAllowed) {
        return res.status(429).json({ error: 'Too many verification requests. Please try again later.' });
      }
      if (
        existing?.lastSentAt &&
        Date.now() - existing.lastSentAt < config.otpResendSeconds * 1000
      ) {
        return res.status(429).json({ error: 'Please wait before requesting another verification code.' });
      }

      const code = createOtp();
      const now = new Date();
      const challenge = {
        email,
        codeDigest: otpDigest(email, code, config.otpPepper),
        nonce: createOpaqueToken(),
        createdAt: now.getTime(),
        lastSentAt: now.getTime(),
        expiresAt: now.getTime() + config.otpTtlMinutes * 60 * 1000,
      };
      if (existing) await updateDocument('authChallenges', id, challenge);
      else await createDocument('authChallenges', id, challenge);

      try {
        await mailer.sendMail({
          from: config.smtpFrom,
          to: email,
          subject: 'Your Silveram verification code',
          text: `Your Silveram verification code is ${code}. It expires in ${config.otpTtlMinutes} minutes. If you did not request this, you can ignore this email.`,
          html: `<p>Your Silveram verification code is <strong>${code}</strong>.</p><p>It expires in ${config.otpTtlMinutes} minutes. If you did not request this, you can ignore this email.</p>`,
        });
      } catch (error) {
        const latest = await getDocument('authChallenges', id);
        if (latest?.codeDigest === challenge.codeDigest) await deleteDocument('authChallenges', id);
        throw error;
      }

      return res.status(202).json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.post('/verify', async (req, res, next) => {
    try {
      const parsed = verifySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Enter your email and the six-digit code.' });
      const { email, code, name, mode } = parsed.data;
      if (mode === 'signup' && !name) {
        return res.status(400).json({ error: 'Enter your name to create an account.' });
      }
      const id = challengeId(email);
      // The IP limit and the challenge lookup do not depend on each other.
      const [ipAllowed, challenge] = await Promise.all([
        consumeRateLimit(req.ip, 'otp-verify-ip', 30, 60 * 60 * 1000),
        getDocument('authChallenges', id),
      ]);
      if (!ipAllowed) {
        return res.status(429).json({ error: 'Too many verification attempts. Please try again later.' });
      }
      if (!challenge) return res.status(400).json({ error: 'That code has expired. Request a new code.' });
      if (challenge.expiresAt <= Date.now()) {
        await deleteDocument('authChallenges', id);
        return res.status(400).json({ error: 'That code has expired. Request a new code.' });
      }

      if (!(await consumeRateLimit(
        `${email}:${challenge.nonce}`,
        'otp-verify-challenge',
        config.otpMaxAttempts,
        24 * 60 * 60 * 1000,
      ))) {
        return res.status(429).json({ error: 'Too many verification attempts. Request a new code.' });
      }

      const submittedDigest = otpDigest(email, code, config.otpPepper);
      if (!safeEqualHex(submittedDigest, challenge.codeDigest)) {
        return res.status(400).json({ error: 'That verification code is incorrect.' });
      }

      if (challenge.expiresAt <= Date.now()) {
        await deleteDocument('authChallenges', id);
        return res.status(400).json({ error: 'That code is no longer valid. Request a new code.' });
      }

      // The code proves the caller owns this address, so it is safe to say whether an account exists.
      // Checked before the code is consumed so the customer can switch to "Create account" and reuse it.
      const { users } = getAppwrite();
      const matches = await users.list({ queries: [Query.equal('email', email), Query.limit(1)] });
      if (mode === 'signin' && !matches.users[0]) {
        return res.status(404).json({ error: 'No account exists for this email yet. Choose "Create account" to register.' });
      }

      const consumptionId = hashToken(`${email}:${challenge.nonce}:${challenge.codeDigest}`).slice(0, 36);
      try {
        await createDocument('authConsumptions', consumptionId, {
          emailHash: hashToken(email),
          consumedAt: Date.now(),
        });
      } catch (error) {
        if (error?.code === 409) {
          return res.status(400).json({ error: 'That code is no longer valid. Request a new code.' });
        }
        throw error;
      }
      const now = new Date();
      let user = matches.users[0];
      if (!user) {
        try {
          user = await users.create({
            userId: ID.unique(),
            email,
            password: createOpaqueToken(),
            name: name || '',
          });
        } catch (error) {
          if (error?.code !== 409) throw error;
          const retry = await users.list({ queries: [Query.equal('email', email), Query.limit(1)] });
          user = retry.users[0];
          if (!user) throw error;
        }
      } else if (name && user.name !== name) {
        user = await users.updateName({ userId: user.$id, name });
      }
      if (!user.emailVerification) {
        user = await users.updateEmailVerification({ userId: user.$id, emailVerification: true });
      }
      forgetUser(user.$id);

      const sessionToken = createOpaqueToken();
      const upsertProfile = async () => {
        const profile = await getDocument('profiles', user.$id);
        const profileData = {
          email,
          name: name || user.name || '',
          createdAt: profile?.createdAt || now.getTime(),
          lastLoginAt: now.getTime(),
        };
        if (profile) await updateDocument('profiles', user.$id, profileData);
        else await createDocument('profiles', user.$id, profileData);
      };
      // Removing the used code, the profile bookkeeping and the new session are independent.
      await Promise.all([
        deleteDocument('authChallenges', id),
        upsertProfile(),
        createDocument('sessions', ID.unique(), {
          tokenHash: hashToken(sessionToken),
          userId: user.$id,
          email,
          createdAt: now.getTime(),
          expiresAt: now.getTime() + sessionDurationMs,
        }),
      ]);
      setSessionCookie(res, sessionToken, config);
      return res.json({ user: { id: user.$id, email: user.email, name: name || user.name || '' } });
    } catch (error) {
      next(error);
    }
  });

  router.get('/me', async (req, res, next) => {
    try {
      const token = req.cookies?.silveram_session;
      if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
      const session = await lookupSession(hashToken(token));
      if (!session) return res.status(401).json({ error: 'Your session expired. Verify your email again.' });
      const { users } = getAppwrite();
      const user = await getCachedUser(session.userId, async () => {
        try {
          return await users.get({ userId: session.userId });
        } catch (error) {
          if (error?.code === 404) return undefined; // a missing account is never cached
          throw error;
        }
      });
      if (!user) return res.status(401).json({ error: 'Your account could not be found.' });
      return res.json({ user: { id: user.$id, email: user.email, name: user.name || '' } });
    } catch (error) {
      next(error);
    }
  });

  router.post('/logout', async (req, res, next) => {
    try {
      const token = req.cookies?.silveram_session;
      if (token) {
        const tokenHash = hashToken(token);
        forgetSession(tokenHash);
        const session = await findDocument('sessions', 'tokenHash', tokenHash);
        if (session) await deleteDocument('sessions', session.$id);
      }
      res.clearCookie('silveram_session', {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        path: '/api',
      });
      return res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
