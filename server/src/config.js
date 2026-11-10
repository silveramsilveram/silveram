function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required server configuration: ${name}`);
  return value;
}

function positiveInteger(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

function secret(name) {
  const value = required(name);
  if (Buffer.byteLength(value, 'utf8') < 32) {
    throw new Error(`${name} must contain at least 32 bytes.`);
  }
  return value;
}

// Mailjet: MAILJET_API_KEY / MAILJET_SECRET_KEY double as the SMTP login and the REST API login.
// Any explicit SMTP_* value still wins, so another relay can be swapped in without code changes.
function mailConfig() {
  const mailjetApiKey = process.env.MAILJET_API_KEY?.trim() || '';
  const mailjetSecretKey = process.env.MAILJET_SECRET_KEY || '';
  if (Boolean(mailjetApiKey) !== Boolean(mailjetSecretKey)) {
    throw new Error('Set both MAILJET_API_KEY and MAILJET_SECRET_KEY, or neither.');
  }
  const mailjet = Boolean(mailjetApiKey);
  const contactListId = process.env.MAILJET_CONTACT_LIST_ID?.trim() || '';
  if (contactListId && !/^\d{1,12}$/.test(contactListId)) {
    throw new Error('MAILJET_CONTACT_LIST_ID must be the numeric Mailjet contact list ID.');
  }
  return {
    mailjetApiKey,
    mailjetSecretKey,
    mailjetContactListId: contactListId,
    smtpHost: process.env.SMTP_HOST?.trim() || (mailjet ? 'in-v3.mailjet.com' : ''),
    smtpPort: positiveInteger('SMTP_PORT', 587),
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER || mailjetApiKey,
    smtpPassword: process.env.SMTP_PASSWORD || mailjetSecretKey,
    smtpFrom: process.env.SMTP_FROM?.trim() || '',
    storeName: process.env.STORE_NAME?.trim() || 'Silveram',
    storeUrl: (process.env.STORE_URL?.trim() || '').replace(/\/+$/, ''),
    supportEmail: process.env.SUPPORT_EMAIL?.trim() || '',
  };
}

export function loadConfig({ allowSetupKey = false } = {}) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || (nodeEnv === 'production' ? 1 : 0));
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');
  }
  const origins = (process.env.FRONTEND_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0 || origins.includes('*')) {
    throw new Error('FRONTEND_ORIGINS must contain explicit web origins and may not use "*".');
  }
  if (nodeEnv === 'production' && origins.some((origin) => {
    try {
      return new URL(origin).protocol !== 'https:' || /localhost|127\.0\.0\.1/.test(new URL(origin).hostname);
    } catch {
      return true;
    }
  })) {
    throw new Error('Production FRONTEND_ORIGINS must contain only valid HTTPS website origins.');
  }

  const liveCheckout = process.env.STORE_LIVE_CHECKOUT === 'true';
  const cashfreeEnabled = process.env.CASHFREE_ENABLED === 'true';
  const cashfreeEnv = process.env.CASHFREE_ENV?.trim() || 'sandbox';
  if (!['sandbox', 'production'].includes(cashfreeEnv)) {
    throw new Error('CASHFREE_ENV must be "sandbox" or "production".');
  }
  if (cashfreeEnabled && (!liveCheckout || !process.env.CASHFREE_APP_ID?.trim() || !process.env.CASHFREE_SECRET_KEY?.trim())) {
    throw new Error('Enable Cashfree only after checkout is enabled and CASHFREE_APP_ID and CASHFREE_SECRET_KEY are configured.');
  }
  if (cashfreeEnabled && !process.env.STORE_URL?.trim()) {
    throw new Error('Cashfree needs STORE_URL (the public https website URL) for payment return and webhook links.');
  }
  if (cashfreeEnabled && nodeEnv === 'production' && cashfreeEnv === 'sandbox') {
    console.warn('Cashfree is in SANDBOX mode: no real money will move. Set CASHFREE_ENV=production to go live.');
  }
  const testPayments = process.env.PAYMENT_TEST_MODE === 'true';
  if (testPayments && !liveCheckout) {
    throw new Error('PAYMENT_TEST_MODE requires STORE_LIVE_CHECKOUT=true.');
  }
  if (testPayments && nodeEnv === 'production') {
    console.warn('PAYMENT_TEST_MODE is ON: orders can be marked paid without real payment. Turn it off before launch.');
  }
  const mail = mailConfig();
  if (liveCheckout && (!mail.smtpHost || !mail.smtpUser || !mail.smtpPassword || !mail.smtpFrom)) {
    // Orders are stored in Appwrite either way; without SMTP the customer simply gets no email
    // (they still see the confirmation page and can track by order reference + email).
    console.warn('SMTP is not fully configured: order confirmation emails will not be sent.');
  }

  const storeUrl = process.env.STORE_URL?.trim();
  if (storeUrl && (!/^https?:\/\//.test(storeUrl) || (nodeEnv === 'production' && !storeUrl.startsWith('https://')))) {
    throw new Error('STORE_URL must be the public website URL (HTTPS in production).');
  }

  const cloudinaryVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const cloudinarySet = cloudinaryVars.filter((name) => process.env[name]?.trim());
  if (cloudinarySet.length > 0 && cloudinarySet.length < cloudinaryVars.length) {
    throw new Error('Set all of CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET, or none.');
  }
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(process.env.CLOUDINARY_ROOT_FOLDER?.trim() || 'silveram')) {
    throw new Error('CLOUDINARY_ROOT_FOLDER may only contain lowercase letters, numbers, "-" and "_".');
  }

  const appwriteEndpoint = required('APPWRITE_ENDPOINT').replace(/\/+$/, '');
  let endpoint;
  try {
    endpoint = new URL(appwriteEndpoint);
  } catch {
    throw new Error('APPWRITE_ENDPOINT must be a valid HTTP(S) URL.');
  }
  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password) {
    throw new Error('APPWRITE_ENDPOINT must be a valid HTTP(S) URL without embedded credentials.');
  }
  if (nodeEnv === 'production' && endpoint.protocol !== 'https:') {
    throw new Error('APPWRITE_ENDPOINT must use HTTPS in production.');
  }
  const appwriteDatabaseId = process.env.APPWRITE_DATABASE_ID?.trim() || 'silveram';
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/.test(appwriteDatabaseId)) {
    throw new Error('APPWRITE_DATABASE_ID is invalid.');
  }
  const appwriteCollections = {
    profiles: process.env.APPWRITE_PROFILES_COLLECTION_ID?.trim() || 'profiles',
    authChallenges: process.env.APPWRITE_AUTH_CHALLENGES_COLLECTION_ID?.trim() || 'auth_challenges',
    authConsumptions: process.env.APPWRITE_AUTH_CONSUMPTIONS_COLLECTION_ID?.trim() || 'auth_consumptions',
    sessions: process.env.APPWRITE_SESSIONS_COLLECTION_ID?.trim() || 'sessions',
    rateLimits: process.env.APPWRITE_RATE_LIMITS_COLLECTION_ID?.trim() || 'rate_limits',
    products: process.env.APPWRITE_PRODUCTS_COLLECTION_ID?.trim() || 'products',
    orders: process.env.APPWRITE_ORDERS_COLLECTION_ID?.trim() || 'orders',
    webhookEvents: process.env.APPWRITE_WEBHOOK_EVENTS_COLLECTION_ID?.trim() || 'webhook_events',
    emailClaims: process.env.APPWRITE_EMAIL_CLAIMS_COLLECTION_ID?.trim() || 'email_claims',
    customers: process.env.APPWRITE_CUSTOMERS_COLLECTION_ID?.trim() || 'customers',
  };
  for (const [name, id] of Object.entries(appwriteCollections)) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/.test(id)) {
      throw new Error(`APPWRITE_${name.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}_COLLECTION_ID is invalid.`);
    }
  }
  const appwriteApiKey = process.env.APPWRITE_API_KEY?.trim() ||
    (allowSetupKey ? required('APPWRITE_SETUP_API_KEY') : required('APPWRITE_API_KEY'));

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    trustProxyHops: trustProxyHops === 0 ? false : trustProxyHops,
    port: positiveInteger('PORT', 4000),
    appwriteEndpoint,
    appwriteProjectId: required('APPWRITE_PROJECT_ID'),
    appwriteApiKey,
    appwriteDatabaseId,
    appwriteCollections,
    otpPepper: secret('OTP_PEPPER'),
    cronSecret: process.env.CRON_SECRET ? secret('CRON_SECRET') : '',
    origins,
    adminEmails: new Set(
      (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
    productImageHosts: new Set(
      (process.env.PRODUCT_IMAGE_HOSTS || '')
        .split(',')
        .map((host) => host.trim().toLowerCase())
        .filter(Boolean),
    ),
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME?.trim() || '',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY?.trim() || '',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
    cloudinaryRootFolder: process.env.CLOUDINARY_ROOT_FOLDER?.trim() || 'silveram',
    liveCheckout,
    // Cash on delivery is on whenever checkout is live, unless explicitly switched off.
    codEnabled: process.env.COD_ENABLED !== 'false',
    cashfreeEnabled,
    cashfreeEnv,
    testPayments,
    otpTtlMinutes: positiveInteger('OTP_TTL_MINUTES', 10),
    otpMaxAttempts: positiveInteger('OTP_MAX_ATTEMPTS', 5),
    otpResendSeconds: positiveInteger('OTP_RESEND_SECONDS', 60),
    ...mail,
    cashfreeAppId: process.env.CASHFREE_APP_ID?.trim() || '',
    cashfreeSecretKey: process.env.CASHFREE_SECRET_KEY?.trim() || '',
  };
}
