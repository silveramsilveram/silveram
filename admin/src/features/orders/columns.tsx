import { WarningOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { Tag, Tooltip } from 'antd';
import { Link } from 'react-router';
import { Money, Mono, OrderStatusTag, ShippingTag } from '@/components/primitives';
import { formatDate, formatDateTime } from '@/lib/dates';
import { CHANNEL, PAYMENT_METHOD } from '@/lib/status';
import type { OrderRow } from '@/types/api';

export const orderRef = (order: OrderRow) => (
  <Link to={`/orders/show/${order.id}`} aria-label={`Open order ${order.id}`}><Mono>{order.id}</Mono></Link>
);

export function paymentLabel(order: OrderRow) {
  const method = PAYMENT_METHOD[order.paymentMethod] ?? order.paymentMethod;
  return order.paymentChannel ? `${method} · ${CHANNEL[order.paymentChannel] ?? order.paymentChannel}` : method;
}

/** Payment state in plain words, derived from the order's status and method (never invented). */
export function paymentState(order: OrderRow): string {
  if (order.paymentMethod === 'test') return 'Test (not real money)';
  if (order.paymentMethod === 'cod') {
    if (['cancelled', 'expired'].includes(order.status)) return 'Not applicable';
    if (order.codRemittedInPaise > 0) return 'Cash remitted';
    if (order.codCollectedInPaise > 0) return 'Cash collected, not remitted';
    return 'Cash due on delivery';
  }
  switch (order.status) {
    case 'paid': case 'fulfilled': return 'Paid online';
    case 'refunded': return 'Refunded';
    case 'pending_payment': return 'Awaiting payment';
    case 'payment_review': return 'Needs review';
    default: return 'Not paid';
  }
}

/** Compact column set shared by the overview, customer and COD tables. */
export const compactOrderColumns: TableColumnsType<OrderRow> = [
  { title: 'Order', dataIndex: 'id', render: (_: unknown, order) => orderRef(order), fixed: 'left', width: 150 },
  { title: 'Placed', dataIndex: 'createdAt', render: (value: number) => <span className="num">{formatDateTime(value)}</span>, width: 170 },
  { title: 'Customer', dataIndex: 'customerName', render: (_: unknown, order) => order.customerName || order.email, ellipsis: true },
  { title: 'Total', dataIndex: 'amountInPaise', align: 'right', render: (value: number) => <Money paise={value} />, width: 120 },
  { title: 'Status', dataIndex: 'status', render: (value: string) => <OrderStatusTag status={value} />, width: 160 },
];

export const orderListColumns: TableColumnsType<OrderRow> = [
  { title: 'Order', dataIndex: 'id', fixed: 'left', width: 160, render: (_: unknown, order) => (
    <div>{orderRef(order)}{order.isTest ? <Tag style={{ marginLeft: 6 }}>Test</Tag> : null}</div>
  ) },
  { title: 'Placed', dataIndex: 'createdAt', sorter: true, width: 170, render: (value: number) => <span className="num">{formatDateTime(value)}</span> },
  { title: 'Customer', dataIndex: 'customerName', width: 200, render: (_: unknown, order) => (
    <div style={{ overflowWrap: 'anywhere' }}>
      <div>{order.customerName || '—'}</div>
      <div className="muted" style={{ fontSize: 13 }}>{order.email}{order.guest ? ' · guest' : ''}</div>
    </div>
  ) },
  { title: 'Items', dataIndex: 'itemCount', align: 'right', width: 70, render: (value: number) => <span className="num">{value}</span> },
  { title: 'Total', dataIndex: 'amountInPaise', sorter: true, align: 'right', width: 130, render: (value: number) => <Money paise={value} strong /> },
  { title: 'Payment', width: 190, render: (_: unknown, order) => (
    <div><div>{paymentLabel(order)}</div><div className="muted" style={{ fontSize: 13 }}>{paymentState(order)}</div></div>
  ) },
  { title: 'Order status', dataIndex: 'status', width: 170, render: (value: string) => <OrderStatusTag status={value} /> },
  { title: 'Shipping', dataIndex: 'shippingStatus', width: 160, render: (value: string) => <ShippingTag status={value} /> },
  { title: 'Delivery by', dataIndex: 'estimatedDeliveryAt', sorter: true, width: 150, render: (value: number | null, order) => (
    value ? (
      <span className="num">
        {formatDate(value)}
        {order.overdue ? <Tooltip title="Past the promised date and not delivered"><Tag color="red" icon={<WarningOutlined />} style={{ marginLeft: 6 }}>Late</Tag></Tooltip> : null}
      </span>
    ) : <span className="muted">Not set</span>
  ) },
  { title: 'Updated', dataIndex: 'updatedAt', sorter: true, width: 170, render: (value: number) => <span className="num muted">{formatDateTime(value)}</span> },
];
