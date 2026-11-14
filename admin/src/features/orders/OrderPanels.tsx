import { useQueryClient } from '@tanstack/react-query';
import { App, Alert, Button, DatePicker, Descriptions, Form, Input, Modal, Popconfirm, Select, Space } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Money } from '@/components/primitives';
import { DAY_MS, formatDateTime, istInputToMs, msToIstInput, startOfDayIst, ymdIst } from '@/lib/dates';
import { SHIPPING_STATUS } from '@/lib/status';
import { adminApi } from '@/services/api';
import { ApiError } from '@/services/apiClient';
import type { OrderDetail, ShippingStatus } from '@/types/api';

const FLOW: ShippingStatus[] = ['pending', 'processing', 'packed', 'dispatched', 'out_for_delivery', 'delivered'];
/** Promised dates are whole days: the promise holds until the end of that India calendar day. */
const endOfDayIst = (ymd: string) => (startOfDayIst(ymd) ?? 0) + DAY_MS - 60_000;

/** After any write, drop every cached read so lists, KPIs and charts never show stale numbers. */
export function useRefreshAll() {
  const client = useQueryClient();
  return () => client.invalidateQueries();
}

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

export function FulfilmentPanel({ order }: { order: OrderDetail }) {
  const { message } = App.useApp();
  const refresh = useRefreshAll();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shippable = ['placed_cod', 'paid', 'fulfilled'].includes(order.status) && !order.isTest;
  const currentIndex = FLOW.indexOf(order.shippingStatus);
  const nextOptions = FLOW.slice(currentIndex + 1).filter((status) => status !== 'delivered' || currentIndex >= FLOW.indexOf('dispatched'));
  const target = Form.useWatch('shippingStatus', form) as ShippingStatus | undefined;

  async function submit(values: Record<string, string | undefined | { format: (pattern: string) => string }>) {
    setSaving(true);
    setError(null);
    const dateOf = (field: string) => {
      const value = values[field] as { format: (pattern: string) => string } | undefined;
      return value ? endOfDayIst(value.format('YYYY-MM-DD')) : undefined;
    };
    const actual = (field: string) => {
      const raw = values[field] as string | undefined;
      return raw ? istInputToMs(raw) ?? undefined : undefined;
    };
    const body: Record<string, unknown> = {
      ifUpdatedAt: order.updatedAt,
      ...(values.shippingStatus ? { shippingStatus: values.shippingStatus } : {}),
      ...(dateOf('expectedDispatchAt') !== undefined ? { expectedDispatchAt: dateOf('expectedDispatchAt') } : {}),
      ...(dateOf('estimatedDeliveryAt') !== undefined ? { estimatedDeliveryAt: dateOf('estimatedDeliveryAt') } : {}),
      ...(values.carrier !== undefined && values.carrier !== (order.carrier ?? '') ? { carrier: (values.carrier as string) || null } : {}),
      ...(values.trackingNumber !== undefined && values.trackingNumber !== (order.trackingNumber ?? '') ? { trackingNumber: (values.trackingNumber as string) || null } : {}),
      ...(values.trackingUrl !== undefined && values.trackingUrl !== (order.trackingUrl ?? '') ? { trackingUrl: (values.trackingUrl as string) || null } : {}),
      ...(values.shippingStatus === 'dispatched' && actual('dispatchedAt') ? { dispatchedAt: actual('dispatchedAt') } : {}),
      ...(values.shippingStatus === 'delivered' && actual('deliveredAt') ? { deliveredAt: actual('deliveredAt') } : {}),
      ...(values.note ? { note: values.note } : {}),
    };
    try {
      await adminApi.updateFulfilment(order.id, body);
      message.success('Shipping details saved');
      form.resetFields(['shippingStatus', 'dispatchedAt', 'deliveredAt', 'note']);
      await refresh();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSaving(false);
    }
  }

  if (!shippable) {
    return <Alert type="info" showIcon message="Shipping is not available for this order" description={order.isTest ? 'Test-payment orders are never shipped.' : 'Only accepted cash-on-delivery orders and paid orders can be shipped.'} />;
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={submit}
      initialValues={{
        carrier: order.carrier ?? '', trackingNumber: order.trackingNumber ?? '', trackingUrl: order.trackingUrl ?? '',
        expectedDispatchAt: order.expectedDispatchAt ? dayjs(ymdIst(order.expectedDispatchAt)) : undefined,
        estimatedDeliveryAt: order.estimatedDeliveryAt ? dayjs(ymdIst(order.estimatedDeliveryAt)) : undefined,
      }}
    >
      {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} role="alert" /> : null}
      <Descriptions size="small" column={1} colon={false} style={{ marginBottom: 12 }} items={[
        { key: 's', label: 'Shipping now', children: SHIPPING_STATUS[order.shippingStatus]?.label },
        { key: 'd', label: 'Dispatched at', children: formatDateTime(order.dispatchedAt) },
        { key: 'v', label: 'Delivered at', children: formatDateTime(order.deliveredAt) },
      ]} />
      {order.shippingStatus !== 'delivered' ? (
        <Form.Item name="shippingStatus" label="Move shipment to">
          <Select allowClear placeholder="Keep as is" options={nextOptions.map((status) => ({ value: status, label: SHIPPING_STATUS[status].label }))} />
        </Form.Item>
      ) : null}
      {target === 'dispatched' ? <Form.Item name="dispatchedAt" label="Dispatched at (India time)" extra="Leave empty to use the current time."><Input type="datetime-local" max={msToIstInput(Date.now())} /></Form.Item> : null}
      {target === 'delivered' ? <Form.Item name="deliveredAt" label="Delivered at (India time)" extra="Only mark delivered once delivery is confirmed. Leave empty to use the current time."><Input type="datetime-local" max={msToIstInput(Date.now())} /></Form.Item> : null}
      <Space wrap style={{ width: '100%' }} size={12}>
        <Form.Item name="expectedDispatchAt" label="Expected dispatch"><DatePicker /></Form.Item>
        <Form.Item name="estimatedDeliveryAt" label="Estimated delivery"><DatePicker /></Form.Item>
      </Space>
      <Form.Item name="carrier" label="Courier (entered manually)"><Input maxLength={60} /></Form.Item>
      <Form.Item name="trackingNumber" label="Tracking number (entered manually)"><Input maxLength={80} className="mono" /></Form.Item>
      <Form.Item name="trackingUrl" label="Tracking link" rules={[{ pattern: /^https:\/\/\S+$/, message: 'Use a full https:// link.' }]}><Input maxLength={300} /></Form.Item>
      <Form.Item name="note" label="Note for the timeline"><Input.TextArea rows={2} maxLength={300} showCount /></Form.Item>
      <Button type="primary" htmlType="submit" loading={saving}>Save shipping details</Button>
      <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>Courier and tracking details are maintained by hand. Silveram does not have a live courier feed.</p>
    </Form>
  );
}

export function ShippingNote({ orderId }: { orderId: string }) {
  const { message } = App.useApp();
  const refresh = useRefreshAll();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <Space.Compact style={{ width: '100%' }}>
      <Input aria-label="Add a shipping note" placeholder="Add a note to the timeline" maxLength={300} value={text} onChange={(event) => setText(event.target.value)} />
      <Button loading={saving} disabled={!text.trim()} onClick={async () => {
        setSaving(true);
        try { await adminApi.addShippingNote(orderId, text.trim()); setText(''); message.success('Note added'); await refresh(); }
        catch (caught) { message.error(errorText(caught)); } finally { setSaving(false); }
      }}>Add</Button>
    </Space.Compact>
  );
}

export function CodPanel({ order }: { order: OrderDetail }) {
  const { message } = App.useApp();
  const refresh = useRefreshAll();
  const [mode, setMode] = useState<'collect' | 'remit' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();
  if (order.paymentMethod !== 'cod') return null;
  const outstanding = Math.max(0, order.amountInPaise - order.codCollectedInPaise);
  const canCollect = ['placed_cod', 'fulfilled'].includes(order.status) && order.codCollectedInPaise === 0 && ['dispatched', 'out_for_delivery', 'delivered'].includes(order.shippingStatus);
  const canRemit = order.codCollectedInPaise > 0 && order.codRemittedInPaise === 0;

  async function submit(values: { at?: string; reference?: string; note?: string }) {
    setSaving(true);
    setError(null);
    const body = { ifUpdatedAt: order.updatedAt, ...(values.at ? { at: istInputToMs(values.at) ?? undefined } : {}), reference: values.reference || undefined, note: values.note || undefined };
    try {
      await (mode === 'collect' ? adminApi.recordCodCollection(order.id, body) : adminApi.recordCodRemittance(order.id, body));
      message.success(mode === 'collect' ? 'Cash collection recorded' : 'Remittance recorded');
      setMode(null);
      form.resetFields();
      await refresh();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Descriptions size="small" column={1} colon={false} items={[
        { key: 'v', label: 'Order value (owed to Silveram)', children: <Money paise={order.amountInPaise} strong /> },
        { key: 'c', label: 'Cash recorded as collected', children: <Money paise={order.codCollectedInPaise} /> },
        { key: 'r', label: 'Cash recorded as remitted', children: <Money paise={order.codRemittedInPaise} /> },
        { key: 'o', label: 'Still to collect', children: <Money paise={outstanding} strong /> },
      ]} />
      <Space wrap style={{ marginTop: 12 }}>
        <Button disabled={!canCollect} onClick={() => setMode('collect')}>Record cash collected</Button>
        <Button disabled={!canRemit} onClick={() => setMode('remit')}>Record remittance</Button>
      </Space>
      {!canCollect && order.codCollectedInPaise === 0 ? <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>Cash can be recorded once the order has been dispatched. The full order value is recorded; partial collection is not supported.</p> : null}
      <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>Entries are recorded by an operator and are not bank-verified.</p>
      <Modal
        open={mode !== null}
        title={mode === 'collect' ? 'Record cash collected' : 'Record cash remitted to Silveram'}
        okText="Record" confirmLoading={saving} onCancel={() => { setMode(null); setError(null); }} onOk={() => form.submit()} destroyOnHidden
      >
        <p>{mode === 'collect' ? <>You are confirming that <strong><Money paise={order.amountInPaise} /></strong> in cash was received for this order.</> : <>You are confirming that <strong><Money paise={order.codCollectedInPaise} /></strong> was handed over to Silveram.</>} This cannot be edited afterwards.</p>
        {error ? <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} role="alert" /> : null}
        <Form form={form} layout="vertical" onFinish={submit} initialValues={{ at: msToIstInput(Date.now()) }}>
          <Form.Item name="at" label="When (India time)"><Input type="datetime-local" max={msToIstInput(Date.now())} /></Form.Item>
          <Form.Item name="reference" label={mode === 'collect' ? 'Courier receipt / reference' : 'Transfer reference (UTR / receipt)'}><Input maxLength={120} /></Form.Item>
          <Form.Item name="note" label="Note"><Input.TextArea rows={2} maxLength={300} showCount /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export function CancelOrderButton({ order }: { order: OrderDetail }) {
  const { message } = App.useApp();
  const refresh = useRefreshAll();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (order.status !== 'placed_cod' || order.codCollectedInPaise > 0) return null;
  return (
    <Popconfirm
      title="Cancel this COD order?"
      description={<div style={{ maxWidth: 280 }}>
        <p style={{ margin: '0 0 8px' }}>The reserved stock goes back on sale, exactly once. This cannot be undone.</p>
        <Input.TextArea rows={2} maxLength={300} placeholder="Reason (optional)" value={note} onChange={(event) => setNote(event.target.value)} aria-label="Cancellation reason" />
      </div>}
      okText="Cancel order" okButtonProps={{ danger: true, loading: busy }} cancelText="Keep order"
      onConfirm={async () => {
        setBusy(true);
        try { await adminApi.cancelOrder(order.id, note.trim() || undefined); message.success('Order cancelled and stock restored'); await refresh(); }
        catch (caught) { message.error(errorText(caught)); } finally { setBusy(false); }
      }}
    >
      <Button danger>Cancel order</Button>
    </Popconfirm>
  );
}
