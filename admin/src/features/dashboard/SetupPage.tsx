import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Alert } from 'antd';
import { Link } from 'react-router';
import { ErrorState, LoadingBlock, PageHeader } from '@/components/primitives';
import { adminApi } from '@/services/api';
import { useApiQuery } from '@/services/useApiQuery';
import { setupItems } from '@/ui/SetupProgress';

export default function SetupPage() {
  const query = useApiQuery(['status'], () => adminApi.status());

  return (
    <>
      <PageHeader title="Store setup" description="Review the connections and checkout switches used by your store." />
      {query.isLoading ? <LoadingBlock rows={5} /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} title="Could not load store setup" /> : null}
      {query.data ? (
        <section className="sv-surface sv-setup-page">
          <h2>Readiness</h2>
          <ul className="sv-setup-list">
            {setupItems(query.data).map((item) => (
              <li key={item.label} className={item.done ? 'is-done' : 'is-pending'}>
                {item.done ? <CheckCircleOutlined aria-hidden /> : <CloseCircleOutlined aria-hidden />}
                <span>{item.label}</span>
                <strong>{item.done ? 'Ready' : 'Needs attention'}</strong>
              </li>
            ))}
          </ul>
          {query.data.checkout.testPayments ? (
            <Alert type="warning" showIcon message="Test payments are on. Turn them off before taking real orders." />
          ) : null}
          <p className="sv-setup-note">These settings are managed by the store administrator and are shown here for review.</p>
          <Link to="/settings">Review settings</Link>
        </section>
      ) : null}
    </>
  );
}
