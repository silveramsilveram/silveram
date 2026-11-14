import { ArrowLeftOutlined } from '@ant-design/icons';
import { useOne } from '@refinedev/core';
import { Alert, Descriptions, Table, Tag } from 'antd';
import { Link, useParams } from 'react-router';
import { ClearFilters, SearchBox, SelectFilter } from '@/components/FilterControls';
import { ErrorState, KpiTile, LoadingBlock, Money, PageHeader } from '@/components/primitives';
import { formatDate, formatDateTime } from '@/lib/dates';
import { useUrlTable } from '@/services/useUrlTable';
import type { CustomerDetail, CustomerRow, OrderRow } from '@/types/api';
import { orderListColumns } from '../orders/columns';

export function CustomerListPage() {
  const table = useUrlTable<CustomerRow>('customers', { filterKeys: ['search', 'source'], defaultSort: { field: 'createdAt', order: 'desc' } });
  const { values } = table;
  const note = (table.query.data as { aggregateNote?: string | null } | undefined)?.aggregateNote;
  return (
    <>
      <PageHeader title="Customers" description="People who have placed or started an order, guests included. Phone numbers are masked here; open a customer to see full contact details." />
      <div className="sv-filters" role="search" aria-label="Customer filters">
        <SearchBox label="Search customers" placeholder="Name, e-mail or 10-digit phone" value={values.search} onChange={(value) => table.setFilter('search', value)} />
        <SelectFilter label="Customer type" placeholder="Guest or account" value={values.source} onChange={(value) => table.setFilter('source', value)} options={[{ value: 'guest', label: 'Guest' }, { value: 'account', label: 'Account holder' }]} width={180} />
        <ClearFilters show={table.hasFilters} onClear={table.clearFilters} />
      </div>
      {note ? <Alert type="info" showIcon message={note} style={{ marginBottom: 12 }} /> : null}
      {table.query.isError ? <ErrorState error={table.query.error} onRetry={() => table.query.refetch()} /> : (
        <div className="sv-surface flush">
          <Table<CustomerRow> {...table.tableProps} locale={{ emptyText: 'No customers match.' }}
            columns={[
              { title: 'Customer', render: (_: unknown, row) => <div style={{ overflowWrap: 'anywhere' }}><Link to={`/customers/show/${row.id}`}><strong>{row.name || row.email}</strong></Link><div className="muted" style={{ fontSize: 13 }}>{row.email}</div></div> },
              { title: 'Phone', dataIndex: 'phoneMasked', width: 130, render: (value: string | null) => <span className="num">{value ?? '—'}</span> },
              { title: 'Type', dataIndex: 'source', width: 130, render: (value: string) => <Tag>{value === 'account' ? 'Account' : 'Guest'}</Tag> },
              { title: 'First seen', dataIndex: 'createdAt', sorter: true, width: 130, render: (value: number) => <span className="num">{formatDate(value)}</span> },
              { title: 'Last order', dataIndex: 'lastOrderAt', sorter: true, width: 130, render: (value: number | null) => <span className="num">{formatDate(value)}</span> },
              { title: 'Orders', dataIndex: 'orderCount', align: 'right', width: 90, render: (value: number, row) => <span className="num" title={`${row.confirmedOrderCount} confirmed`}>{value}</span> },
              { title: 'Lifetime value', dataIndex: 'lifetimeOrderValueInPaise', align: 'right', width: 150, render: (value: number) => <Money paise={value} /> },
            ]} />
        </div>
      )}
      <p className="muted" style={{ marginTop: 12 }}>Lifetime value is the total of confirmed orders (accepted COD, paid, dispatched). Cancelled, expired, unpaid and test orders are not counted.</p>
    </>
  );
}

export function CustomerShowPage() {
  const { id = '' } = useParams();
  const { query, result } = useOne<CustomerDetail>({ resource: 'customers', id });
  const customer = result as CustomerDetail | undefined;
  const orders = useUrlTable<OrderRow>('orders', { filterKeys: [], meta: { path: `/admin/customers/${id}/orders` }, enabled: Boolean(id), pageSize: 10 });
  if (query.isLoading) return <LoadingBlock />;
  if (query.isError || !customer) return <ErrorState error={query.error} onRetry={() => query.refetch()} title="Could not load this customer" />;
  const address = customer.lastAddress;
  return (
    <>
      <PageHeader title={customer.name || customer.email} description={<Link to="/customers"><ArrowLeftOutlined /> All customers</Link>} />
      <div className="sv-grid kpis" style={{ marginBottom: 16 }}>
        <KpiTile label="Orders" value={customer.orderCount} sub={`${customer.confirmedOrderCount} confirmed`} />
        <KpiTile label="Lifetime value" value={<Money paise={customer.lifetimeOrderValueInPaise} />} sub="Confirmed orders only" />
        <KpiTile label="Last order" value={formatDate(customer.lastOrderAt)} />
      </div>
      {customer.aggregateTruncated ? <Alert type="warning" showIcon message="Totals cover this customer's 1,000 most recent orders only." style={{ marginBottom: 12 }} /> : null}
      <div className="sv-grid sv-split" style={{ alignItems: 'start' }}>
        <section className="sv-surface flush" aria-label="Orders">
          <h2 style={{ padding: '16px 16px 0' }}>Order history</h2>
          <Table<OrderRow> {...orders.tableProps} size="small" locale={{ emptyText: 'No orders found for this e-mail.' }} columns={orderListColumns.slice(0, 7).filter((column) => !('dataIndex' in column) || column.dataIndex !== 'customerName')} />
        </section>
        <section className="sv-surface" aria-label="Contact">
          <h2>Contact</h2>
          <Descriptions size="small" column={1} colon={false} items={[
            { key: 'e', label: 'E-mail', children: <span style={{ overflowWrap: 'anywhere' }}>{customer.email}</span> },
            { key: 'p', label: 'Phone', children: <span className="num">{customer.phone ?? '—'}</span> },
            ...(customer.altPhone ? [{ key: 'a', label: 'Alternate phone', children: <span className="num">{customer.altPhone}</span> }] : []),
            { key: 't', label: 'Type', children: customer.source === 'account' ? 'Account holder' : 'Guest checkout' },
            { key: 's', label: 'First seen', children: formatDateTime(customer.createdAt) },
            ...(address ? [{ key: 'ad', label: 'Last delivery address', children: [address.address, address.landmark, `${address.city ?? ''}, ${address.state ?? ''} ${address.postalCode ?? ''}`].filter(Boolean).join(', ') }] : []),
          ]} />
          <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>Saved bags are not shown. This page is visible to administrators only. Do not message customers from here without their consent.</p>
        </section>
      </div>
    </>
  );
}
