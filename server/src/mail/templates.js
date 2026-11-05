const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => escapeMap[char]);
}

export function formatInr(paise) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
}

// Strip CR/LF so customer-supplied text can never inject headers.
const oneLine = (value) => String(value).replace(/[\r\n]+/g, ' ').trim();

export function orderConfirmationEmail(config, order) {
  const { storeName } = config;
  const reference = order._id;
  const cod = order.paymentMethod === 'cod';
  const name = oneLine(order.shipping.name);
  const address = [
    order.shipping.address,
    `${order.shipping.city}, ${order.shipping.state} ${order.shipping.postalCode}`,
    'India',
  ];
  const paymentLine = cod
    ? `Cash on delivery - please keep ${formatInr(order.amountInPaise)} ready.`
    : `Paid online${order.razorpayPaymentId ? ` (transaction ${order.razorpayPaymentId})` : ''}.`;
  const help = config.supportEmail ? ` Questions? Reply to this email or write to ${config.supportEmail}.` : ' Questions? Just reply to this email.';
  const ordersUrl = config.storeUrl ? `${config.storeUrl}/` : '';

  const subject = `${storeName} order confirmed - #${reference}`;

  const text = [
    `Hi ${name},`,
    '',
    `Thank you for your order. We have received it${cod ? '' : ' and your payment'}.`,
    '',
    `Order reference: ${reference}`,
    `Placed on: ${new Date(order.createdAt).toISOString().slice(0, 10)}`,
    '',
    ...order.items.map((item) => `${item.quantity} x ${item.name} (${item.sku}) - ${formatInr(item.lineTotalInPaise)}`),
    '',
    `Total: ${formatInr(order.amountInPaise)}`,
    `Payment: ${paymentLine}`,
    '',
    'Delivering to:',
    name,
    ...address,
    `Phone: ${order.shipping.phone}`,
    '',
    `${help.trim()}`,
    ...(ordersUrl ? ['', ordersUrl] : []),
    '',
    `- ${storeName}`,
  ].join('\n');

  const rows = order.items.map((item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(item.name)}<br><span style="color:#888;font-size:12px">${escapeHtml(item.sku)} &times; ${item.quantity}</span></td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${escapeHtml(formatInr(item.lineTotalInPaise))}</td>
        </tr>`).join('');

  const html = `<!doctype html>
<html><body style="margin:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#222">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#fff;padding:28px;border-radius:6px">
      <h1 style="margin:0 0 4px;font-size:20px">${escapeHtml(storeName)}</h1>
      <p style="margin:0 0 20px;color:#555">Order confirmed</p>
      <p>Hi ${escapeHtml(name)},</p>
      <p>Thank you for your order. We have received it${cod ? '' : ' and your payment'}.</p>
      <p style="margin:16px 0"><strong>Order reference:</strong> ${escapeHtml(reference)}</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px">${rows}
        <tr>
          <td style="padding:12px 0;font-weight:bold">Total</td>
          <td style="padding:12px 0;text-align:right;font-weight:bold">${escapeHtml(formatInr(order.amountInPaise))}</td>
        </tr>
      </table>
      <p style="font-size:14px"><strong>Payment:</strong> ${escapeHtml(paymentLine)}</p>
      <p style="font-size:14px"><strong>Delivering to:</strong><br>${escapeHtml(name)}<br>${address.map(escapeHtml).join('<br>')}<br>Phone: ${escapeHtml(order.shipping.phone)}</p>
      <p style="font-size:14px;color:#555">${escapeHtml(help.trim())}</p>
    </div>
    <p style="text-align:center;color:#999;font-size:12px">This is a transactional email about your order.</p>
  </div>
</body></html>`;

  return { subject, text, html };
}
