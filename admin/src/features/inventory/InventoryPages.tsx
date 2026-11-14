import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Form, Input, InputNumber, Modal, Radio, Select, Table, Tag } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router';
import { ClearFilters, DateRangeFilter, SearchBox, SelectFilter } from '@/components/FilterControls';
import { ErrorState, KpiTile, Mono, PageHeader } from '@/components/primitives';
import { formatDateTime } from '@/lib/dates';
import { MOVEMENT_TYPE } from '@/lib/status';
import { adminApi } from '@/services/api';
import { ApiError } from '@/services/apiClient';
import { useApiQuery } from '@/services/useApiQuery';
import { useUrlTable } from '@/services/useUrlTable';
import type { MovementRow, StockRow } from '@/types/api';

function AdjustModal({ product, onClose }: { product: StockRow | null; onClose: () => void }) {
  const { message } = App.useApp();
  const client = useQueryClient();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One id per opening of the dialog: a double-click cannot apply the same adjustment twice.
  const [requestId] = useState(() => crypto.randomUUID().replace(/-/g, '').slice(0, 32));
  const mode = Form.useWatch('mode', form) as 'delta' | 'set' | undefined;
  const value = Form.useWatch('value', form) as number | undefined;
  const after = product && typeof value === 'number' ? (mode === 'set' ? value : product.stockQuantity + value) : null;

  async function submit(values: { mode: 'delta' | 'set'; type: string; value: number; reason: string }) {
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      await adminApi.adjustStock(product.id, { requestId, ...values, reason: values.reason.trim() });
      message.success('Stock updated and recorded');
      await client.invalidateQueries();
      onClose();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not adjust stock.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={`Adjust stock: ${product?.name ?? ''}`} okText="Record adjustment" confirmLoading={saving} onCancel={onClose} onOk={() => form.submit()} destroyOnHidden>
      <p>Currently <strong className="num">{product?.stockQuantity}</strong> in stock. Every adjustment needs a reason and is kept permanently with your e-mail.</p>
      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} role="alert" /> : null}
      <Form form={form} layout="vertical" onFinish={submit} initialValues={{ mode: 'delta', type: 'restock' }}>
        <Form.Item name="type" label="What happened" rules={[{ required: true }]}>
          <Select options={[{ value: 'restock', label: 'New stock received' }, { value: 'manual_adjustment', label: 'Manual adjustment (damage, gift, sample)' }, { value: 'correction', label: 'Stock-take correction' }]} />
        </Form.Item>
        <Form.Item name="mode" label="Enter"><Radio.Group optionType="button" options={[{ value: 'delta', label: 'Change by (+/−)' }, { value: 'set', label: 'Set to exact count' }]} /></Form.Item>
        <Form.Item name="value" label={mode === 'set' ? 'New count' : 'Change'} rules={[{ required: true, type: 'number', message: 'Enter a whole number.' }, { validator: (_, input) => (input === 0 && mode !== 'set' ? Promise.reject(new Error('Zero would change nothing.')) : Promise.resolve()) }]}
          extra={after !== null ? (after < 0 ? <span style={{ color: 'var(--danger)' }}>This would make stock negative.</span> : `Stock afterwards: ${after}`) : undefined}>
          <InputNumber precision={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="reason" label="Reason" rules={[{ required: true, whitespace: true, min: 3, message: 'Give a reason of at least 3 characters.' }]}>
          <Input.TextArea rows={2} maxLength={200} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function StockPage() {
  const table = useUrlTable<StockRow>('inventory', { filterKeys: ['search', 'state'], defaultSort: { field: 'stockQuantity', order: 'asc' } });
  const summary = useApiQuery(['inventory-summary'], () => adminApi.inventorySummary());
  const [adjusting, setAdjusting] = useState<StockRow | null>(null);
  const { values } = table;
  return (
    <>
      <PageHeader title="Inventory" description="Stock on hand, what is held by unpaid orders, and every change that was made." actions={<Link to="/inventory/movements"><Button>Stock movement history</Button></Link>} />
      <div className="sv-grid kpis" style={{ marginBottom: 16 }}>
        <KpiTile label="Products" value={summary.data?.products ?? '—'} sub={`${summary.data?.activeProducts ?? '—'} on sale`} />
        <KpiTile label="Out of stock" value={summary.data?.outOfStock ?? '—'} sub="On-sale products at zero" />
        <KpiTile label="Low stock" value={summary.data?.lowStock ?? '—'} sub={`At or below ${summary.data?.lowStockThreshold ?? 3} units`} />
      </div>
      <div className="sv-filters" role="search" aria-label="Inventory filters">
        <SearchBox label="Search stock" placeholder="Product name or SKU" value={values.search} onChange={(value) => table.setFilter('search', value)} />
        <SelectFilter label="Stock level" placeholder="All stock levels" value={values.state} onChange={(value) => table.setFilter('state', value)} options={[{ value: 'low', label: 'Low stock' }, { value: 'out', label: 'Out of stock' }]} />
        <ClearFilters show={table.hasFilters} onClear={table.clearFilters} />
      </div>
      {table.query.isError ? <ErrorState error={table.query.error} onRetry={() => table.query.refetch()} /> : (
        <div className="sv-surface flush">
          <Table<StockRow> {...table.tableProps} locale={{ emptyText: 'No products match.' }}
            columns={[
              { title: 'Product', dataIndex: 'name', render: (_: unknown, row) => <div><Link to={`/products/edit/${row.id}`}>{row.name}</Link><div><Mono>{row.sku}</Mono></div></div> },
              { title: 'In stock', dataIndex: 'stockQuantity', sorter: true, align: 'right', width: 130, render: (value: number, row) => (
                <span><strong className="num">{value}</strong>{' '}{row.state === 'out' ? <Tag color="red">Out</Tag> : row.state === 'low' ? <Tag color="gold">Low</Tag> : null}</span>
              ) },
              { title: 'Held by unpaid orders', dataIndex: 'reservedQuantity', align: 'right', width: 190, render: (value: number) => <span className="num" title="Already deducted from stock; returns if the payment window expires">{value}</span> },
              { title: 'On sale', dataIndex: 'active', width: 100, render: (value: boolean) => (value ? 'Yes' : <span className="muted">Hidden</span>) },
              { title: 'Updated', dataIndex: 'updatedAt', width: 170, render: (value: number) => <span className="num muted">{formatDateTime(value)}</span> },
              { title: '', width: 150, fixed: 'right', render: (_: unknown, row) => <Button size="small" onClick={() => setAdjusting(row)}>Adjust stock</Button> },
            ]} />
        </div>
      )}
      <p className="muted" style={{ marginTop: 12 }}>"In stock" is what can still be sold. Units held by unpaid online orders are already deducted and come back if the payment is not completed.</p>
      {adjusting ? <AdjustModal product={adjusting} onClose={() => setAdjusting(null)} /> : null}
    </>
  );
}

export function MovementsPage() {
  const table = useUrlTable<MovementRow>('inventory-movements', { filterKeys: ['productId', 'orderId', 'type', 'from', 'to'] });
  const { values } = table;
  return (
    <>
      <PageHeader title="Stock movements" description="An append-only record of every stock change: orders, cancellations, restocks and manual corrections." actions={<Link to="/inventory"><Button>Stock overview</Button></Link>} />
      <div className="sv-filters" role="search" aria-label="Movement filters">
        <SelectFilter label="Movement type" placeholder="All movement types" value={values.type} onChange={(value) => table.setFilter('type', value)} options={Object.entries(MOVEMENT_TYPE).map(([value, label]) => ({ value, label }))} width={230} />
        <DateRangeFilter label="Between" from={values.from} to={values.to} onChange={(from, to) => table.setFilters({ from, to })} />
        {values.productId ? <Tag closable onClose={() => table.setFilter('productId', undefined)}>One product only</Tag> : null}
        {values.orderId ? <Tag closable onClose={() => table.setFilter('orderId', undefined)}>Order {values.orderId}</Tag> : null}
        <ClearFilters show={table.hasFilters} onClear={table.clearFilters} />
      </div>
      {table.query.isError ? <ErrorState error={table.query.error} onRetry={() => table.query.refetch()} /> : (
        <div className="sv-surface flush">
          <Table<MovementRow> {...table.tableProps}
            locale={{ emptyText: 'No movements recorded yet. History starts from the first stock change after this feature was enabled.' }}
            columns={[
              { title: 'When', dataIndex: 'createdAt', width: 170, render: (value: number) => <span className="num">{formatDateTime(value)}</span> },
              { title: 'Product', render: (_: unknown, row) => <div>{row.productName}<div><Mono>{row.sku}</Mono></div></div> },
              { title: 'Type', dataIndex: 'type', width: 190, render: (value: string) => MOVEMENT_TYPE[value] ?? value },
              { title: 'Change', dataIndex: 'delta', align: 'right', width: 100, render: (value: number) => <strong className="num" style={{ color: value < 0 ? 'var(--danger)' : 'var(--success)' }}>{value > 0 ? `+${value}` : value}</strong> },
              { title: 'Before → after', width: 140, render: (_: unknown, row) => (row.quantityBefore === null ? <span className="muted">Not recorded</span> : <span className="num">{row.quantityBefore} → {row.quantityAfter}</span>) },
              { title: 'Order', dataIndex: 'orderId', width: 150, render: (value: string | null) => (value ? <Link to={`/orders/show/${value}`}><Mono>{value}</Mono></Link> : '—') },
              { title: 'Reason', dataIndex: 'reason', render: (value: string | null) => value ?? '—' },
              { title: 'By', dataIndex: 'actor', ellipsis: true, width: 190 },
            ]} />
        </div>
      )}
    </>
  );
}
