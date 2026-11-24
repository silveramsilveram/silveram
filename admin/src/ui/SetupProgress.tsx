import { RightOutlined } from '@ant-design/icons';
import { Link } from 'react-router';
import type { AdminStatus } from '@/types/api';

type SetupItem = { label: string; done: boolean };

export function setupItems(status: AdminStatus): SetupItem[] {
  return [
    { label: 'Database ready', done: status.integrations.appwrite.schemaReady },
    { label: 'Product images configured', done: status.integrations.cloudinary.configured },
    { label: 'Customer email configured', done: status.integrations.email.configured },
    { label: 'Cash on delivery available', done: status.checkout.cod },
    { label: 'Orders open', done: status.checkout.live },
  ];
}

export function SetupProgress({ status }: { status?: AdminStatus }) {
  if (!status) return null;
  const items = setupItems(status);
  const completed = items.filter((item) => item.done).length;
  if (completed === items.length) return null;

  return (
    <Link className="sv-setup-progress" to="/setup" aria-label={`Finish setting up your store, ${completed} of ${items.length} complete`}>
      <span className="sv-setup-heading">Finish setting up your store <RightOutlined aria-hidden /></span>
      <progress className="sv-progress-track" value={completed} max={items.length} aria-label="Store setup progress" />
      <span className="sv-setup-caption">{completed} of {items.length} done</span>
      <span className="sr-only">{items.filter((item) => item.done).map((item) => item.label).join(', ') || 'No setup steps complete yet.'}</span>
    </Link>
  );
}
