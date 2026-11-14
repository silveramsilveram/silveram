export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface StatusMeta { label: string; tone: Tone; hint?: string }

/** Order `status` (commerce/payment state). Text label always shown; colour only reinforces it. */
export const ORDER_STATUS: Record<string, StatusMeta> = {
  placed_cod: { label: 'COD accepted', tone: 'info', hint: 'Cash on delivery order accepted; cash not yet collected.' },
  pending_payment: { label: 'Awaiting payment', tone: 'warning', hint: 'Stock is held while the customer pays; not revenue.' },
  paid: { label: 'Paid', tone: 'success', hint: 'Payment confirmed by the payment provider.' },
  fulfilled: { label: 'Dispatched', tone: 'success', hint: 'Marked fulfilled: the order has left the shop.' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'neutral', hint: 'Payment window passed; stock was released.' },
  refunded: { label: 'Refunded', tone: 'danger', hint: 'Cashfree reported a full refund.' },
  payment_review: { label: 'Payment review', tone: 'danger', hint: 'Money was taken for an order that had expired or did not match. Needs a human.' },
};

export const SHIPPING_STATUS: Record<string, StatusMeta> = {
  pending: { label: 'Not started', tone: 'neutral' },
  processing: { label: 'Processing', tone: 'info' },
  packed: { label: 'Packed', tone: 'info' },
  dispatched: { label: 'Dispatched', tone: 'warning' },
  out_for_delivery: { label: 'Out for delivery', tone: 'warning' },
  delivered: { label: 'Delivered', tone: 'success' },
};

export const PAYMENT_METHOD: Record<string, string> = { cod: 'Cash on delivery', cashfree: 'Cashfree', test: 'Test payment' };
export const CHANNEL: Record<string, string> = { upi: 'UPI', card: 'Card' };

export const TX_TYPE: Record<string, string> = {
  payment: 'Payment collected',
  payment_attempt: 'Payment attempt',
  cod_collection: 'COD cash collected',
  cod_remittance: 'COD cash remitted',
  refund: 'Refund',
};
export const TX_STATUS: Record<string, StatusMeta> = {
  success: { label: 'Succeeded', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
  pending: { label: 'Pending', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  refunded: { label: 'Refunded', tone: 'danger' },
};
export const RECONCILIATION: Record<string, StatusMeta> = {
  provider_verified: { label: 'Provider verified', tone: 'success', hint: 'Confirmed by a signed webhook or a server-side lookup with the provider.' },
  provider_reported: { label: 'Provider reported', tone: 'info', hint: 'Reported by the provider (for example a failed attempt).' },
  operator_recorded: { label: 'Operator recorded', tone: 'warning', hint: 'Entered by a Silveram operator. Not bank-verified.' },
  needs_review: { label: 'Needs review', tone: 'danger', hint: 'Money moved but the order did not match. Investigate in the Cashfree dashboard.' },
  test_only: { label: 'Test only', tone: 'neutral', hint: 'Simulated test payment. Never counted as real money.' },
};

export const MOVEMENT_TYPE: Record<string, string> = {
  initial_stock: 'Opening stock',
  restock: 'Restock',
  manual_adjustment: 'Manual adjustment',
  correction: 'Stock-take correction',
  order_reservation: 'Order placed',
  reservation_release: 'Reservation released',
  cancellation_restore: 'Cancellation restock',
};

export const TIMELINE_LABEL: Record<string, string> = {
  order_placed: 'Order placed',
  confirmation_email_sent: 'Confirmation e-mail sent',
  order_cancelled: 'Order cancelled (stock restored)',
  status_changed: 'Status changed',
  shipping_status_changed: 'Shipping status changed',
  shipping_details_updated: 'Shipping details updated',
  shipping_note: 'Shipping note',
  cod_collected: 'COD cash recorded as collected',
  cod_remitted: 'COD cash recorded as remitted',
};

export const CATEGORIES = ['ring', 'necklace', 'earring', 'bracelet', 'bangle', 'frame', 'uncategorised'] as const;
export const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
