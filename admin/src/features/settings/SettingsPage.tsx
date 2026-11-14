import { CheckCircleFilled, CloseCircleFilled, MinusCircleFilled } from '@ant-design/icons';
import { Descriptions, List } from 'antd';
import { ErrorState, LoadingBlock, PageHeader } from '@/components/primitives';
import { loadIdentity } from '@/providers/authProvider';
import { adminApi } from '@/services/api';
import { useApiQuery } from '@/services/useApiQuery';

function State({ ok, onLabel, offLabel }: { ok: boolean; onLabel: string; offLabel: string }) {
  return ok
    ? <span style={{ color: 'var(--success)' }}><CheckCircleFilled aria-hidden /> {onLabel}</span>
    : <span style={{ color: 'var(--danger)' }}><CloseCircleFilled aria-hidden /> {offLabel}</span>;
}
const NotBuilt = ({ children }: { children: React.ReactNode }) => <span className="muted"><MinusCircleFilled aria-hidden /> {children}</span>;

export default function SettingsPage() {
  const me = useApiQuery(['me'], () => loadIdentity(), { staleTime: 60_000 });
  const status = useApiQuery(['status'], () => adminApi.status(), { staleTime: 0 });
  return (
    <>
      <PageHeader title="Settings" description="Your session and a read-only view of what the server has switched on. Secrets are never shown here and cannot be edited from the browser." />
      {status.isLoading || me.isLoading ? <LoadingBlock rows={8} /> : null}
      {status.isError ? <ErrorState error={status.error} onRetry={() => status.refetch()} /> : null}
      <div className="sv-grid two">
        {me.data ? (
          <section className="sv-surface">
            <h2>Your session</h2>
            <Descriptions column={1} size="small" colon={false} items={[
              { key: 'e', label: 'Signed in as', children: me.data.user.email },
              { key: 'p', label: 'Access', children: 'Administrator' },
              { key: 'v', label: 'Admin API version', children: me.data.apiVersion },
              { key: 'tz', label: 'Store time zone', children: `${me.data.store.timezone} (UTC+05:30)` },
              { key: 'c', label: 'Currency', children: `${me.data.store.currency} (amounts are stored as integer paise)` },
              { key: 'l', label: 'Low-stock threshold', children: `${me.data.store.lowStockThreshold} units (set on the server with LOW_STOCK_THRESHOLD)` },
            ]} />
          </section>
        ) : null}
        {status.data ? (
          <>
            <section className="sv-surface">
              <h2>Integrations</h2>
              <Descriptions column={1} size="small" colon={false} items={[
                { key: 'env', label: 'Environment', children: status.data.environment },
                { key: 'aw', label: 'Appwrite database', children: <State ok={status.data.integrations.appwrite.schemaReady} onLabel="Connected, admin schema ready" offLabel={`Admin schema missing: ${status.data.integrations.appwrite.missing.join(', ')}`} /> },
                { key: 'cl', label: 'Cloudinary media', children: <State ok={status.data.integrations.cloudinary.configured} onLabel={`Configured (folder ${status.data.integrations.cloudinary.rootFolder})`} offLabel="Not configured: uploads are unavailable" /> },
                { key: 'em', label: 'E-mail (Mailjet/SMTP)', children: <State ok={status.data.integrations.email.configured} onLabel="Configured" offLabel="Not configured: no confirmation e-mails or sign-in codes" /> },
                { key: 'cf', label: 'Cashfree payments', children: status.data.integrations.cashfree.enabled ? <State ok onLabel={`Enabled (${status.data.integrations.cashfree.mode})`} offLabel="" /> : <NotBuilt>Disabled</NotBuilt> },
              ]} />
            </section>
            <section className="sv-surface">
              <h2>Checkout</h2>
              <Descriptions column={1} size="small" colon={false} items={[
                { key: 'live', label: 'Live checkout', children: status.data.checkout.live ? 'On' : 'Off' },
                { key: 'cod', label: 'Cash on delivery', children: status.data.checkout.cod ? 'Available' : 'Off' },
                { key: 'test', label: 'Test payments', children: status.data.checkout.testPayments ? 'On: turn off before launch' : 'Off' },
                { key: 'ad', label: 'Administrators', children: `${status.data.adminCount} e-mail address(es) on the server allow-list` },
              ]} />
              <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>These are controlled by server environment variables and are not changed from the admin.</p>
            </section>
            <section className="sv-surface">
              <h2>Not built (by design)</h2>
              <List size="small" dataSource={[
                ['Refunds from the admin', status.data.capabilities.refunds],
                ['Cashfree settlement reconciliation', status.data.capabilities.settlements],
                ['Live courier tracking', status.data.capabilities.courierTracking],
                ['Partial COD collection', status.data.capabilities.partialCodCollection],
              ] as [string, boolean][]} renderItem={([label, enabled]) => <List.Item><NotBuilt>{label}: {enabled ? 'available' : 'not available'}</NotBuilt></List.Item>} />
            </section>
          </>
        ) : null}
      </div>
    </>
  );
}
