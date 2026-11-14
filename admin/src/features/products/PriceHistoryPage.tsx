import { Table } from 'antd';
import { Link } from 'react-router';
import { ErrorState, Mono, PageHeader } from '@/components/primitives';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatPaise } from '@/lib/money';
import { useUrlTable } from '@/services/useUrlTable';
import type { PriceChange } from '@/types/api';

export default function PriceHistoryPage() {
  const table = useUrlTable<PriceChange>('price-history', { filterKeys: [] });
  const startedAt = (table.query.data as { trackingStartedAt?: number | null } | undefined)?.trackingStartedAt;
  return (
    <>
      <PageHeader title="Price history" description="Every price set or changed through the admin, newest first. Entries cannot be edited or removed." />
      {table.query.isError ? <ErrorState error={table.query.error} onRetry={() => table.query.refetch()} /> : (
        <div className="sv-surface flush">
          <Table<PriceChange> {...table.tableProps}
            locale={{ emptyText: 'No price changes recorded yet. Tracking begins with the next price edit or new product.' }}
            columns={[
              { title: 'When', dataIndex: 'changedAt', width: 180, render: (value: number) => <span className="num">{formatDateTime(value)}</span> },
              { title: 'Product', render: (_: unknown, row) => <div><Link to={`/products/edit/${row.productId}`}>{row.productName}</Link><div><Mono>{row.sku}</Mono></div></div> },
              { title: 'Previous', dataIndex: 'previousPriceInPaise', align: 'right', render: (value: number | null) => (value === null ? <span className="muted">Created</span> : <span className="num">{formatPaise(value)}</span>) },
              { title: 'New price', dataIndex: 'newPriceInPaise', align: 'right', render: (value: number) => <strong className="num">{formatPaise(value)}</strong> },
              { title: 'Changed by', dataIndex: 'changedBy', ellipsis: true },
              { title: 'Reason', dataIndex: 'reason', render: (value: string | null) => value ?? <span className="muted">—</span> },
            ]} />
        </div>
      )}
      {startedAt ? <p className="muted">History tracking started on {formatDate(startedAt)}. Price changes before that date were not recorded.</p> : null}
    </>
  );
}
