import { DownloadOutlined } from '@ant-design/icons';
import { Button, Table } from 'antd';
import { Link } from 'react-router';
import { ClearFilters, DateRangeFilter, SearchBox, SelectFilter, ToggleFilter } from '@/components/FilterControls';
import { EmptyState, ErrorState, PageHeader } from '@/components/primitives';
import { ORDER_STATUS, PAYMENT_METHOD, SHIPPING_STATUS } from '@/lib/status';
import { useUrlTable } from '@/services/useUrlTable';
import type { OrderRow } from '@/types/api';
import { orderListColumns } from './columns';

const FILTER_KEYS = ['search', 'status', 'paymentMethod', 'shippingStatus', 'from', 'to', 'overdue'];

export default function OrderListPage() {
  const table = useUrlTable<OrderRow & { id: string }>('orders', { filterKeys: FILTER_KEYS, defaultSort: { field: 'createdAt', order: 'desc' } });
  const { values } = table;
  const exportQuery = new URLSearchParams(Object.entries(values).filter(([key, value]) => value && key !== 'search' && key !== 'overdue') as [string, string][]).toString();

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every order with its payment, shipping and delivery state. Filters are applied on the server and kept in the address bar."
        actions={<Link to={`/reports?report=orders${exportQuery ? `&${exportQuery}` : ''}`}><Button icon={<DownloadOutlined />}>Export these filters</Button></Link>}
      />
      <div className="sv-filters" role="search" aria-label="Order filters">
        <SearchBox label="Search orders" placeholder="Order ref, e-mail, phone or name" value={values.search} onChange={(value) => table.setFilter('search', value)} />
        <SelectFilter multiple label="Order status" placeholder="Order status" value={values.status} onChange={(value) => table.setFilter('status', value)}
          options={Object.entries(ORDER_STATUS).map(([value, meta]) => ({ value, label: meta.label }))} width={220} />
        <SelectFilter label="Payment method" placeholder="Payment method" value={values.paymentMethod} onChange={(value) => table.setFilter('paymentMethod', value)}
          options={Object.entries(PAYMENT_METHOD).map(([value, label]) => ({ value, label }))} />
        <SelectFilter label="Shipping status" placeholder="Shipping status" value={values.shippingStatus} onChange={(value) => table.setFilter('shippingStatus', value)}
          options={Object.entries(SHIPPING_STATUS).map(([value, meta]) => ({ value, label: meta.label }))} />
        <DateRangeFilter label="Placed between" from={values.from} to={values.to} onChange={(from, to) => table.setFilters({ from, to })} />
        <ToggleFilter label="Overdue only" checked={values.overdue === 'true'} onChange={(checked) => table.setFilter('overdue', checked ? 'true' : undefined)} />
        <ClearFilters show={table.hasFilters} onClear={table.clearFilters} />
      </div>
      {table.query.isError ? <ErrorState error={table.query.error} onRetry={() => table.query.refetch()} title="Could not load orders" /> : (
        <div className="sv-surface flush">
          <Table<OrderRow> {...table.tableProps} columns={orderListColumns.map((column) => ('dataIndex' in column && column.dataIndex === table.sort?.field
            ? { ...column, sortOrder: table.sort?.order === 'asc' ? 'ascend' as const : 'descend' as const }
            : column))}
            locale={{ emptyText: <EmptyState title={table.hasFilters ? 'No orders match these filters' : 'No orders yet'} description={table.hasFilters ? 'Try widening the filters.' : 'Orders appear here as soon as customers check out.'} /> }} />
        </div>
      )}
    </>
  );
}
