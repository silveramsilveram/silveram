import { Alert, App, Button, Checkbox, Descriptions, Form, Input, InputNumber, Tag } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { ErrorState, LoadingBlock, Money, Mono, PageHeader } from '@/components/primitives';
import { formatDateTime, msToIstInput, istInputToMs } from '@/lib/dates';
import { adminApi } from '@/services/api';
import { useApiQuery } from '@/services/useApiQuery';
import { ApiError } from '@/services/apiClient';
import type { CashfreeSettlement, TransactionRow } from '@/types/api';

function amountInPaise(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? undefined : Math.round(value * 100);
}

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
}

export function CashfreeRefundsPage() {
  const { message } = App.useApp();
  const client = useQueryClient();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refunds = useApiQuery(['cashfree-refunds'], () => adminApi.transactions({ type: 'refund', provider: 'cashfree', limit: 50, page: 1 }), { staleTime: 0 });

  async function submit(values: {
    orderId: string; providerRefundId: string; amountInRupees: number; occurredAt: string; reason: string; confirmed: boolean;
  }) {
    const occurredAt = istInputToMs(values.occurredAt);
    const amount = amountInPaise(values.amountInRupees);
    if (!occurredAt || amount === undefined) {
      setError('Enter the refund date and amount.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await adminApi.recordCashfreeRefund({
        orderId: values.orderId.trim(),
        providerRefundId: values.providerRefundId.trim(),
        amountInPaise: amount,
        occurredAt,
        reason: values.reason.trim(),
        confirmed: values.confirmed,
      });
      form.resetFields();
      form.setFieldValue('occurredAt', msToIstInput(Date.now()));
      message.success(result.duplicate ? 'This refund is already in the ledger' : 'Cashfree refund recorded');
      await client.invalidateQueries();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Cashfree refunds" description="Record a refund only after Cashfree shows it as successful. This adds an audited ledger entry and does not call Cashfree or move money." />
      <div className="sv-grid sv-form-split">
        <section className="sv-surface">
          <h2>Record completed refund</h2>
          <Alert className="sv-cashfree-guidance" type="warning" showIcon message="Confirm the provider status first" description="Use the Cashfree refund reference and exact completed amount. The entry is permanent and affects net-collected reporting." />
          {error ? <Alert className="sv-cashfree-error" type="error" showIcon message={error} role="alert" /> : null}
          <Form form={form} layout="vertical" onFinish={submit} initialValues={{ occurredAt: msToIstInput(Date.now()) }}>
            <Form.Item name="orderId" label="Silveram order reference" rules={[{ required: true }, { max: 36 }]}>
              <Input autoComplete="off" className="mono" />
            </Form.Item>
            <Form.Item name="providerRefundId" label="Cashfree refund ID" rules={[{ required: true }, { max: 100 }, { pattern: /^[A-Za-z0-9._-]+$/, message: 'Use the ID shown in Cashfree.' }]}>
              <Input autoComplete="off" className="mono" />
            </Form.Item>
            <Form.Item name="amountInRupees" label="Completed amount (INR)" rules={[{ required: true, type: 'number', min: 0.01 }]}>
              <InputNumber className="sv-cashfree-number" min={0.01} precision={2} step={0.01} />
            </Form.Item>
            <Form.Item name="occurredAt" label="Completed at (India time)" rules={[{ required: true }]}>
              <Input type="datetime-local" max={msToIstInput(Date.now())} />
            </Form.Item>
            <Form.Item name="reason" label="Reason for the refund" rules={[{ required: true }, { min: 3, max: 300 }]}>
              <Input.TextArea rows={3} maxLength={300} showCount />
            </Form.Item>
            <Form.Item name="confirmed" valuePropName="checked" rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error('Confirm that Cashfree shows this refund as successful.')) }]}>
              <Checkbox>I have verified that this refund completed successfully in Cashfree.</Checkbox>
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>Record completed refund</Button>
          </Form>
        </section>
        <section className="sv-surface flush">
          <h2 className="sv-table-title">Recent Cashfree refunds</h2>
          {refunds.isLoading ? <LoadingBlock rows={5} /> : null}
          {refunds.isError ? <ErrorState error={refunds.error} onRetry={() => refunds.refetch()} title="Could not load refunds" /> : null}
          {refunds.data ? (
            <DataTable<TransactionRow>
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              dataSource={refunds.data.data}
              scroll={{ x: 700 }}
              locale={{ emptyText: 'No completed Cashfree refunds have been recorded.' }}
              columns={[
                { title: 'Completed', dataIndex: 'occurredAt', width: 155, render: (value: number) => formatDateTime(value) },
                { title: 'Order', dataIndex: 'orderId', width: 130, render: (value: string) => <Mono>{value}</Mono> },
                { title: 'Refund ID', dataIndex: 'providerRefundId', width: 150, render: (value: string | null) => <Mono>{value ?? '—'}</Mono> },
                { title: 'Amount', dataIndex: 'amountInPaise', align: 'right', width: 115, render: (value: number) => <Money paise={-value} strong /> },
                { title: 'Recorded as', dataIndex: 'reconciliation', width: 150, render: (value: string) => <Tag>{value === 'provider_verified' ? 'Cashfree webhook' : 'Operator recorded'}</Tag> },
              ]}
            />
          ) : null}
        </section>
      </div>
    </>
  );
}

export function CashfreeSettlementsPage() {
  const { message } = App.useApp();
  const client = useQueryClient();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adjustments = Form.useWatch('adjustmentsInRupees', form) ?? 0;
  const gross = Form.useWatch('grossInRupees', form) ?? 0;
  const fees = Form.useWatch('feesInRupees', form) ?? 0;
  const tax = Form.useWatch('taxInRupees', form) ?? 0;
  const bank = Form.useWatch('bankReceivedInRupees', form) ?? 0;
  const net = Number(gross) - Number(fees) - Number(tax) + Number(adjustments);
  const difference = Number(bank) - net;
  const settlements = useApiQuery(['cashfree-settlements'], () => adminApi.cashfreeSettlements({ limit: 100, page: 1 }), { staleTime: 0 });

  async function submit(values: {
    settlementId: string; settledAt: string; grossInRupees: number; feesInRupees: number; taxInRupees: number;
    adjustmentsInRupees?: number; bankReceivedInRupees: number; bankUtr: string; note?: string;
  }) {
    const settledAt = istInputToMs(values.settledAt);
    const grossInPaise = amountInPaise(values.grossInRupees);
    const feesInPaise = amountInPaise(values.feesInRupees);
    const taxInPaise = amountInPaise(values.taxInRupees);
    const adjustmentsInPaise = amountInPaise(values.adjustmentsInRupees ?? 0);
    const bankReceivedInPaise = amountInPaise(values.bankReceivedInRupees);
    if (!settledAt || grossInPaise === undefined || feesInPaise === undefined || taxInPaise === undefined || adjustmentsInPaise === undefined || bankReceivedInPaise === undefined) {
      setError('Enter the settlement date and all payout amounts.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await adminApi.recordCashfreeSettlement({
        settlementId: values.settlementId.trim(),
        settledAt,
        grossInPaise,
        feesInPaise,
        taxInPaise,
        adjustmentsInPaise,
        bankReceivedInPaise,
        bankUtr: values.bankUtr.trim(),
        note: values.note?.trim() || undefined,
      });
      form.resetFields();
      form.setFieldValue('settledAt', msToIstInput(Date.now()));
      message.success(result.duplicate ? 'This settlement is already recorded' : 'Cashfree settlement recorded');
      await client.invalidateQueries();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Cashfree settlements" description="Enter the settlement figures from Cashfree and compare its net payout with the bank deposit. These records do not add revenue or change payment transactions." />
      <div className="sv-grid sv-form-split">
        <section className="sv-surface">
          <h2>Reconcile a bank payout</h2>
          <Alert className="sv-cashfree-guidance" type="info" showIcon message="Manual record" description="Enter one completed settlement batch at a time. Cashfree gross less fees and tax, plus adjustments, is compared with the bank amount; the UTR and difference are retained for audit." />
          {error ? <Alert className="sv-cashfree-error" type="error" showIcon message={error} role="alert" /> : null}
          <Form form={form} layout="vertical" onFinish={submit} initialValues={{ settledAt: msToIstInput(Date.now()), adjustmentsInRupees: 0 }}>
            <Form.Item name="settlementId" label="Cashfree settlement ID" rules={[{ required: true }, { max: 100 }, { pattern: /^[A-Za-z0-9][A-Za-z0-9._-]*$/, message: 'Use the ID shown in Cashfree.' }]}>
              <Input autoComplete="off" className="mono" />
            </Form.Item>
            <Form.Item name="settledAt" label="Settlement date (India time)" rules={[{ required: true }]}>
              <Input type="datetime-local" max={msToIstInput(Date.now())} />
            </Form.Item>
            <div className="sv-settlement-fields">
              <Form.Item name="grossInRupees" label="Gross (INR)" rules={[{ required: true, type: 'number', min: 0 }]}>
                <InputNumber className="sv-cashfree-number" min={0} precision={2} step={0.01} />
              </Form.Item>
              <Form.Item name="feesInRupees" label="Fees (INR)" rules={[{ required: true, type: 'number', min: 0 }]}>
                <InputNumber className="sv-cashfree-number" min={0} precision={2} step={0.01} />
              </Form.Item>
              <Form.Item name="taxInRupees" label="Tax (INR)" rules={[{ required: true, type: 'number', min: 0 }]}>
                <InputNumber className="sv-cashfree-number" min={0} precision={2} step={0.01} />
              </Form.Item>
              <Form.Item name="adjustmentsInRupees" label="Adjustments (+ / − INR)">
                <InputNumber className="sv-cashfree-number" precision={2} step={0.01} />
              </Form.Item>
            </div>
            <Descriptions size="small" column={1} colon={false} items={[
              { key: 'net', label: 'Expected Cashfree payout', children: <Money paise={amountInPaise(net)} strong /> },
            ]} />
            <Form.Item name="bankReceivedInRupees" label="Amount received in bank (INR)" rules={[{ required: true, type: 'number', min: 0 }]}>
              <InputNumber min={0} precision={2} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
            <Descriptions size="small" column={1} colon={false} items={[
              { key: 'difference', label: 'Difference (bank − Cashfree)', children: <Money paise={amountInPaise(difference)} strong /> },
            ]} />
            <Form.Item name="bankUtr" label="Bank UTR / transfer reference" rules={[{ required: true }, { max: 100 }]}>
              <Input autoComplete="off" className="mono" />
            </Form.Item>
            <Form.Item name="note" label="Note"><Input.TextArea rows={2} maxLength={300} showCount /></Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>Save reconciliation</Button>
          </Form>
        </section>
        <section className="sv-surface flush">
          <h2 className="sv-table-title">Recent settlements</h2>
          {settlements.isLoading ? <LoadingBlock rows={5} /> : null}
          {settlements.isError ? <ErrorState error={settlements.error} onRetry={() => settlements.refetch()} title="Could not load settlements" /> : null}
          {settlements.data ? (
            <DataTable<CashfreeSettlement>
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              dataSource={settlements.data.data}
              scroll={{ x: 650 }}
              locale={{ emptyText: 'No Cashfree settlements have been reconciled.' }}
              columns={[
                { title: 'Settlement', dataIndex: 'settlementId', width: 180, render: (value: string) => <Mono>{value}</Mono> },
                { title: 'Date', dataIndex: 'settledAt', width: 150, render: (value: number) => formatDateTime(value) },
                { title: 'Cashfree net', dataIndex: 'netPayoutInPaise', align: 'right', width: 130, render: (value: number) => <Money paise={value} /> },
                { title: 'Bank received', dataIndex: 'bankReceivedInPaise', align: 'right', width: 130, render: (value: number) => <Money paise={value} /> },
                { title: 'Difference', dataIndex: 'differenceInPaise', align: 'right', width: 120, render: (value: number) => value === 0 ? <Tag color="success">Matched</Tag> : <Money paise={value} strong /> },
              ]}
            />
          ) : null}
        </section>
      </div>
    </>
  );
}
