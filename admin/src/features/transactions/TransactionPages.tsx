import { ArrowLeftOutlined } from '@ant-design/icons';
import { useOne } from '@refinedev/core';
import { Alert, Descriptions, Table } from 'antd';
import { Link, useParams } from 'react-router';
import { ClearFilters, DateRangeFilter, SearchBox, SelectFilter, ToggleFilter } from '@/components/FilterControls';
import { ErrorState, KpiTile, LoadingBlock, Money, Mono, PageHeader, ReconciliationTag, TxStatusTag } from '@/components/primitives';
import { formatDateTime } from '@/lib/dates';
import { CHANNEL, TX_STATUS, TX_TYPE } from '@/lib/status';
import { adminApi } from '@/services/api';
import { useApiQuery } from '@/services/useApiQuery';
import { useUrlTable } from '@/services/useUrlTable';
import type { OrderRow, TransactionRow } from '@/types/api';
import { compactOrderColumns } from '../orders/columns';

const FILTER_KEYS = ['search', 'type', 'status', 'provider', 'from', 'to', 'includeTest'];

export function TransactionListPage() {
  const table = useUrlTable<TransactionRow>('transactions', { filterKeys: FILTER_KEYS });
  const { values } = table;
  return (
    <>
      <PageHeader title="Transactions" description="The payment and cash ledger. A payment attempt is not a collection: only confirmed payments, COD cash and refunds that were actually recorded appear as money." />
      <div className="sv-filters" role="search" aria-label="Transaction filters">
        <SearchBox label="Search transactions" placeholder="Order ref, payment id or refund id" value={values.search} onChange={(value) => table.setFilter('search', value)} />
        <SelectFilter label="Type" placeholder="Type" value={values.type} onChange={(value) => table.setFilter('type', value)} options={Object.entries(TX_TYPE).map(([value, label]) => ({ value, label }))} width={210} />
        <SelectFilter label="Status" placeholder="Status" value={values.status} onChange={(value) => table.setFilter('status', value)} options={Object.entries(TX_STATUS).map(([value, meta]) => ({ value, label: meta.label }))} width={160} />
        <SelectFilter label="Provider" placeholder="Provider" value={values.provider} onChange={(value) => table.setFilter('provider', value)} options={[{ value: 'cashfree', label: 'Cashfree' }, { value: 'cod', label: 'Cash on delivery' }, { value: 'test', label: 'Test gateway' }]} width={170} />
        <DateRangeFilter label="Occurred between" from={values.from} to={values.to} onChange={(from, to) => table.setFilters({ from, to })} />
        <ToggleFilter label="Include test payments" checked={values.includeTest === 'true'} onChange={(checked) => table.setFilter('includeTest', checked ? 'true' : undefined)} />
        <ClearFilters show={table.hasFilters} onClear={table.clearFilters} />
      </div>
      {table.query.isError ? <ErrorState error={table.query.error} onRetry={() => table.query.refetch()} title="Could not load transactions" /> : (
        <div className="sv-surface flush">
          <Table<TransactionRow> {...table.tableProps}
            locale={{ emptyText: 'No ledger entries match. The ledger records events from the time tracking began; earlier orders appear on the Orders page.' }}
            columns={[
              { title: 'When', dataIndex: 'occurredAt', width: 170, render: (value: number) => <span className="num">{formatDateTime(value)}</span> },
              { title: 'Type', dataIndex: 'type', width: 170, render: (value: string) => TX_TYPE[value] ?? value },
              { title: 'Status', dataIndex: 'status', width: 130, render: (value: string) => <TxStatusTag status={value} /> },
              { title: 'Amount', dataIndex: 'amountInPaise', align: 'right', width: 130, render: (value: number, row) => <Money paise={row.type === 'refund' ? -value : value} strong /> },
              { title: 'Provider', dataIndex: 'provider', width: 150, render: (value: string, row) => `${value === 'cod' ? 'Cash on delivery' : value === 'cashfree' ? 'Cashfree' : 'Test'}${row.channel ? ` · ${CHANNEL[row.channel] ?? row.channel}` : ''}` },
              { title: 'Order', dataIndex: 'orderId', width: 150, render: (value: string) => <Link to={`/orders/show/${value}`}><Mono>{value}</Mono></Link> },
              { title: 'Verified by', dataIndex: 'reconciliation', width: 170, render: (value: string) => <ReconciliationTag value={value} /> },
              { title: '', width: 80, fixed: 'right', render: (_: unknown, row) => <Link to={`/transactions/show/${row.id}`}>Details</Link> },
            ]} />
        </div>
      )}
      <p className="muted" style={{ marginTop: 12 }}>Refunds are listed only when Cashfree confirmed them by signed webhook. Settlement reports from Cashfree are not connected, so no settlement figures are shown.</p>
    </>
  );
}

export function TransactionShowPage() {
  const { id = '' } = useParams();
  const { query, result } = useOne<TransactionRow & { order: OrderRow | null }>({ resource: 'transactions', id });
  const tx = result as (TransactionRow & { order: OrderRow | null }) | undefined;
  if (query.isLoading) return <LoadingBlock />;
  if (query.isError || !tx) return <ErrorState error={query.error} onRetry={() => query.refetch()} title="Could not load this transaction" />;
  return (
    <>
      <PageHeader title="Transaction" description={<Link to="/transactions"><ArrowLeftOutlined /> All transactions</Link>} />
      <section className="sv-surface">
        <Descriptions bordered size="small" column={{ xs: 1, md: 2 }} items={[
          { key: 'type', label: 'Type', children: TX_TYPE[tx.type] ?? tx.type },
          { key: 'status', label: 'Status', children: <TxStatusTag status={tx.status} /> },
          { key: 'amount', label: 'Amount', children: <Money paise={tx.amountInPaise} strong /> },
          { key: 'provider', label: 'Provider', children: tx.provider },
          { key: 'order', label: 'Order', children: <Link to={`/orders/show/${tx.orderId}`}><Mono>{tx.orderId}</Mono></Link> },
          { key: 'occurred', label: 'Occurred', children: formatDateTime(tx.occurredAt) },
          { key: 'recorded', label: 'Recorded in ledger', children: formatDateTime(tx.recordedAt) },
          { key: 'recon', label: 'Verified by', children: <ReconciliationTag value={tx.reconciliation} /> },
          { key: 'source', label: 'Source', children: tx.source },
          { key: 'actor', label: 'Recorded by', children: tx.actor },
          ...(tx.providerOrderId ? [{ key: 'po', label: 'Provider order', children: <Mono>{tx.providerOrderId}</Mono> }] : []),
          ...(tx.providerPaymentId ? [{ key: 'pp', label: 'Provider payment', children: <Mono>{tx.providerPaymentId}</Mono> }] : []),
          ...(tx.providerRefundId ? [{ key: 'pr', label: 'Provider refund', children: <Mono>{tx.providerRefundId}</Mono> }] : []),
          ...(tx.reference ? [{ key: 'ref', label: 'Reference', children: <Mono>{tx.reference}</Mono> }] : []),
          ...(tx.note ? [{ key: 'note', label: 'Note', children: tx.note }] : []),
          { key: 'key', label: 'Idempotency key', children: <Mono>{tx.eventKey}</Mono> },
        ]} />
        {tx.meta ? <pre className="mono" style={{ background: 'var(--stone)', padding: 12, borderRadius: 8, overflow: 'auto' }}>{JSON.stringify(tx.meta, null, 2)}</pre> : null}
        <p className="muted" style={{ marginBottom: 0 }}>Ledger entries are append-only. Provider details are limited to what support needs; no secrets or card data are stored.</p>
      </section>
    </>
  );
}

export function CodReconciliationPage() {
  const query = useApiQuery(['cod-outstanding'], () => adminApi.codOutstanding(), { staleTime: 0 });
  const data = query.data;
  return (
    <>
      <PageHeader title="COD cash & reconciliation" description="Cash-on-delivery order value is money owed, not money received. Record collections after delivery and remittances when cash reaches Silveram." />
      {query.isLoading ? <LoadingBlock rows={8} /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : null}
      {data ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <Alert type="info" showIcon message="Operator-recorded figures" description={data.note} />
          {data.truncated ? <Alert type="warning" showIcon message="Showing the most recent 2,000 COD orders only." /> : null}
          <div className="sv-grid kpis">
            <KpiTile label="Awaiting collection" value={<Money paise={data.awaitingCollection.totalInPaise} />} sub={`${data.awaitingCollection.count} order(s)`} />
            <KpiTile label="Collected, not yet remitted" value={<Money paise={data.heldNotRemitted.totalInPaise} />} sub={`${data.heldNotRemitted.count} order(s)`} />
          </div>
          <section className="sv-surface flush"><h2 style={{ padding: '16px 16px 0' }}>Awaiting collection</h2>
            <Table<OrderRow> size="small" rowKey="id" pagination={{ pageSize: 10, hideOnSinglePage: true }} dataSource={data.awaitingCollection.orders} columns={compactOrderColumns} scroll={{ x: 760 }} locale={{ emptyText: 'No COD cash is waiting to be collected.' }} /></section>
          <section className="sv-surface flush"><h2 style={{ padding: '16px 16px 0' }}>Collected, waiting to be remitted</h2>
            <Table<OrderRow> size="small" rowKey="id" pagination={{ pageSize: 10, hideOnSinglePage: true }} dataSource={data.heldNotRemitted.orders} scroll={{ x: 760 }} locale={{ emptyText: 'Nothing is waiting to be remitted.' }}
              columns={[...compactOrderColumns.slice(0, 3), { title: 'Cash collected', dataIndex: 'codCollectedInPaise', align: 'right', render: (value: number) => <Money paise={value} /> }]} /></section>
          <Alert type="info" showIcon message="Settlements and refunds" description="Cashfree settlement reports and refund initiation are not connected to the admin. Refunds appear in the ledger only after Cashfree confirms them." />
        </div>
      ) : null}
    </>
  );
}
