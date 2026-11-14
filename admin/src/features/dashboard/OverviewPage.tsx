import { Alert, Collapse, Table } from 'antd';
import { Link } from 'react-router';
import { BarChart } from '@/components/charts/BarChart';
import { HBarList } from '@/components/charts/HBarList';
import { DateRangeControl, useDateRange } from '@/components/DateRangeControl';
import { Caveats, ErrorState, KpiTile, LoadingBlock, Money, OrderStatusTag, PageHeader } from '@/components/primitives';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatPaise, formatPaiseCompact } from '@/lib/money';
import { CHANNEL, ORDER_STATUS, PAYMENT_METHOD, SHIPPING_STATUS } from '@/lib/status';
import { adminApi } from '@/services/api';
import { useApiQuery } from '@/services/useApiQuery';
import type { DashboardSummary, OrderRow } from '@/types/api';
import { compactOrderColumns, orderRef } from '../orders/columns';

const NAVY = '#182d49';
const CHAMPAGNE = '#a8895a';
const pct = (value: number | null) => (value === null ? '—' : `${Math.round(value * 1000) / 10}%`);

function seriesLabel(key: string, groupBy: DashboardSummary['groupBy']) {
  if (groupBy === 'month') {
    const [year, month] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  }
  const [, month, day] = key.split('-').map(Number);
  return `${day} ${new Date(Date.UTC(2000, month - 1, 1)).toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' })}`;
}

const dueColumns = [
  { title: 'Order', render: (_: unknown, order: OrderRow) => orderRef(order), width: 150 },
  { title: 'Customer', render: (_: unknown, order: OrderRow) => order.customerName || order.email, ellipsis: true },
  { title: 'Delivery by', dataIndex: 'estimatedDeliveryAt', render: (value: number) => <span className="num">{formatDate(value)}</span>, width: 130 },
  { title: 'Total', dataIndex: 'amountInPaise', align: 'right' as const, render: (value: number) => <Money paise={value} />, width: 120 },
];

export default function OverviewPage() {
  const dateRange = useDateRange();
  const { range } = dateRange;
  const query = useApiQuery(['dashboard', range.from, range.to], (signal) => adminApi.dashboard(range, signal));
  const data = query.data;

  return (
    <>
      <PageHeader
        title="Overview"
        description="Orders, money and fulfilment for the period you choose. Every figure comes from stored orders and ledger entries."
        actions={<DateRangeControl {...dateRange} />}
      />
      {query.isLoading ? <LoadingBlock rows={10} /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} title="Could not load the overview" /> : null}
      {data ? <Body data={data} stale={query.isFetching} /> : null}
    </>
  );
}

function Body({ data, stale }: { data: DashboardSummary; stale: boolean }) {
  const k = data.kpis;
  const chartData = data.series.map((point) => ({
    key: point.key,
    label: seriesLabel(point.key, data.groupBy),
    values: [point.grossOrderValue, point.onlineCollections],
  }));

  return (
    <div style={{ display: 'grid', gap: 16, opacity: stale ? 0.7 : 1, transition: 'opacity .2s' }} aria-busy={stale}>
      <Caveats notes={data.caveats} />
      {data.overdueTotal > 0 ? (
        <Alert type="warning" showIcon message={`${data.overdueTotal} order${data.overdueTotal === 1 ? ' is' : 's are'} past the promised delivery date`}
          action={<Link to="/orders?overdue=true">Review</Link>} />
      ) : null}
      {k.paymentReviewOrders > 0 ? (
        <Alert type="error" showIcon message={`${k.paymentReviewOrders} order${k.paymentReviewOrders === 1 ? '' : 's'} need a payment review`}
          description="Money was taken for an expired or mismatched order. Check the Cashfree dashboard."
          action={<Link to="/orders?status=payment_review">Open</Link>} />
      ) : null}

      <section aria-label="Key figures" className="sv-grid kpis">
        <KpiTile label="Orders placed" value={k.ordersPlaced.toLocaleString('en-IN')} help={data.definitions?.ordersPlaced}
          sub={k.testOrdersExcluded ? `${k.testOrdersExcluded} test order${k.testOrdersExcluded === 1 ? '' : 's'} excluded` : `${k.confirmedOrders} confirmed`} />
        <KpiTile label="Gross order value" value={formatPaise(k.grossOrderValue)} help={data.definitions?.grossOrderValue} sub="Confirmed orders, not cash received" />
        <KpiTile label="Confirmed online collections" value={formatPaise(k.onlineCollections)} help={data.definitions?.onlineCollections} sub="Cashfree, server-confirmed" />
        <KpiTile label="COD awaiting collection" value={formatPaise(k.codAwaiting)} help={data.definitions?.codAwaiting} sub={`COD order value ${formatPaise(k.codOrderValue)}`} />
        <KpiTile label="COD cash collected" value={formatPaise(k.codCollected)} help={data.definitions?.codCollected} sub={`${formatPaise(k.codRemitted)} remitted`} />
        <KpiTile label="Refunds (recorded)" value={k.refunds === null ? 'Unavailable' : formatPaise(k.refunds)} help={data.definitions?.refunds} sub={k.refundedOrders ? `${k.refundedOrders} order(s) labelled refunded` : undefined} />
        <KpiTile label="Net collected (recorded)" value={k.netCollected === null ? 'Unavailable' : formatPaise(k.netCollected)} help={data.definitions?.netCollected} sub="Online + COD cash − refunds" />
        <KpiTile label="Average order value" value={k.averageOrderValue === null ? '—' : formatPaise(k.averageOrderValue)} help={data.definitions?.averageOrderValue} sub="Confirmed orders only" />
        <KpiTile label="Units sold" value={k.unitsSold.toLocaleString('en-IN')} help={data.definitions?.unitsSold} />
        <KpiTile label="New customers" value={k.newCustomers.toLocaleString('en-IN')} sub={`${k.customersWithOrders} bought in this period`} />
        <KpiTile label="Repeat purchase rate" value={pct(k.repeatRate)} help={data.definitions?.repeatRate} sub={k.customersWithOrders ? `${k.repeatCustomers} of ${k.customersWithOrders} customers` : 'No orders yet'} />
        <KpiTile label="Awaiting dispatch" value={data.fulfilment.awaitingDispatch} sub={`${data.fulfilment.inTransit} in transit · ${data.fulfilment.delivered} delivered`} />
        <KpiTile label="Cancellation rate" value={pct(k.cancellationRate)} sub={`${k.cancelledOrders} cancelled · ${k.expiredOrders} expired`} />
        <KpiTile label="Low-stock products" value={k.activeLowStock} sub={`At or below ${data.lowStockThreshold} units`} />
      </section>

      <section className="sv-surface" aria-label="Sales trend">
        <h2>Sales by {data.groupBy}</h2>
        <BarChart
          data={chartData}
          series={[{ name: 'Gross order value', color: NAVY }, { name: 'Online collections', color: CHAMPAGNE }]}
          format={formatPaise}
          formatAxis={formatPaiseCompact}
          ariaLabel={`Gross order value and online collections by ${data.groupBy}`}
        />
      </section>

      <div className="sv-grid two">
        <section className="sv-surface" aria-label="Money position">
          <h2>Where the money is</h2>
          <HBarList items={[
            { key: 'online', label: 'Online collections', value: k.onlineCollections, display: formatPaise(k.onlineCollections) },
            { key: 'codc', label: 'COD cash collected', value: k.codCollected, display: formatPaise(k.codCollected) },
            { key: 'coda', label: 'COD awaiting collection', value: k.codAwaiting, display: formatPaise(k.codAwaiting) },
            { key: 'codh', label: 'COD collected, not remitted', value: k.codHeldBeforeRemittance, display: formatPaise(k.codHeldBeforeRemittance) },
            { key: 'ref', label: 'Refunds recorded', value: k.refunds ?? 0, display: k.refunds === null ? 'Unavailable' : formatPaise(k.refunds) },
          ]} />
          <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>COD figures are operator-recorded, not bank-verified.</p>
        </section>
        <section className="sv-surface" aria-label="Order pipeline">
          <h2>Order pipeline</h2>
          <HBarList items={data.pipeline.status.map((row) => ({ key: row.status, label: <OrderStatusTag status={row.status} />, value: row.count, display: row.count }))} empty="No orders in this period." />
          <h2 style={{ marginTop: 16 }}>Shipping (confirmed orders)</h2>
          <HBarList items={data.pipeline.shipping.map((row) => ({ key: row.status, label: SHIPPING_STATUS[row.status]?.label ?? row.status, value: row.count, display: row.count }))} empty="No confirmed orders yet." />
        </section>
      </div>

      <div className="sv-grid two">
        <section className="sv-surface" aria-label="Payment methods">
          <h2>Payment methods</h2>
          <HBarList empty="No orders in this period." items={data.paymentMix.map((row) => ({
            key: row.key,
            label: `${PAYMENT_METHOD[row.method] ?? row.method}${row.channel ? ` · ${CHANNEL[row.channel] ?? row.channel}` : ''}`,
            note: row.excludedFromRevenue ? 'Test payments are excluded from revenue' : `${row.confirmedOrders} of ${row.orders} confirmed`,
            value: row.grossOrderValue,
            display: row.excludedFromRevenue ? 'Excluded' : formatPaise(row.grossOrderValue),
          }))} />
        </section>
        <section className="sv-surface" aria-label="Top products">
          <h2>Top products</h2>
          <HBarList empty="No confirmed sales in this period." items={data.topProducts.map((row) => ({
            key: row.productId,
            label: row.name,
            note: <span className="mono">{row.sku}</span>,
            value: row.grossValue,
            display: <>{formatPaise(row.grossValue)} <span className="muted">· {row.units} unit{row.units === 1 ? '' : 's'} · {Math.round(row.share * 100)}%</span></>,
          }))} />
        </section>
      </div>

      <div className="sv-grid two">
        <section className="sv-surface flush" aria-label="Overdue deliveries">
          <h2 style={{ padding: '16px 16px 0' }}>Overdue deliveries ({data.overdueTotal})</h2>
          <Table size="small" rowKey="id" pagination={false} dataSource={data.overdueOrders} columns={dueColumns} locale={{ emptyText: 'Nothing overdue.' }} scroll={{ x: 560 }} />
        </section>
        <section className="sv-surface flush" aria-label="Upcoming deliveries">
          <h2 style={{ padding: '16px 16px 0' }}>Due in the next 7 days</h2>
          <Table size="small" rowKey="id" pagination={false} dataSource={data.upcomingDeliveries} columns={dueColumns} locale={{ emptyText: 'No delivery dates set for the next week.' }} scroll={{ x: 560 }} />
        </section>
      </div>

      <div className="sv-grid two">
        <section className="sv-surface flush" aria-label="Low stock">
          <h2 style={{ padding: '16px 16px 0' }}>Low stock</h2>
          <Table size="small" rowKey="id" pagination={false} dataSource={data.lowStock} locale={{ emptyText: 'No active product is running low.' }} columns={[
            { title: 'Product', dataIndex: 'name', ellipsis: true },
            { title: 'SKU', dataIndex: 'sku', render: (value: string) => <span className="mono">{value}</span>, width: 120 },
            { title: 'In stock', dataIndex: 'stockQuantity', align: 'right', width: 90, render: (value: number) => <strong className="num" style={{ color: value === 0 ? 'var(--danger)' : undefined }}>{value}</strong> },
          ]} />
          <div style={{ padding: 12 }}><Link to="/inventory?state=low">Open inventory</Link></div>
        </section>
        <section className="sv-surface flush" aria-label="Recent orders">
          <h2 style={{ padding: '16px 16px 0' }}>Recent orders in this period</h2>
          <Table size="small" rowKey="id" pagination={false} dataSource={data.recentOrders} columns={compactOrderColumns} locale={{ emptyText: 'No orders in this period.' }} scroll={{ x: 760 }} />
          <div style={{ padding: 12 }}><Link to="/orders">All orders</Link></div>
        </section>
      </div>

      <Collapse ghost items={[{
        key: 'defs',
        label: 'Definitions: what each figure means',
        children: (
          <dl style={{ margin: 0 }}>
            {Object.entries(data.definitions ?? {}).map(([name, text]) => (
              <div key={name} style={{ marginBottom: 8 }}><dt style={{ fontWeight: 600 }}>{name}</dt><dd style={{ margin: 0 }} className="muted">{text}</dd></div>
            ))}
            <dd className="muted" style={{ margin: 0 }}>Order statuses: {Object.values(ORDER_STATUS).map((meta) => meta.label).join(', ')}. Data available from {formatDateTime(data.coverage.ordersSince)}.</dd>
          </dl>
        ),
      }]} />
    </div>
  );
}
