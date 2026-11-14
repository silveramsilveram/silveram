import { request } from './apiClient';
import type {
  AdminMe, AdminStatus, AnalyticsMeta, CustomerDetail, DashboardSummary, FulfilmentStats, MediaAsset, OrderDetail,
  OrderRow, PaymentMixRow, ProductPerformance, ProductRow, SeriesPoint, Summary, TransactionRow,
} from '@/types/api';

/** The admin API this app was built for. A different number means frontend and backend are out of step. */
export const EXPECTED_API_VERSION = 1;

export const authApi = {
  requestOtp: (email: string) => request<{ success: true }>('/auth/otp', { method: 'POST', body: { email } }),
  verifyOtp: (email: string, code: string) =>
    request<{ user: { id: string; email: string } }>('/auth/verify', { method: 'POST', body: { email, code, mode: 'signin' } }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: (signal?: AbortSignal) => request<AdminMe>('/admin/me', { signal }),
};

export interface Range { from: string; to: string }

export const adminApi = {
  status: () => request<AdminStatus>('/admin/status'),
  dashboard: (range: Range, signal?: AbortSignal) => request<DashboardSummary>('/admin/dashboard/summary', { query: { ...range }, signal }),
  sales: (range: Range & { groupBy?: string }, signal?: AbortSignal) =>
    request<AnalyticsMeta & { groupBy: string; summary: Summary & { refunds: number | null; netCollected: number | null }; series: SeriesPoint[] }>(
      '/admin/analytics/sales', { query: { ...range }, signal }),
  orderAnalytics: (range: Range, signal?: AbortSignal) =>
    request<AnalyticsMeta & { summary: Summary; status: { status: string; count: number }[]; shipping: { status: string; count: number }[]; paymentMix: PaymentMixRow[] }>(
      '/admin/analytics/orders', { query: { ...range }, signal }),
  productAnalytics: (range: Range, signal?: AbortSignal) =>
    request<AnalyticsMeta & { topProducts: ProductPerformance[]; slowMoving: { id: string; sku: string; name: string; stockQuantity: number }[]; slowMovingNote: string }>(
      '/admin/analytics/products', { query: { ...range, limit: 20 }, signal }),
  customerAnalytics: (range: Range, signal?: AbortSignal) =>
    request<AnalyticsMeta & { newCustomers: number; customersWithOrders: number; repeatCustomers: number; repeatRate: number | null }>(
      '/admin/analytics/customers', { query: { ...range }, signal }),
  fulfilmentAnalytics: (range: Range, signal?: AbortSignal) =>
    request<AnalyticsMeta & FulfilmentStats & { summary: Summary }>('/admin/analytics/fulfilment', { query: { ...range }, signal }),

  order: (id: string) => request<{ order: OrderRow; timeline: OrderDetail['timeline']; transactions: TransactionRow[] }>(`/admin/orders/${id}`),
  cancelOrder: (id: string, note?: string) => request<{ success: true }>(`/admin/orders/${id}/cancel`, { method: 'POST', body: note ? { note } : {} }),
  markFulfilled: (id: string) => request<{ order: OrderDetail }>(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status: 'fulfilled' } }),
  updateFulfilment: (id: string, body: Record<string, unknown>) =>
    request<{ order: OrderDetail }>(`/admin/orders/${id}/fulfilment`, { method: 'PATCH', body }),
  addShippingNote: (id: string, note: string) => request<{ success: true }>(`/admin/orders/${id}/shipping-events`, { method: 'POST', body: { note } }),
  recordCodCollection: (id: string, body: { at?: number; reference?: string; note?: string; ifUpdatedAt?: number }) =>
    request<{ order: OrderDetail }>(`/admin/orders/${id}/cod-collection`, { method: 'POST', body }),
  recordCodRemittance: (id: string, body: { at?: number; reference?: string; note?: string; ifUpdatedAt?: number }) =>
    request<{ order: OrderDetail }>(`/admin/orders/${id}/cod-remittance`, { method: 'POST', body }),
  codOutstanding: () =>
    request<{
      awaitingCollection: { totalInPaise: number; count: number; orders: OrderRow[] };
      heldNotRemitted: { totalInPaise: number; count: number; orders: OrderRow[] };
      truncated: boolean; note: string;
    }>('/admin/cod/outstanding'),

  transaction: (id: string) => request<{ transaction: TransactionRow; order: OrderRow | null }>(`/admin/transactions/${id}`),

  inventorySummary: () =>
    request<{ products: number; activeProducts: number; outOfStock: number; lowStock: number; lowStockThreshold: number }>('/admin/inventory/summary'),
  adjustStock: (productId: string, body: { requestId: string; type: string; mode: 'delta' | 'set'; value: number; reason: string }) =>
    request<unknown>(`/admin/inventory/${productId}/adjust`, { method: 'POST', body }),

  customer: (id: string) => request<{ customer: CustomerDetail }>(`/admin/customers/${id}`),

  product: (id: string) => request<{ product: ProductRow }>(`/admin/products/${id}`),
  priceHistory: (id: string) =>
    request<{ data: import('@/types/api').PriceChange[]; total: number; trackingStartedAt: number | null }>(`/admin/products/${id}/price-history`, { query: { limit: 50 } }),
  createProduct: (body: Record<string, unknown>) => request<{ product: ProductRow }>('/products/admin', { method: 'POST', body }),
  updateProduct: (id: string, body: Record<string, unknown>) => request<{ product: ProductRow }>(`/products/admin/${id}`, { method: 'PATCH', body }),
  deactivateProduct: (id: string) => request<void>(`/products/admin/${id}`, { method: 'DELETE' }),
};

export interface CloudinarySignature {
  upload: { cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string; resourceType?: string; uploadUrl?: string; [key: string]: unknown };
}
export const uploadApi = {
  sign: (sku: string, resourceType: 'image' | 'video') =>
    request<CloudinarySignature>('/uploads/sign', { method: 'POST', body: { target: 'product', sku, resourceType } }),
};
export type { MediaAsset };
