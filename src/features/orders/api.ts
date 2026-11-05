import { apiRequest } from '@/shared/lib/api';
import type { Order } from './types';

export const fetchMyOrders = () => apiRequest<{ orders: Order[] }>('/orders').then((r) => r.orders);

export const fetchMyOrder = (id: string) =>
  apiRequest<{ order: Order }>(`/orders/${encodeURIComponent(id)}`).then((r) => r.order);

export const lookupGuestOrder = (orderId: string, email: string) =>
  apiRequest<{ order: Order }>('/orders/lookup', {
    method: 'POST',
    body: JSON.stringify({ orderId, email }),
  }).then((r) => r.order);
