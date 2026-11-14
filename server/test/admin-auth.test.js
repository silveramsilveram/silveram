import assert from 'node:assert/strict';
import test, { after, before, beforeEach, mock } from 'node:test';
import cookieParser from 'cookie-parser';
import express from 'express';
import { createMemoryAppwrite } from './helpers/memory-appwrite.js';

// Single-owner sign-in: the allow-listed administrator can sign in on first use (account is created
// after the e-mailed code proves ownership); nobody else gets an account through "sign in".

const mem = createMemoryAppwrite();
const sent = [];
const config = {
  origins: ['https://admin.silveram.test'], adminEmails: new Set(['owner@silveram.test']), isProduction: false,
  otpPepper: 'p'.repeat(40), otpTtlMinutes: 10, otpMaxAttempts: 5, otpResendSeconds: 60, smtpFrom: 'Silveram <x@silveram.test>',
};
let server;
let base;

before(async () => {
  mock.module(new URL('../src/platform/appwrite.js', import.meta.url).href, { namedExports: mem.named });
  mock.module(new URL('../src/mail/transport.js', import.meta.url).href, {
    namedExports: { getMailer: () => ({ sendMail: async (message) => void sent.push(message) }), mailConfigured: () => true },
  });
  const { createAuthRouter } = await import('../src/routes/auth.js');
  const { createAdminRouter } = await import('../src/routes/admin.js');
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/auth', createAuthRouter(config));
  app.use('/api/admin', createAdminRouter(config));
  app.use((error, _req, res, _next) => res.status(error?.status || 500).json({ error: error.message }));
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server?.close());
beforeEach(() => { mem.clear(); sent.length = 0; });

const post = (path, body, headers = {}) => fetch(`${base}${path}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://admin.silveram.test', ...headers }, body: JSON.stringify(body),
});
const codeFromMail = () => /(\d{6})/.exec(sent.at(-1).text)[1];

test('the owner signs in on first use without registering, then reaches the admin API', async () => {
  assert.equal((await post('/auth/otp', { email: 'Owner@Silveram.test' })).status, 202);
  const verify = await post('/auth/verify', { email: 'owner@silveram.test', code: codeFromMail(), mode: 'signin' });
  assert.equal(verify.status, 200);
  assert.equal(mem.accounts.length, 1, 'account created on first admin sign-in');
  const cookie = verify.headers.get('set-cookie');
  assert.match(cookie, /silveram_session=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  const me = await fetch(`${base}/admin/me`, { headers: { Cookie: cookie.split(';')[0] } });
  assert.equal(me.status, 200);
});

test('anyone else signing in without an account is refused and no account is created', async () => {
  await post('/auth/otp', { email: 'stranger@example.com' });
  const verify = await post('/auth/verify', { email: 'stranger@example.com', code: codeFromMail(), mode: 'signin' });
  assert.equal(verify.status, 404);
  assert.equal(mem.accounts.length, 0);
});

test('a wrong code never signs anyone in, owner or not', async () => {
  await post('/auth/otp', { email: 'owner@silveram.test' });
  const verify = await post('/auth/verify', { email: 'owner@silveram.test', code: '000000', mode: 'signin' });
  assert.equal(verify.status, 400);
  assert.equal(mem.accounts.length, 0);
});

test('a signed-in shopper who is not on the allow-list gets 403 from the admin API', async () => {
  mem.accounts.push({ $id: 'shopper', email: 'shopper@example.com', name: 'S', emailVerification: true });
  await post('/auth/otp', { email: 'shopper@example.com' });
  const verify = await post('/auth/verify', { email: 'shopper@example.com', code: codeFromMail(), mode: 'signin' });
  assert.equal(verify.status, 200);
  const me = await fetch(`${base}/admin/me`, { headers: { Cookie: verify.headers.get('set-cookie').split(';')[0] } });
  assert.equal(me.status, 403);
});
