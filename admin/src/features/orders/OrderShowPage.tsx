import { ArrowLeftOutlined, CopyOutlined } from '@ant-design/icons';
import { useOne } from '@refinedev/core';
import { App, Button, Descriptions, Table, Tag, Tooltip } from 'antd';
import { Link, useParams } from 'react-router';
import { ErrorState, LoadingBlock, Money, Mono, OrderStatusTag, PageHeader, ReconciliationTag, ShippingTag, TxStatusTag } from '@/components/primitives';
import { Timeline } from '@/components/Timeline';
import { formatDate, formatDateTime } from '@/lib/dates';
import { TX_TYPE } from '@/lib/status';
import type { OrderDetail, TransactionRow } from '@/types/api';
import { paymentLabel, paymentState } from './columns';
import { CancelOrderButton, CodPanel, FulfilmentPanel, ShippingNote } from './OrderPanels';

function CopyButton({ text, label }: { text: string; label: string }) {
  const { message } = App.useApp();
  return (
    <Tooltip title={`Copy ${label}`}>
      <Button size="small" type="text" aria-label={`Copy ${label}`} icon={<CopyOutlined />}
        onClick={() => navigator.clipboard?.writeText(text).then(() => message.success(`${label} copied`), () => message.error('Copy was blocked by the browser'))} />
    </Tooltip>
  );
}

export default function OrderShowPage() {
  const { id = '' } = useParams();
  const { query, result } = useOne<OrderDetail>({ resource: 'orders', id });
  const order = result as OrderDetail | undefined;

  if (query.isLoading) return <LoadingBlock rows={10} />;
  if (query.isError || !order) return <ErrorState error={query.error} onRetry={() => query.refetch()} title="Could not load this order" />;

  const address = [order.shipping.address, order.shipping.landmark, `${order.shipping.city}, ${order.shipping.state} ${order.shipping.postalCode}`, order.shipping.country].filter(Boolean).join('\n');

  return (
    <>
      <PageHeader
        title="Order"
        description={<><Link to="/orders"><ArrowLeftOutlined /> All orders</Link> · placed {formatDateTime(order.createdAt)}</>}
        actions={<CancelOrderButton order={order} />}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <Mono>{order.id}</Mono><CopyButton text={order.id} label="order reference" />
        <OrderStatusTag status={order.status} /><ShippingTag status={order.shippingStatus} />
        {order.isTest ? <Tag>Test payment: not real money</Tag> : null}
        {order.overdue ? <Tag color="red">Past promised delivery date</Tag> : null}
      </div>

      <div className="sv-grid sv-split" style={{ alignItems: 'start' }}>
        <div className="sv-grid">
          <section className="sv-surface" aria-label="Items">
            <h2>Items (prices as purchased)</h2>
            <Table size="small" rowKey="productId" pagination={false} dataSource={order.items} scroll={{ x: 520 }}
              columns={[
                { title: 'Product', dataIndex: 'name', render: (_: unknown, item) => <div><div>{item.name}</div><Mono>{item.sku}</Mono></div> },
                { title: 'Unit price', dataIndex: 'unitPriceInPaise', align: 'right', render: (value: number) => <Money paise={value} /> },
                { title: 'Qty', dataIndex: 'quantity', align: 'right', width: 70 },
                { title: 'Line total', dataIndex: 'lineTotalInPaise', align: 'right', render: (value: number) => <Money paise={value} /> },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}><strong>Order total</strong></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right"><Money paise={order.amountInPaise} strong /></Table.Summary.Cell>
                </Table.Summary.Row>
              )} />
            <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>Silveram stores one order total. Shipping, discounts and tax are not recorded separately, so none are shown.</p>
          </section>

          <section className="sv-surface" aria-label="Timeline">
            <h2>Timeline</h2>
            <Timeline entries={order.timeline} />
            <div style={{ marginTop: 16 }}><ShippingNote orderId={order.id} /></div>
          </section>

          <section className="sv-surface flush" aria-label="Transactions">
            <h2 style={{ padding: '16px 16px 0' }}>Payment ledger for this order</h2>
            <Table<TransactionRow> size="small" rowKey="id" pagination={false} dataSource={order.transactions} scroll={{ x: 720 }}
              locale={{ emptyText: 'No ledger entries. Entries are recorded from when ledger tracking began.' }}
              columns={[
                { title: 'When', dataIndex: 'occurredAt', render: (value: number) => <span className="num">{formatDateTime(value)}</span> },
                { title: 'Type', dataIndex: 'type', render: (value: string) => TX_TYPE[value] ?? value },
                { title: 'Status', dataIndex: 'status', render: (value: string) => <TxStatusTag status={value} /> },
                { title: 'Amount', dataIndex: 'amountInPaise', align: 'right', render: (value: number) => <Money paise={value} /> },
                { title: 'Verified by', dataIndex: 'reconciliation', render: (value: string) => <ReconciliationTag value={value} /> },
                { title: '', render: (_: unknown, row) => <Link to={`/transactions/show/${row.id}`}>Details</Link>, width: 80 },
              ]} />
          </section>
        </div>

        <div className="sv-grid">
          <section className="sv-surface" aria-label="Customer and delivery">
            <h2>Customer & delivery</h2>
            <Descriptions size="small" column={1} colon={false} items={[
              { key: 'n', label: 'Name', children: order.shipping.name },
              { key: 'e', label: 'E-mail', children: <span style={{ overflowWrap: 'anywhere' }}>{order.email}<CopyButton text={order.email} label="e-mail" /></span> },
              { key: 'p', label: 'Phone', children: <span className="num">{order.shipping.phone}<CopyButton text={order.shipping.phone} label="phone number" /></span> },
              ...(order.shipping.altPhone ? [{ key: 'a', label: 'Alternate phone', children: <span className="num">{order.shipping.altPhone}</span> }] : []),
              { key: 'ad', label: 'Address', children: <span style={{ whiteSpace: 'pre-line' }}>{address}<CopyButton text={address.replace(/\n/g, ', ')} label="address" /></span> },
              { key: 'g', label: 'Customer type', children: order.guest ? 'Guest checkout' : 'Account holder' },
            ]} />
          </section>

          <section className="sv-surface" aria-label="Payment">
            <h2>Payment</h2>
            <Descriptions size="small" column={1} colon={false} items={[
              { key: 'm', label: 'Method', children: paymentLabel(order) },
              { key: 's', label: 'State', children: paymentState(order) },
              ...(order.cashfreeOrderId ? [{ key: 'co', label: 'Cashfree order', children: <Mono>{order.cashfreeOrderId}</Mono> }] : []),
              ...(order.cashfreePaymentId ? [{ key: 'cp', label: 'Cashfree payment', children: <Mono>{order.cashfreePaymentId}</Mono> }] : []),
              ...(order.reservationExpiresAt && order.status === 'pending_payment' ? [{ key: 'r', label: 'Stock held until', children: formatDateTime(order.reservationExpiresAt) }] : []),
              { key: 'em', label: 'Confirmation e-mail', children: order.confirmationEmailSentAt ? `Sent ${formatDateTime(order.confirmationEmailSentAt)}` : `Not sent (${order.confirmationEmailAttempts} attempt${order.confirmationEmailAttempts === 1 ? '' : 's'})` },
            ]} />
          </section>

          {order.paymentMethod === 'cod' ? <section className="sv-surface" aria-label="Cash on delivery"><h2>Cash on delivery</h2><CodPanel order={order} /></section> : null}

          <section className="sv-surface" aria-label="Shipping">
            <h2>Shipping & delivery dates</h2>
            <Descriptions size="small" column={1} colon={false} style={{ marginBottom: 12 }} items={[
              { key: 'ed', label: 'Expected dispatch', children: formatDate(order.expectedDispatchAt) },
              { key: 'dl', label: 'Estimated delivery', children: formatDate(order.estimatedDeliveryAt) },
              ...(order.trackingNumber ? [{ key: 't', label: 'Tracking (manual)', children: order.trackingUrl ? <a href={order.trackingUrl} target="_blank" rel="noreferrer noopener">{order.carrier ? `${order.carrier} · ` : ''}{order.trackingNumber}</a> : `${order.carrier ?? ''} ${order.trackingNumber}` }] : []),
            ]} />
            <FulfilmentPanel key={order.updatedAt} order={order} />
          </section>
        </div>
      </div>
    </>
  );
}
