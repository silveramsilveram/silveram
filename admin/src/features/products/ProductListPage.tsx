import { PlusOutlined } from '@ant-design/icons';
import { App, Button, Popconfirm, Switch, Table, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router';
import { ClearFilters, DateRangeFilter, SearchBox, SelectFilter } from '@/components/FilterControls';
import { EmptyState, ErrorState, Money, Mono, PageHeader } from '@/components/primitives';
import { formatDateTime } from '@/lib/dates';
import { CATEGORIES, titleCase } from '@/lib/status';
import { adminApi } from '@/services/api';
import { ApiError } from '@/services/apiClient';
import { useUrlTable } from '@/services/useUrlTable';
import type { ProductRow } from '@/types/api';
import { useRefreshAll } from '../orders/OrderPanels';

const FILTER_KEYS = ['search', 'category', 'active', 'stock', 'updatedFrom', 'updatedTo', 'deleted'];

export default function ProductListPage() {
  const { message } = App.useApp();
  const refresh = useRefreshAll();
  const table = useUrlTable<ProductRow>('products', { filterKeys: FILTER_KEYS, defaultSort: { field: 'updatedAt', order: 'desc' } });
  const { values } = table;
  const [busy, setBusy] = useState<string | null>(null);

  async function setActive(product: ProductRow, active: boolean) {
    setBusy(product.id);
    try {
      await adminApi.updateProduct(product.id, { active });
      message.success(active ? `${product.name} is now on sale` : `${product.name} is hidden from the shop`);
      await refresh();
    } catch (caught) {
      message.error(caught instanceof ApiError ? caught.message : 'Could not change the product.');
    } finally {
      setBusy(null);
    }
  }

  const columns: TableColumnsType<ProductRow> = [
    { title: '', dataIndex: 'imageUrl', width: 72, render: (url: string | undefined, product) => (
      <div style={{ width: 56, height: 56, background: 'var(--stone)', borderRadius: 6, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
        {url ? <img src={url} alt="" loading="lazy" style={{ maxWidth: 56, maxHeight: 56, width: 'auto', height: 'auto', objectFit: 'contain' }} /> : <span className="muted" style={{ fontSize: 11 }} aria-label={`No photo for ${product.name}`}>No photo</span>}
      </div>
    ) },
    { title: 'Product', dataIndex: 'name', sorter: true, width: 280, render: (_: unknown, product) => (
      <div style={{ overflowWrap: 'anywhere' }}>
        <Link to={`/products/edit/${product.id}`}><strong>{product.name}</strong></Link>
        <div><Mono>{product.sku}</Mono></div>
        {product.deleted ? <Tag>Archived</Tag> : null}
      </div>
    ) },
    { title: 'Category', dataIndex: 'category', width: 120, render: (value: string) => titleCase(value) },
    { title: 'Price', dataIndex: 'priceInPaise', sorter: true, align: 'right', width: 130, render: (value: number) => <Money paise={value} strong /> },
    { title: 'Stock', dataIndex: 'stockQuantity', sorter: true, align: 'right', width: 140, render: (value: number, product) => (
      <div>
        <strong className="num">{value}</strong>{' '}
        {value <= 0 ? <Tag color="red">Out</Tag> : value <= product.lowStockThreshold ? <Tag color="gold">Low</Tag> : null}
      </div>
    ) },
    { title: 'On sale', dataIndex: 'active', width: 110, render: (active: boolean, product) => (
      active ? (
        <Popconfirm title="Hide this product from the shop?" description="Customers will no longer see or buy it. You can turn it back on at any time." okText="Hide product" onConfirm={() => setActive(product, false)}>
          <Switch checked loading={busy === product.id} aria-label={`${product.name} is on sale. Turn off`} />
        </Popconfirm>
      ) : <Switch checked={false} loading={busy === product.id} aria-label={`${product.name} is hidden. Turn on`} onChange={() => setActive(product, true)} />
    ) },
    { title: 'Updated', dataIndex: 'updatedAt', sorter: true, width: 170, render: (value: number) => <span className="num muted">{formatDateTime(value)}</span> },
    { title: '', width: 90, fixed: 'right', render: (_: unknown, product) => <Link to={`/products/edit/${product.id}`}>Edit</Link> },
  ];

  return (
    <>
      <PageHeader title="Products" description="The live catalogue. Price changes are recorded with who made them; stock changes go through Inventory."
        actions={<Link to="/products/create"><Button type="primary" icon={<PlusOutlined />}>Add product</Button></Link>} />
      <div className="sv-filters" role="search" aria-label="Product filters">
        <SearchBox label="Search products" placeholder="Product name or SKU" value={values.search} onChange={(value) => table.setFilter('search', value)} />
        <SelectFilter label="Category" placeholder="Category" value={values.category} onChange={(value) => table.setFilter('category', value)} options={CATEGORIES.map((value) => ({ value, label: titleCase(value) }))} />
        <SelectFilter label="Status" placeholder="Status" value={values.active} onChange={(value) => table.setFilter('active', value)} options={[{ value: 'true', label: 'On sale' }, { value: 'false', label: 'Hidden' }]} width={150} />
        <SelectFilter label="Stock" placeholder="Stock" value={values.stock} onChange={(value) => table.setFilter('stock', value)} options={[{ value: 'in', label: 'In stock' }, { value: 'low', label: 'Low stock' }, { value: 'out', label: 'Out of stock' }]} width={150} />
        <DateRangeFilter label="Updated between" from={values.updatedFrom} to={values.updatedTo} onChange={(from, to) => table.setFilters({ updatedFrom: from, updatedTo: to })} />
        <ClearFilters show={table.hasFilters} onClear={table.clearFilters} />
      </div>
      {table.query.isError ? <ErrorState error={table.query.error} onRetry={() => table.query.refetch()} title="Could not load products" /> : (
        <div className="sv-surface flush">
          <Table<ProductRow> {...table.tableProps} columns={columns.map((column) => ('dataIndex' in column && column.dataIndex === table.sort?.field
            ? { ...column, sortOrder: table.sort?.order === 'asc' ? 'ascend' as const : 'descend' as const } : column))}
            locale={{ emptyText: <EmptyState title={table.hasFilters ? 'No products match' : 'No products yet'} description={table.hasFilters ? 'Try different filters.' : 'Add the first product to start selling.'} action={table.hasFilters ? undefined : <Link to="/products/create"><Button type="primary">Add product</Button></Link>} /> }} />
        </div>
      )}
    </>
  );
}
