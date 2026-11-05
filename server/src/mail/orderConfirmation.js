import { createDocument, deleteDocument, getDocument, listDocuments, Query, updateDocument } from '../platform/appwrite.js';
import { getMailer } from './transport.js';
import { orderConfirmationEmail } from './templates.js';

const CONFIRMABLE = ['paid', 'placed_cod'];
const CLAIM_TTL_MS = 5 * 60 * 1000;

// Sends the purchase acknowledgement at most once per order, even if the browser verify call,
// the Razorpay webhook and the retry sweep all fire together. The claim is an atomic update;
// a failed send releases it so the sweep (or the next trigger) can try again.
export async function sendOrderConfirmation(config, orderId) {
  const mailer = getMailer(config);
  if (!mailer) return false;
  const now = new Date();
  const order = await getDocument('orders', orderId);
  if (!order || !CONFIRMABLE.includes(order.status) || order.confirmationEmailSentAt) return false;
  const claimId = orderId;
  try {
    await createDocument('emailClaims', claimId, { orderId, claimedAt: now.getTime() });
  } catch (error) {
    if (error?.code === 409) {
      const claim = await getDocument('emailClaims', claimId);
      if (!claim || claim.claimedAt >= now.getTime() - CLAIM_TTL_MS) return false;
      await deleteDocument('emailClaims', claimId);
      await createDocument('emailClaims', claimId, { orderId, claimedAt: now.getTime() });
    } else {
      throw error;
    }
  }
  let items;
  let shipping;
  try {
    items = JSON.parse(order.itemsJson);
    shipping = JSON.parse(order.shippingJson);
  } catch (error) {
    await deleteDocument('emailClaims', claimId);
    throw new Error(`Order ${orderId} contains invalid email data: ${error.message}`);
  }

  try {
    const message = orderConfirmationEmail(config, {
      ...order,
      _id: order.$id,
      items,
      shipping,
    });
    await mailer.sendMail({
      from: config.smtpFrom,
      to: order.email,
      ...(config.supportEmail && { replyTo: config.supportEmail }),
      ...message,
      headers: { 'X-MJ-CustomID': `order-${order.$id}`.slice(0, 120), 'X-MJ-EventPayload': order.$id },
    });
    await updateDocument('orders', order.$id, {
      confirmationEmailSentAt: Date.now(),
      confirmationEmailAttempts: (order.confirmationEmailAttempts || 0) + 1,
    });
    await updateDocument('emailClaims', claimId, { sentAt: Date.now() });
    return true;
  } catch (error) {
    await deleteDocument('emailClaims', claimId);
    console.error('Order confirmation email failed:', order.$id, error?.message || 'Unknown error');
    return false;
  }
}

// Serverless platforms freeze a function once the response is sent, so a fire-and-forget e-mail
// can be lost. Await the send (bounded) before replying; failures are logged and retried by the sweeper.
export async function sendOrderConfirmationBestEffort(config, orderId, timeoutMs = 8000) {
  let timer;
  try {
    await Promise.race([
      sendOrderConfirmation(config, orderId),
      new Promise((resolve) => { timer = setTimeout(resolve, timeoutMs); }),
    ]);
  } catch (error) {
    console.error('Order confirmation email failed:', orderId, error?.message || 'Unknown error');
  } finally {
    clearTimeout(timer);
  }
}

// Never let email trouble affect the checkout response.
export function queueOrderConfirmation(config, orderId) {
  void sendOrderConfirmation(config, orderId).catch((error) => {
    console.error('Order confirmation email failed:', orderId, error?.message || 'Unknown error');
  });
}

// Safety net: re-sends confirmations that failed (SMTP outage) or were lost to a restart.
export function startConfirmationRetrySweeper(config) {
  if (!getMailer(config)) return;
  const timer = setInterval(async () => {
    try {
      const candidates = [];
      for (const status of CONFIRMABLE) {
        const rows = await listDocuments('orders', [
          Query.equal('status', status),
          Query.lessThan('createdAt', Date.now() - 60_000),
          Query.greaterThan('createdAt', Date.now() - 3 * 24 * 60 * 60 * 1000),
          Query.limit(20),
        ]);
        candidates.push(...rows.filter((row) => !row.confirmationEmailSentAt && (row.confirmationEmailAttempts || 0) < 8));
      }
      for (const order of candidates.slice(0, 20)) await sendOrderConfirmation(config, order.$id);
    } catch (error) {
      console.error('Confirmation email sweep failed:', error?.message || 'Unknown error');
    }
  }, 120_000);
  timer.unref();
}
