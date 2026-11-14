import { DownloadOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card } from 'antd';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { DateRangeControl, useDateRange } from '@/components/DateRangeControl';
import { PageHeader } from '@/components/primitives';
import { download } from '@/services/apiClient';
import { ApiError } from '@/services/apiClient';

interface ReportDef { kind: string; title: string; description: string; usesRange: boolean; passthrough?: string[] }

const REPORTS: ReportDef[] = [
  { kind: 'orders', title: 'Orders', description: 'One row per order: date, status, shipping, payment method, total, city and delivery dates. Uses the filters from the Orders page when you arrive from there.', usesRange: true, passthrough: ['status', 'paymentMethod', 'shippingStatus'] },
  { kind: 'product-sales', title: 'Product sales', description: 'Units, orders and gross line value per product, using the price at the time of each order.', usesRange: true },
  { kind: 'transactions', title: 'Transactions and refunds', description: 'Payment ledger rows: collections, failed attempts, COD cash and recorded refunds.', usesRange: true, passthrough: ['type', 'status', 'provider'] },
  { kind: 'cod', title: 'COD collections and remittances', description: 'Each COD order with its value, cash recorded as collected and remitted, and what is still outstanding.', usesRange: true },
  { kind: 'inventory', title: 'Inventory', description: 'Current stock on hand for every product.', usesRange: false },
  { kind: 'stock-movements', title: 'Stock movements', description: 'Every stock change with reason and who made it.', usesRange: true },
];

export default function ReportsPage() {
  const { message } = App.useApp();
  const dateRange = useDateRange();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const highlight = params.get('report');

  async function run(report: ReportDef) {
    setBusy(report.kind);
    setErrors((current) => ({ ...current, [report.kind]: '' }));
    const query: Record<string, string> = {};
    if (report.usesRange) {
      // Arriving from a filtered list keeps that list's own date window; otherwise use the period picker.
      query.from = params.get('from') && report.kind === 'orders' && params.get('report') === 'orders' ? (params.get('from') as string) : dateRange.range.from;
      query.to = params.get('to') && report.kind === 'orders' && params.get('report') === 'orders' ? (params.get('to') as string) : dateRange.range.to;
    }
    if (highlight === report.kind) for (const key of report.passthrough ?? []) { const value = params.get(key); if (value) query[key] = value; }
    try {
      const { blob, filename, rows, truncated } = await download(`/admin/reports/${report.kind}.csv`, query);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setDone((current) => ({ ...current, [report.kind]: `${rows.toLocaleString('en-IN')} row${rows === 1 ? '' : 's'} downloaded${truncated ? ' (limit reached: narrow the dates for the rest)' : ''}` }));
      message.success(`${report.title} report ready`);
    } catch (caught) {
      setErrors((current) => ({ ...current, [report.kind]: caught instanceof ApiError ? caught.message : 'The export failed.' }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader title="Reports" description="CSV exports use the same server-side rules and financial definitions as the screens. General reports leave out names, e-mail addresses, phone numbers and street addresses." />
      <div style={{ marginBottom: 16 }}><DateRangeControl {...dateRange} /></div>
      <Alert type="info" showIcon style={{ marginBottom: 16 }} message="Up to 5,000 rows per export. Cells that could run as spreadsheet formulas are neutralised. Dates in the files are ISO (UTC) plus an India-date column." />
      <div className="sv-grid two">
        {REPORTS.map((report) => (
          <Card key={report.kind} title={report.title} styles={{ header: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400 } }}
            style={highlight === report.kind ? { borderColor: 'var(--navy)' } : undefined}>
            <p className="muted">{report.description}</p>
            {errors[report.kind] ? <Alert type="error" showIcon message={errors[report.kind]} style={{ marginBottom: 12 }} role="alert" /> : null}
            <Button type="primary" icon={<DownloadOutlined />} loading={busy === report.kind} disabled={busy !== null && busy !== report.kind} onClick={() => run(report)}>
              {report.usesRange ? 'Download CSV for this period' : 'Download CSV'}
            </Button>
            {done[report.kind] ? <div className="muted" role="status" style={{ marginTop: 8 }}>{done[report.kind]}</div> : null}
          </Card>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 16 }}>Customer summaries are not exported: they would contain personal data that this admin keeps on-screen only.</p>
    </>
  );
}
