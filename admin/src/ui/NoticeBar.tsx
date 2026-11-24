import { WarningOutlined } from '@ant-design/icons';
import { Link } from 'react-router';
import type { AdminStatus } from '@/types/api';

export function NoticeBar({ status }: { status?: AdminStatus }) {
  if (!status) return null;

  const testPayments = status.checkout.testPayments;
  if (!testPayments && status.checkout.live) return null;

  return (
    <aside className="sv-notice-bar" role="status">
      <WarningOutlined aria-hidden />
      <span>
        {testPayments
          ? 'Test payments are on. Turn them off before taking real orders.'
          : 'Orders are paused: customers can browse but cannot place orders.'}
      </span>
      <Link className="sv-notice-action" to="/settings">
        {testPayments ? 'Review checkout' : 'Review settings'}
      </Link>
    </aside>
  );
}
