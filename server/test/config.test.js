import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config.js';

const configNames = [
  'NODE_ENV',
  'PORT',
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY',
  'APPWRITE_SETUP_API_KEY',
  'APPWRITE_DATABASE_ID',
  'APPWRITE_PROFILES_COLLECTION_ID',
  'APPWRITE_AUTH_CHALLENGES_COLLECTION_ID',
  'APPWRITE_AUTH_CONSUMPTIONS_COLLECTION_ID',
  'APPWRITE_SESSIONS_COLLECTION_ID',
  'APPWRITE_RATE_LIMITS_COLLECTION_ID',
  'APPWRITE_PRODUCTS_COLLECTION_ID',
  'APPWRITE_ORDERS_COLLECTION_ID',
  'APPWRITE_WEBHOOK_EVENTS_COLLECTION_ID',
  'APPWRITE_EMAIL_CLAIMS_COLLECTION_ID',
  'OTP_PEPPER',
  'FRONTEND_ORIGINS',
  'TRUST_PROXY_HOPS',
  'STORE_LIVE_CHECKOUT',
  'CASHFREE_ENABLED',
  'CASHFREE_ENV',
  'CASHFREE_APP_ID',
  'CASHFREE_SECRET_KEY',
  'STORE_URL',
  'MAILJET_API_KEY',
  'MAILJET_SECRET_KEY',
  'MAILJET_CONTACT_LIST_ID',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM',
  'STORE_NAME',
  'STORE_URL',
  'SUPPORT_EMAIL',
];

function configure(t, values) {
  const previous = new Map(configNames.map((name) => [name, process.env[name]]));
  for (const name of configNames) delete process.env[name];
  Object.assign(process.env, {
    APPWRITE_ENDPOINT: 'https://cloud.appwrite.io/v1',
    APPWRITE_PROJECT_ID: 'project',
    APPWRITE_API_KEY: 'appwrite-server-key',
    OTP_PEPPER: 'p'.repeat(32),
    ...values,
  });
  t.after(() => {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
}

test('production config requires HTTPS website origins', (t) => {
  configure(t, { NODE_ENV: 'production' });
  assert.throws(() => loadConfig(), /valid HTTPS website origins/);
});

test('production config keeps COD checkout gated and Cashfree disabled by default', (t) => {
  configure(t, {
    NODE_ENV: 'production',
    FRONTEND_ORIGINS: 'https://silveram.example',
    TRUST_PROXY_HOPS: '1',
  });
  const config = loadConfig();
  assert.equal(config.liveCheckout, false);
  assert.equal(config.cashfreeEnabled, false);
  assert.equal(config.trustProxyHops, 1);
});

test('Cashfree needs live checkout, credentials and a store URL before it can be enabled', (t) => {
  const base = { NODE_ENV: 'production', FRONTEND_ORIGINS: 'https://silveram.example', CASHFREE_ENABLED: 'true' };
  configure(t, base);
  assert.throws(() => loadConfig(), /Enable Cashfree only after checkout is enabled/);
  configure(t, { ...base, STORE_LIVE_CHECKOUT: 'true', CASHFREE_APP_ID: 'id', CASHFREE_SECRET_KEY: 'secret' });
  assert.throws(() => loadConfig(), /STORE_URL/);
  configure(t, { ...base, STORE_LIVE_CHECKOUT: 'true', CASHFREE_APP_ID: 'id', CASHFREE_SECRET_KEY: 'secret', STORE_URL: 'https://silveram.example', CASHFREE_ENV: 'production' });
  const config = loadConfig();
  assert.equal(config.cashfreeEnabled, true);
  assert.equal(config.cashfreeEnv, 'production');
  configure(t, { ...base, CASHFREE_ENV: 'live' });
  assert.throws(() => loadConfig(), /CASHFREE_ENV/);
});

test('live checkout works without email (warns) and uses the SMTP settings when present', (t) => {
  configure(t, {
    NODE_ENV: 'production',
    FRONTEND_ORIGINS: 'https://silveram.example',
    STORE_LIVE_CHECKOUT: 'true',
  });
  t.mock.method(console, 'warn', () => {});
  assert.equal(loadConfig().liveCheckout, true);
  assert.equal(loadConfig().codEnabled, true);

  Object.assign(process.env, {
    SMTP_HOST: 'in-v3.mailjet.com',
    SMTP_USER: 'mailjet-api-key',
    SMTP_PASSWORD: 'mailjet-secret-key',
    SMTP_FROM: 'Silveram <orders@silveram.example>',
  });
  const config = loadConfig();
  assert.equal(config.liveCheckout, true);
  assert.equal(config.smtpHost, 'in-v3.mailjet.com');
});
