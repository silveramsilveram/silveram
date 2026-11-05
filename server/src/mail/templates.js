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
    : order.paymentMethod === 'test'
    ? 'TEST ORDER - simulated payment, no money was charged.'
    : `Paid online${order.razorpayPaymentId ? ` (transaction ${order.razorpayPaymentId})` : ''}.`;
  const help = config.supportEmail ? ` Questions? Reply to this email or write to ${config.supportEmail}.` : ' Questions? Just reply to this email.';
  const ordersUrl = config.storeUrl ? `${config.storeUrl}/#/order/${reference}` : '';

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

// "Your bag is saved" e-mail, sent when a customer (guest or signed in) has items in their bag.
export function cartSavedEmail(config, { name, lines }) {
  const { storeName } = config;
  const greeting = name ? `Hi ${oneLine(name)},` : 'Hi,';
  const total = lines.reduce((sum, line) => sum + line.unitPriceInPaise * line.quantity, 0);
  const link = config.storeUrl ? `${config.storeUrl}/#/cart` : '';
  const subject = `Your ${storeName} bag is saved`;

  const text = [
    greeting,
    '',
    'You left these items in your bag. We have saved them for you:',
    '',
    ...lines.map((line) => `${line.quantity} x ${line.name} - ${formatInr(line.unitPriceInPaise * line.quantity)}`),
    '',
    `Total: ${formatInr(total)}`,
    ...(link ? ['', `Return to your bag: ${link}`] : []),
    '',
    'Prices and availability are confirmed when you place your order. If this was not you, you can ignore this email.',
    '',
    `- ${storeName}`,
  ].join('\n');

  const rows = lines.map((line) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(line.name)}<br><span style="color:#888;font-size:12px">Qty ${line.quantity}</span></td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${escapeHtml(formatInr(line.unitPriceInPaise * line.quantity))}</td>
        </tr>`).join('');

  const html = `<!doctype html>
<html><body style="margin:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#222">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#fff;padding:28px;border-radius:6px">
      <h1 style="margin:0 0 4px;font-size:20px">${escapeHtml(storeName)}</h1>
      <p style="margin:0 0 20px;color:#555">Your bag is saved</p>
      <p>${escapeHtml(greeting)}</p>
      <p>You left these items in your bag. We have saved them for you.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px">${rows}
        <tr>
          <td style="padding:12px 0;font-weight:bold">Total</td>
          <td style="padding:12px 0;text-align:right;font-weight:bold">${escapeHtml(formatInr(total))}</td>
        </tr>
      </table>
      ${link ? `<p style="margin:20px 0"><a href="${escapeHtml(link)}" style="background:#182d49;color:#fff;padding:12px 22px;text-decoration:none;border-radius:2px;display:inline-block">Return to your bag</a></p>` : ''}
      <p style="font-size:13px;color:#555">Prices and availability are confirmed when you place your order. If this was not you, you can ignore this email.</p>
    </div>
  </div>
</body></html>`;

  return { subject, text, html };
}
