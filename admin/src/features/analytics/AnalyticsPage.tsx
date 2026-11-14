import { Tabs } from 'antd';
import { Link, useSearchParams } from 'react-router';
import { BarChart } from '@/components/charts/BarChart';
import { HBarList } from '@/components/charts/HBarList';
import { DateRangeControl, useDateRange } from '@/components/DateRangeControl';
import { Caveats, ErrorState, KpiTile, LoadingBlock, OrderStatusTag, PageHeader } from '@/components/primitives';
import { formatDateTime, hoursLabel } from '@/lib/dates';
import { formatPaise, formatPaiseCompact } from '@/lib/money';
import { CHANNEL, PAYMENT_METHOD, SHIPPING_STATUS } from '@/lib/status';
import { adminApi, type Range } from '@/services/api';
import { useApiQuery } from '@/services/useApiQuery';
import type { AnalyticsMeta } from '@/types/api';

const pct = (value: number | null) => (value === null ? '—' : `${Math.round(value * 1000) / 10}%`);
const bucket = (key: string) => {
  const parts = key.split('-');
  return parts.length === 2 ? new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, 1)).toLocaleString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' }) : `${Number(parts[2])} ${new Date(Date.UTC(2000, Number(parts[1]) - 1, 1)).toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' })}`;
};

function Frame<T extends AnalyticsMeta>({ query, children }: { query: { isLoading: boolean; isError: boolean; error: unknown; data?: T; refetch: () => unknown; isFetching: boolean }; children: (data: T) => React.ReactNode }) {
  if (query.isLoading) return <LoadingBlock rows={8} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!query.data) return null;
  return (
    <div style={{ display: 'grid', gap: 16, opacity: query.isFetching ? 0.7 : 1 }}>
      <Caveats notes={query.data.caveats} />
      {children(query.data)}
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>Data available from {formatDateTime(query.data.coverage.ordersSince)} · {query.data.coverage.ordersAnalysed.toLocaleString('en-IN')} orders analysed · India time</p>
    </div>
  );
}

function SalesTab({ range }: { range: Range }) {
  const query = useApiQuery(['an-sales', range.from, range.to], (signal) => adminApi.sales(range, signal));
  return <Frame query={query}>{(d) => (
    <>
      <div className="sv-grid kpis">
        <KpiTile label="Gross order value" value={formatPaise(d.summary.grossOrderValue)} help={d.definitions?.grossOrderValue} sub={`${d.summary.confirmedOrders} confirmed orders`} />
        <KpiTile label="Confirmed online collections" value={formatPaise(d.summary.onlineCollections)} help={d.definitions?.onlineCollections} />
        <KpiTile label="COD awaiting collection" value={formatPaise(d.summary.codAwaiting)} help={d.definitions?.codAwaiting} />
        <KpiTile label="Refunds (recorded)" value={d.summary.refunds === null ? 'Unavailable' : formatPaise(d.summary.refunds)} help={d.definitions?.refunds} />
        <KpiTile label="Net collected (recorded)" value={d.summary.netCollected === null ? 'Unavailable' : formatPaise(d.summary.netCollected)} help={d.definitions?.netCollected} />
        <KpiTile label="Average order value" value={d.summary.averageOrderValue === null ? '—' : formatPaise(d.summary.averageOrderValue)} help={d.definitions?.averageOrderValue} />
      </div>
      <section className="sv-surface">
        <h2>Gross order value and online collections by {d.groupBy}</h2>
        <BarChart ariaLabel="Sales over time" format={formatPaise} formatAxis={formatPaiseCompact}
          series={[{ name: 'Gross order value', color: '#182d49' }, { name: 'Online collections', color: '#a8895a' }]}
          data={d.series.map((p) => ({ key: p.key, label: bucket(p.key), values: [p.grossOrderValue, p.onlineCollections] }))} />
      </section>
      <section className="sv-surface">
        <h2>Orders and units by {d.groupBy}</h2>
        <BarChart ariaLabel="Orders and units over time" format={(v) => v.toLocaleString('en-IN')} formatAxis={(v) => String(Math.round(v))}
          series={[{ name: 'Confirmed orders', color: '#182d49' }, { name: 'Units sold', color: '#a8895a' }]}
          data={d.series.map((p) => ({ key: p.key, label: bucket(p.key), values: [p.confirmedOrders, p.unitsSold] }))} />
      </section>
    </>
  )}</Frame>;
}

function OrdersTab({ range }: { range: Range }) {
  const query = useApiQuery(['an-orders', range.from, range.to], (signal) => adminApi.orderAnalytics(range, signal));
  return <Frame query={query}>{(d) => (
    <>
      <div className="sv-grid kpis">
        <KpiTile label="Orders placed" value={d.summary.ordersPlaced} help={d.definitions?.ordersPlaced} />
        <KpiTile label="Cancellation rate" value={pct(d.summary.cancellationRate)} sub={`${d.summary.cancelledOrders} cancelled (${formatPaise(d.summary.cancelledValue)})`} />
        <KpiTile label="Expiry rate (online orders)" value={pct(d.summary.expiryRate)} sub={`${d.summary.expiredOrders} expired`} />
        <KpiTile label="Awaiting payment" value={d.summary.pendingPaymentOrders} sub="Not revenue" />
      </div>
      <div className="sv-grid two">
        <section className="sv-surface"><h2>By order status</h2>
          <HBarList empty="No orders." items={d.status.map((r) => ({ key: r.status, label: <OrderStatusTag status={r.status} />, value: r.count, display: r.count }))} /></section>
        <section className="sv-surface"><h2>Shipping (confirmed orders)</h2>
          <HBarList empty="No confirmed orders." items={d.shipping.map((r) => ({ key: r.status, label: SHIPPING_STATUS[r.status]?.label ?? r.status, value: r.count, display: r.count }))} /></section>
      </div>
      <section className="sv-surface"><h2>Payment method</h2>
        <HBarList empty="No orders." items={d.paymentMix.map((r) => ({
          key: r.key, label: `${PAYMENT_METHOD[r.method] ?? r.method}${r.channel ? ` · ${CHANNEL[r.channel] ?? r.channel}` : ''}`,
          note: r.excludedFromRevenue ? 'Test payments are excluded from revenue' : `${r.confirmedOrders} of ${r.orders} orders confirmed`,
          value: r.grossOrderValue, display: r.excludedFromRevenue ? 'Excluded' : formatPaise(r.grossOrderValue),
        }))} /></section>
    </>
  )}</Frame>;
}

function ProductsTab({ range }: { range: Range }) {
  const query = useApiQuery(['an-products', range.from, range.to], (signal) => adminApi.productAnalytics(range, signal));
  return <Frame query={query}>{(d) => (
    <>
      <section className="sv-surface"><h2>Best sellers by value (price at time of order)</h2>
        <HBarList empty="No confirmed sales in this period." items={d.topProducts.map((r) => ({
          key: r.productId, label: r.name, note: <span className="mono">{r.sku}</span>, value: r.grossValue,
          display: <>{formatPaise(r.grossValue)} <span className="muted">· {r.units} units · {r.orders} orders · {Math.round(r.share * 100)}%</span></>,
        }))} /></section>
      <section className="sv-surface"><h2>Slow-moving products</h2>
        <p className="muted">{d.slowMovingNote}</p>
        <HBarList empty="Every active product sold at least once." items={d.slowMoving.map((r) => ({ key: r.id, label: <Link to={`/products/edit/${r.id}`}>{r.name}</Link>, note: <span className="mono">{r.sku}</span>, value: r.stockQuantity, display: `${r.stockQuantity} in stock` }))} /></section>
      <p className="muted">Category performance is not shown: it needs reliably categorised products, and the catalogue still contains uncategorised items.</p>
    </>
  )}</Frame>;
}

function CustomersTab({ range }: { range: Range }) {
  const query = useApiQuery(['an-customers', range.from, range.to], (signal) => adminApi.customerAnalytics(range, signal));
  return <Frame query={query}>{(d) => (
    <div className="sv-grid kpis">
      <KpiTile label="New customers" value={d.newCustomers} sub="First recorded in this period" />
      <KpiTile label="Customers who bought" value={d.customersWithOrders} sub="By e-mail address, confirmed orders" />
      <KpiTile label="Repeat customers" value={d.repeatCustomers} sub="Two or more confirmed orders in the period" help={d.definitions?.repeatRate} />
      <KpiTile label="Repeat purchase rate" value={pct(d.repeatRate)} />
    </div>
  )}</Frame>;
}

function FulfilmentTab({ range }: { range: Range }) {
  const query = useApiQuery(['an-fulfilment', range.from, range.to], (signal) => adminApi.fulfilmentAnalytics(range, signal));
  return <Frame query={query}>{(d) => (
    <>
      <div className="sv-grid kpis">
        <KpiTile label="Awaiting dispatch" value={d.awaitingDispatch} />
        <KpiTile label="In transit" value={d.inTransit} />
        <KpiTile label="Delivered" value={d.delivered} />
        <KpiTile label="Overdue" value={d.overdue} sub="Past the promised date" />
        <KpiTile label="Time to dispatch" value={hoursLabel(d.avgHoursToDispatch)} sub={`Average of ${d.dispatchSample} order(s) with a dispatch time`} />
        <KpiTile label="Time to delivery" value={hoursLabel(d.avgHoursToDelivery)} sub={`Average of ${d.deliverySample} order(s) with a delivery time`} />
        <KpiTile label="On-time delivery" value={pct(d.onTimeRate)} sub={d.onTimeSample ? `${d.onTimeSample} order(s) with a promised and actual date` : 'Needs delivered orders that had an estimated date'} />
      </div>
      <p className="muted">Dates are entered by hand on each order. These figures only use orders where a date was actually recorded; nothing is estimated.</p>
    </>
  )}</Frame>;
}

export default function AnalyticsPage() {
  const dateRange = useDateRange();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'sales';
  const { range } = dateRange;
  const items = [
    { key: 'sales', label: 'Sales', children: <SalesTab range={range} /> },
    { key: 'orders', label: 'Orders', children: <OrdersTab range={range} /> },
    { key: 'products', label: 'Products', children: <ProductsTab range={range} /> },
    { key: 'customers', label: 'Customers', children: <CustomersTab range={range} /> },
    { key: 'fulfilment', label: 'Fulfilment', children: <FulfilmentTab range={range} /> },
  ];
  return (
    <>
      <PageHeader title="Analytics" description="Sales, orders, products, customers and fulfilment. Hover the help icons for exact definitions." actions={<Link to={`/reports?from=${range.from}&to=${range.to}`}>Export reports</Link>} />
      <div style={{ marginBottom: 16 }}><DateRangeControl {...dateRange} /></div>
      <Tabs activeKey={items.some((item) => item.key === tab) ? tab : 'sales'} items={items} destroyInactiveTabPane
        onChange={(key) => setParams((current) => { const next = new URLSearchParams(current); next.set('tab', key); return next; }, { replace: true })} />
    </>
  );
}
