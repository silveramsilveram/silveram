import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config.js';
import { escapeHtml, formatInr, orderConfirmationEmail } from '../src/mail/templates.js';

const config = { storeName: 'Silveram', storeUrl: 'https://silveram.example', supportEmail: 'help@silveram.example' };
const order = {
  _id: 'req-123',
  paymentMethod: 'razorpay',
  razorpayPaymentId: 'pay_ABC',
  amountInPaise: 249900,
  createdAt: new Date('2026-11-01T10:00:00Z'),
  shipping: { name: 'A <b>Buyer</b>\r\nBcc: x@y.z', phone: '9876543210', address: '1 MG Road', city: 'Pune', state: 'MH', postalCode: '411001' },
  items: [{ name: 'Ring <script>', sku: 'SR-001', quantity: 1, lineTotalInPaise: 249900 }],
};

test('formats rupees', () => assert.match(formatInr(249900), /2,499\.00/));

test('order email escapes customer text and keeps the subject on one line', () => {
  const mail = orderConfirmationEmail(config, order);
  assert.ok(!/[\r\n]/.test(mail.subject));
  assert.ok(!mail.html.includes('<script>'));
  assert.ok(!mail.html.includes('<b>Buyer'));
  assert.ok(mail.html.includes(escapeHtml('Ring <script>')));
  assert.ok(mail.text.includes('req-123') && mail.text.includes('pay_ABC'));
});

test('cod email asks for cash on delivery', () => {
  const mail = orderConfirmationEmail(config, { ...order, paymentMethod: 'cod', razorpayPaymentId: undefined });
  assert.match(mail.text, /Cash on delivery/);
});

test('mailjet keys derive SMTP settings and must come as a pair', () => {
  const saved = { ...process.env };
  t_env({
    APPWRITE_ENDPOINT: 'https://cloud.appwrite.io/v1',
    APPWRITE_PROJECT_ID: 'project',
    APPWRITE_API_KEY: 'appwrite-server-key',
    SESSION_SECRET: 's'.repeat(32),
    OTP_PEPPER: 'p'.repeat(32),
    MAILJET_API_KEY: 'k',
    MAILJET_SECRET_KEY: 's',
    SMTP_FROM: 'a@b.c',
  });
  try {
    const c = loadConfig();
    assert.equal(c.smtpHost, 'in-v3.mailjet.com');
    assert.equal(c.smtpUser, 'k');
    assert.equal(c.smtpPassword, 's');
    delete process.env.MAILJET_SECRET_KEY;
    assert.throws(() => loadConfig(), /both MAILJET_API_KEY/);
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
});

function t_env(values) {
  for (const k of ['NODE_ENV', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'MAILJET_CONTACT_LIST_ID', 'STORE_URL']) delete process.env[k];
  Object.assign(process.env, values);
}
