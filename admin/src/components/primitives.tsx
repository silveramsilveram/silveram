import {
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined, MinusCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { Alert, Button, Empty, Skeleton, Tag, Tooltip } from 'antd';
import type { ReactNode } from 'react';
import { formatPaise } from '@/lib/money';
import { RECONCILIATION, SHIPPING_STATUS, ORDER_STATUS, TX_STATUS, type StatusMeta, type Tone } from '@/lib/status';
import { ApiError } from '@/services/apiClient';

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="sv-page-head">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="sv-page-actions">{actions}</div> : null}
    </div>
  );
}

export const Money = ({ paise, strong }: { paise: number | null | undefined; strong?: boolean }) => (
  <span className={`num${strong ? ' is-strong' : ''}`}>{formatPaise(paise)}</span>
);

export const Mono = ({ children, title }: { children: ReactNode; title?: string }) => <span className="mono" title={title}>{children}</span>;

const TONE: Record<Tone, { className: string; icon: ReactNode }> = {
  neutral: { className: 'is-neutral', icon: <MinusCircleOutlined /> },
  info: { className: 'is-info', icon: <InfoCircleOutlined /> },
  success: { className: 'is-success', icon: <CheckCircleOutlined /> },
  warning: { className: 'is-warning', icon: <ClockCircleOutlined /> },
  danger: { className: 'is-danger', icon: <CloseCircleOutlined /> },
};

/** Text label + icon + tinted border: meaning never depends on colour alone. */
export function StatusTag({ meta, fallback }: { meta: StatusMeta | undefined; fallback: string }) {
  const resolved = meta ?? { label: fallback, tone: 'neutral' as Tone };
  const tone = TONE[resolved.tone];
  const tag = (
    <Tag className={`sv-status-tag ${tone.className}`} icon={tone.icon}>
      {resolved.label}
    </Tag>
  );
  return resolved.hint ? <Tooltip title={resolved.hint}>{tag}</Tooltip> : tag;
}

export const OrderStatusTag = ({ status }: { status: string }) => <StatusTag meta={ORDER_STATUS[status]} fallback={status} />;
export const ShippingTag = ({ status }: { status: string }) => <StatusTag meta={SHIPPING_STATUS[status]} fallback={status} />;
export const TxStatusTag = ({ status }: { status: string }) => <StatusTag meta={TX_STATUS[status]} fallback={status} />;
export const ReconciliationTag = ({ value }: { value: string }) => <StatusTag meta={RECONCILIATION[value]} fallback={value} />;

export function HelpTip({ text }: { text: ReactNode }) {
  return (
    <Tooltip title={text}>
      <QuestionCircleOutlined className="sv-help-tip" aria-label="Definition" tabIndex={0} />
    </Tooltip>
  );
}

export function KpiTile({ label, value, sub, help }: { label: string; value: ReactNode; sub?: ReactNode; help?: ReactNode }) {
  return (
    <div className="sv-kpi">
      <div className="label">{label}{help ? <HelpTip text={help} /> : null}</div>
      <div className="value">{value}</div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  );
}

export function LoadingBlock({ rows = 4 }: { rows?: number }) {
  return <div role="status" aria-live="polite" aria-label="Loading"><Skeleton active paragraph={{ rows }} /></div>;
}

export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<div><strong>{title}</strong>{description ? <div className="muted">{description}</div> : null}</div>}>
      {action}
    </Empty>
  );
}

export function describeError(error: unknown): { message: string; status?: number; network: boolean } {
  if (error instanceof ApiError) return { message: error.message, status: error.status, network: error.network };
  const withStatus = error as { message?: string; statusCode?: number } | null;
  return { message: withStatus?.message ?? 'Something went wrong.', status: withStatus?.statusCode, network: false };
}

export function ErrorState({ error, onRetry, title = 'Could not load this' }: { error: unknown; onRetry?: () => void; title?: string }) {
  const { message, network } = describeError(error);
  return (
    <Alert
      type="error"
      showIcon
      icon={<ExclamationCircleOutlined />}
      message={network ? 'Cannot reach the server' : title}
      description={message}
      action={onRetry ? <Button size="small" onClick={onRetry}>Try again</Button> : undefined}
    />
  );
}

/** "Data available from …" and other honest caveats about what a figure can and cannot say. */
export function Caveats({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="sv-notice" role="note">
      <strong>Read this before relying on the numbers</strong>
      <ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul>
    </div>
  );
}
