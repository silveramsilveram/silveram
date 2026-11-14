import { ArrowLeftOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Form, Input, InputNumber, Select, Switch, Table } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { BarChart } from '@/components/charts/BarChart';
import { ErrorState, LoadingBlock, Money, Mono, PageHeader } from '@/components/primitives';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatPaise, formatPaiseCompact, paiseToRupeesInput, rupeesToPaise } from '@/lib/money';
import { CATEGORIES, titleCase } from '@/lib/status';
import { adminApi } from '@/services/api';
import { ApiError } from '@/services/apiClient';
import { useApiQuery } from '@/services/useApiQuery';
import type { MediaAsset, ProductRow } from '@/types/api';
import { MediaManager } from './MediaManager';

interface FormValues {
  sku: string; name: string; description: string; category: string; price: string; stockQuantity: number; active: boolean; priceChangeReason?: string;
}

const stripUrl = ({ url: _url, ...asset }: MediaAsset): Omit<MediaAsset, 'url'> => asset;

export default function ProductFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id = '' } = useParams();
  const product = useApiQuery(['product', id], () => adminApi.product(id), { enabled: mode === 'edit', staleTime: 0 });
  if (mode === 'edit' && product.isLoading) return <LoadingBlock rows={10} />;
  if (mode === 'edit' && (product.isError || !product.data)) return <ErrorState error={product.error} onRetry={() => product.refetch()} title="Could not load this product" />;
  return <ProductForm mode={mode} product={product.data?.product} />;
}

function ProductForm({ mode, product }: { mode: 'create' | 'edit'; product?: ProductRow }) {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [media, setMedia] = useState<MediaAsset[]>(product?.media ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sku = Form.useWatch('sku', form) ?? product?.sku ?? '';
  const priceText = Form.useWatch('price', form) as string | undefined;
  const typedPaise = rupeesToPaise(priceText);

  const initial = useMemo<Partial<FormValues>>(() => (product ? {
    sku: product.sku, name: product.name, description: product.description, category: product.category,
    price: paiseToRupeesInput(product.priceInPaise), stockQuantity: product.stockQuantity, active: product.active,
  } : { category: 'ring', stockQuantity: 0, active: false }), [product]);

  useEffect(() => { setMedia(product?.media ?? []); }, [product]);

  async function save(values: FormValues) {
    const priceInPaise = rupeesToPaise(values.price);
    if (priceInPaise === null || priceInPaise < 1) return;
    const mediaPayload = media.map(stripUrl);
    setError(null);

    const run = async (reason?: string) => {
      setSaving(true);
      try {
        if (mode === 'create') {
          const { product: created } = await adminApi.createProduct({
            sku: values.sku.trim(), name: values.name.trim(), description: values.description.trim(), category: values.category,
            priceInPaise, stockQuantity: values.stockQuantity, active: values.active, ...(mediaPayload.length ? { media: mediaPayload } : {}),
          });
          message.success('Product created');
          await client.invalidateQueries();
          navigate(`/products/edit/${created.id}`);
        } else if (product) {
          await adminApi.updateProduct(product.id, {
            name: values.name.trim(), description: values.description.trim(), category: values.category, priceInPaise, active: values.active,
            media: mediaPayload, ...(priceInPaise !== product.priceInPaise && reason ? { priceChangeReason: reason } : {}),
          });
          message.success('Product saved');
          await client.invalidateQueries();
        }
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : 'Could not save the product.');
      } finally {
        setSaving(false);
      }
    };

    // Price changes and de-activation are high-impact: confirm explicitly before sending.
    const priceChanged = product && priceInPaise !== product.priceInPaise;
    const deactivating = product && product.active && !values.active;
    if (priceChanged || deactivating) {
      let reason = values.priceChangeReason?.trim();
      modal.confirm({
        title: priceChanged ? 'Confirm the new price' : 'Hide this product from the shop?',
        okText: 'Confirm and save',
        width: 480,
        content: (
          <div>
            {priceChanged ? <p>Price changes from <strong>{formatPaise(product.priceInPaise)}</strong> to <strong>{formatPaise(priceInPaise)}</strong>. Orders already placed keep the price they were bought at. This change is added to the permanent price history under your e-mail.</p> : null}
            {deactivating ? <p>The product will disappear from the shop and cannot be bought until you turn it back on.</p> : null}
            {priceChanged ? <Input aria-label="Reason for the price change" placeholder="Reason (optional), e.g. festive pricing" maxLength={200} defaultValue={reason} onChange={(event) => { reason = event.target.value; }} /> : null}
          </div>
        ),
        onOk: () => run(reason),
      });
      return;
    }
    await run();
  }

  const history = useApiQuery(['price-history', product?.id], () => adminApi.priceHistory(product!.id), { enabled: Boolean(product), staleTime: 0 });

  return (
    <>
      <PageHeader
        title={mode === 'create' ? 'Add product' : product?.name ?? 'Edit product'}
        description={<><Link to="/products"><ArrowLeftOutlined /> All products</Link>{product ? <> · <Mono>{product.sku}</Mono> · updated {formatDateTime(product.updatedAt)}</> : null}</>}
      />
      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} role="alert" /> : null}
      <Form form={form} layout="vertical" initialValues={initial} onFinish={save} requiredMark="optional" scrollToFirstError>
        <div className="sv-grid sv-split" style={{ alignItems: 'start' }}>
          <div className="sv-grid">
            <section className="sv-surface" aria-label="Details">
              <h2>Details</h2>
              <Form.Item label="SKU" name="sku" rules={[{ required: true, message: 'A SKU is required.' }, { max: 64 }]}
                extra={mode === 'edit' ? 'The SKU cannot change: product media is stored under it.' : 'Must be unique. Use letters, numbers and dashes.'}>
                <Input className="mono" disabled={mode === 'edit'} maxLength={64} />
              </Form.Item>
              <Form.Item label="Name" name="name" rules={[{ required: true, whitespace: true, message: 'Enter the product name.' }, { max: 160 }]}><Input maxLength={160} /></Form.Item>
              <Form.Item label="Description" name="description" extra="Only facts you have verified. Do not guess purity, weight or hallmark.">
                <Input.TextArea rows={5} maxLength={4000} showCount />
              </Form.Item>
              <Form.Item label="Category" name="category" rules={[{ required: true }]}>
                <Select options={CATEGORIES.map((value) => ({ value, label: titleCase(value) }))} />
              </Form.Item>
            </section>
            <section className="sv-surface" aria-label="Photos and films">
              <h2>Photos & films</h2>
              <MediaManager sku={sku} value={media} onChange={setMedia} disabled={saving} />
            </section>
          </div>
          <div className="sv-grid">
            <section className="sv-surface" aria-label="Price and stock">
              <h2>Price & stock</h2>
              <Form.Item label="Price (₹)" name="price" validateTrigger="onBlur"
                rules={[{ required: true, message: 'Enter a price.' }, { validator: (_, value) => (rupeesToPaise(value) !== null && (rupeesToPaise(value) ?? 0) >= 100 ? Promise.resolve() : Promise.reject(new Error('Enter a price of at least ₹1, with up to 2 decimals.'))) }]}
                extra={typedPaise !== null ? <>Stored as {typedPaise.toLocaleString('en-IN')} paise · shown as <Money paise={typedPaise} /></> : undefined}>
                <Input inputMode="decimal" prefix="₹" className="num" />
              </Form.Item>
              {mode === 'create' ? (
                <Form.Item label="Opening stock" name="stockQuantity" rules={[{ required: true, type: 'number', min: 0, message: 'Stock must be 0 or more.' }]}>
                  <InputNumber min={0} max={1_000_000} precision={0} style={{ width: '100%' }} />
                </Form.Item>
              ) : (
                <Form.Item label="Stock on hand" extra={<Link to={`/inventory?search=${encodeURIComponent(product?.sku ?? '')}`}>Adjust stock in Inventory</Link>}>
                  <strong className="num">{product?.stockQuantity}</strong>
                </Form.Item>
              )}
              <Form.Item label="On sale" name="active" valuePropName="checked" extra="Off keeps it in the catalogue but hides it from the shop."><Switch /></Form.Item>
              <Button type="primary" htmlType="submit" size="large" block loading={saving}>{mode === 'create' ? 'Create product' : 'Save changes'}</Button>
            </section>

            {product ? (
              <section className="sv-surface flush" aria-label="Price history">
                <h2 style={{ padding: '16px 16px 0' }}>Price history</h2>
                {history.isError ? <div style={{ padding: 16 }}><ErrorState error={history.error} onRetry={() => history.refetch()} /></div> : (
                  <div style={{ padding: 16 }}>
                    {history.data && history.data.data.length > 1 ? (
                      <BarChart height={180} ariaLabel={`Price of ${product.name} over time`} format={formatPaise} formatAxis={formatPaiseCompact}
                        series={[{ name: 'Price', color: '#182d49' }]}
                        data={[...history.data.data].reverse().map((row) => ({ key: row.id, label: formatDate(row.changedAt), values: [row.newPriceInPaise] }))} />
                    ) : null}
                    <Table size="small" rowKey="id" pagination={false} loading={history.isLoading} dataSource={history.data?.data ?? []} scroll={{ x: 460 }}
                      locale={{ emptyText: history.data?.trackingStartedAt ? `No price changes recorded for this product. History tracking started on ${formatDate(history.data.trackingStartedAt)}.` : 'History tracking has not recorded any change yet. It starts with the next price change.' }}
                      columns={[
                        { title: 'When', dataIndex: 'changedAt', render: (value: number) => <span className="num">{formatDateTime(value)}</span> },
                        { title: 'From → to', render: (_: unknown, row) => <span className="num">{row.previousPriceInPaise === null ? 'Created at' : formatPaise(row.previousPriceInPaise)} → <strong>{formatPaise(row.newPriceInPaise)}</strong></span> },
                        { title: 'By', dataIndex: 'changedBy', ellipsis: true },
                      ]} />
                    {history.data?.trackingStartedAt ? <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>History tracking started on {formatDate(history.data.trackingStartedAt)}. Earlier price changes were not recorded.</p> : null}
                  </div>
                )}
              </section>
            ) : null}
          </div>
        </div>
      </Form>
    </>
  );
}
