export type OrderStatus =
  | 'placed_cod'
  | 'pending_payment'
  | 'paid'
  | 'fulfilled'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'payment_review';

export type PaymentMethod = 'razorpay' | 'cod' | 'test';

export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPriceInPaise: number;
  lineTotalInPaise: number;
}

export interface OrderShipping {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/** An order as returned to its owner by the API. */
export interface Order {
  id: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  amountInPaise: number;
  currency: string;
  createdAt: number;
  email: string;
  guest: boolean;
  items: OrderItem[];
  shipping: OrderShipping;
}

export const STATUS_LABEL: Record<OrderStatus, { label: string; detail: string }> = {
  placed_cod: { label: 'Order placed', detail: 'Pay in cash when your order arrives. We will confirm dispatch details with you.' },
  pending_payment: { label: 'Awaiting payment', detail: 'Your items are reserved while payment is completed.' },
  paid: { label: 'Paid', detail: 'Payment received. We will confirm dispatch details with you.' },
  fulfilled: { label: 'Fulfilled', detail: 'This order has been dispatched.' },
  cancelled: { label: 'Cancelled', detail: 'This order was cancelled.' },
  expired: { label: 'Expired', detail: 'Payment was not completed in time, so the reservation was released.' },
  refunded: { label: 'Refunded', detail: 'This order was refunded.' },
  payment_review: { label: 'Under review', detail: 'We are reviewing a payment on this order and will contact you.' },
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cod: 'Cash on delivery',
  razorpay: 'Paid online',
  test: 'Test payment (no money charged)',
};
