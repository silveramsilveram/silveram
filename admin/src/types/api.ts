/** Contracts of the Silveram admin API (server/src/admin/*). Money is always integer paise; times are epoch ms. */
export type OrderStatus =
  | 'placed_cod' | 'pending_payment' | 'paid' | 'fulfilled' | 'cancelled' | 'expired' | 'refunded' | 'payment_review';
export type ShippingStatus = 'pending' | 'processing' | 'packed' | 'dispatched' | 'out_for_delivery' | 'delivered';
export type PaymentMethod = 'cod' | 'cashfree' | 'test';

export interface AdminMe {
  user: { id: string; email: string };
  permissions: string[];
  apiVersion: number;
  store: { timezone: string; utcOffsetMinutes: number; currency: string; lowStockThreshold: number };
  schema: { ready: boolean; missing: string[] };
}

export interface AdminStatus {
  store: { timezone: string; currency: string; lowStockThreshold: number };
  environment: 'production' | 'development';
  integrations: {
    appwrite: { configured: boolean; schemaReady: boolean; missing: string[] };
    cloudinary: { configured: boolean; rootFolder: string };
    email: { configured: boolean };
    cashfree: { enabled: boolean; mode: string };
  };
  checkout: { live: boolean; cod: boolean; testPayments: boolean };
  capabilities: { refunds: boolean; settlements: boolean; courierTracking: boolean; partialCodCollection: boolean };
  adminCount: number;
}

export interface OrderItem {
  productId: string; sku: string; name: string; quantity: number; unitPriceInPaise: number; lineTotalInPaise: number;
}
export interface ShippingAddress {
  name: string; phone: string; altPhone?: string; address: string; landmark?: string; city: string; state: string; postalCode: string; country: string;
}

export interface OrderRow {
  id: string;
  email: string;
  guest: boolean;
  status: OrderStatus;
  shippingStatus: ShippingStatus;
  paymentMethod: PaymentMethod;
  paymentChannel: string | null;
  amountInPaise: number;
  currency: string;
  itemCount: number;
  lineCount: number;
  customerName: string;
  city: string;
  state: string;
  createdAt: number;
  updatedAt: number;
  expectedDispatchAt: number | null;
  dispatchedAt: number | null;
  estimatedDeliveryAt: number | null;
  deliveredAt: number | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  codCollectedInPaise: number;
  codRemittedInPaise: number;
  overdue: boolean;
  isTest: boolean;
}
export interface OrderDetail extends OrderRow {
  items: OrderItem[];
  shipping: ShippingAddress;
  cashfreeOrderId: string | null;
  cashfreePaymentId: string | null;
  reservationExpiresAt: number | null;
  confirmationEmailSentAt: number | null;
  confirmationEmailAttempts: number;
  cancellationRecordedAt: number | null;
  timeline: TimelineEntry[];
  transactions: TransactionRow[];
}
export interface TimelineEntry {
  id: string; type: string; at: number; actor: string; actorType: string;
  fromStatus: string | null; toStatus: string | null; note: string | null; detail: Record<string, unknown> | null;
  source: 'recorded' | 'order_record';
}

export interface TransactionRow {
  id: string; orderId: string; provider: 'cashfree' | 'cod' | 'test'; type: string; status: string;
  amountInPaise: number; currency: string; channel: string | null; occurredAt: number; recordedAt: number;
  source: string; actor: string; reconciliation: string; reference: string | null;
  providerPaymentId: string | null; providerRefundId: string | null; test: boolean;
  eventKey?: string; providerOrderId?: string | null; note?: string | null; meta?: Record<string, unknown> | null;
}

export interface MediaAsset {
  publicId: string; resourceType: 'image' | 'video'; width: number; height: number; duration?: number; format?: string; alt: string; url?: string;
}
export interface ProductRow {
  id: string; sku: string; name: string; description: string; category: string; priceInPaise: number; currency: string;
  stockQuantity: number; imageUrl?: string; media: MediaAsset[]; images: MediaAsset[]; active: boolean;
  createdAt: number; updatedAt: number; deletedAt?: number | null; deleted: boolean; lowStockThreshold: number;
}
export interface PriceChange {
  id: string; productId: string; sku: string; productName: string; previousPriceInPaise: number | null;
  newPriceInPaise: number; currency: string; changedAt: number; changedBy: string; reason: string | null;
}
export interface StockRow {
  id: string; sku: string; name: string; category: string; active: boolean; stockQuantity: number;
  reservedQuantity: number; state: 'ok' | 'low' | 'out'; updatedAt: number;
}
export interface MovementRow {
  id: string; productId: string; sku: string; productName: string; type: string; delta: number;
  quantityBefore: number | null; quantityAfter: number | null; orderId: string | null; reason: string | null; actor: string; createdAt: number;
}
export interface CustomerRow {
  id: string; email: string; name: string; phoneMasked: string | null; source: 'guest' | 'account'; createdAt: number; lastOrderAt: number | null;
  orderCount: number; confirmedOrderCount: number; lifetimeOrderValueInPaise: number;
}
export interface CustomerDetail extends Omit<CustomerRow, 'phoneMasked'> {
  phone: string | null; altPhone: string | null; lastAddress: Record<string, string> | null; aggregateTruncated: boolean;
}

export interface Summary {
  ordersPlaced: number; testOrdersExcluded: number; confirmedOrders: number; grossOrderValue: number;
  onlineCollections: number; codOrderValue: number; codCollected: number; codAwaiting: number; codRemitted: number;
  codHeldBeforeRemittance: number; unitsSold: number; averageOrderValue: number | null; cancelledOrders: number;
  cancelledValue: number; expiredOrders: number; pendingPaymentOrders: number; paymentReviewOrders: number;
  refundedOrders: number; cancellationRate: number | null; expiryRate: number | null;
}
export interface SeriesPoint {
  key: string; startsAt: number; available: boolean; ordersPlaced: number | null; confirmedOrders: number | null;
  grossOrderValue: number | null; onlineCollections: number | null; codOrderValue: number | null; unitsSold: number | null;
}
export interface ProductPerformance { productId: string; sku: string; name: string; units: number; orders: number; grossValue: number; share: number }
export interface PaymentMixRow {
  key: string; method: string; channel: string | null; orders: number; confirmedOrders: number; grossOrderValue: number; excludedFromRevenue: boolean;
}
export interface FulfilmentStats {
  awaitingDispatch: number; inTransit: number; delivered: number; overdue: number; avgHoursToDispatch: number | null;
  avgHoursToDelivery: number | null; dispatchSample: number; deliverySample: number; onTimeRate: number | null; onTimeSample: number;
}
export interface AnalyticsMeta {
  range: { from: string; to: string; fromMs: number; toMs: number; timezone: string };
  coverage: { ordersSince: number | null; ledgerSince: number | null; ordersAnalysed: number; truncated: boolean };
  caveats: string[];
  definitions?: Record<string, string>;
}
export interface DashboardSummary extends AnalyticsMeta {
  kpis: Summary & {
    refunds: number | null; netCollected: number | null; newCustomers: number; customersWithOrders: number;
    repeatCustomers: number; repeatRate: number | null; activeLowStock: number;
  };
  groupBy: 'day' | 'week' | 'month';
  series: SeriesPoint[];
  pipeline: { status: { status: string; count: number }[]; shipping: { status: string; count: number }[] };
  paymentMix: PaymentMixRow[];
  topProducts: ProductPerformance[];
  fulfilment: FulfilmentStats;
  lowStock: { id: string; sku: string; name: string; stockQuantity: number }[];
  lowStockThreshold: number;
  overdueOrders: OrderRow[];
  overdueTotal: number;
  upcomingDeliveries: OrderRow[];
  recentOrders: OrderRow[];
}

export interface Paged<T> { data: T[]; total: number; page: number; limit: number }
