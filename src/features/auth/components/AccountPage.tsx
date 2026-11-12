import { useEffect, useState } from 'react';
import { fetchMyOrders } from '@/features/orders/api';
import { saveLastOrder } from '@/features/orders/storage';
import { STATUS_LABEL, type Order } from '@/features/orders/types';
import { orderPath } from '@/shared/hooks/useHashRoute';
import { formatINR } from '@/shared/lib/money';
import { setPageMeta } from '@/shared/lib/seo';
import Button, { buttonClasses } from '@/shared/ui/Button';
import { useAuth } from '../store/authStore';

export default function AccountPage() {
  const { user, status, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setPageMeta({ title: 'Account | Silveram', description: 'Sign in to view your Silveram orders.', noindex: true });
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!user) {
      setOrders(null);
      return;
    }
    let active = true;
    fetchMyOrders()
      .then((rows) => active && setOrders(rows))
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : 'Unable to load your orders.'));
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <div className="page-container pb-20 pt-8 md:pb-28 md:pt-12">
        {status === 'loading' && <p className="type-body text-text-secondary">Loading…</p>}

        {status === 'signedOut' && (
          <div className="mx-auto max-w-md text-center">
            <h1 className="type-h1">Your account</h1>
            <p className="type-body mb-8 mt-3 text-text-secondary">
              Sign in to see your orders and check out faster.
            </p>
            <div className="flex flex-col gap-3">
              <a href="#/signin" className={buttonClasses('primary', 'lg')}>
                Sign in
              </a>
              <a href="#/signup" className={buttonClasses('secondary', 'lg')}>
                Create an account
              </a>
            </div>
            <p className="type-body mt-8 text-text-secondary">
              Ordered as a guest? <a href="#/track" className="underline underline-offset-4">Track your order</a>.
            </p>
          </div>
        )}

        {user && (
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="type-h1">{user.name ? `Hello, ${user.name.split(' ')[0]}` : 'Your account'}</h1>
                <p className="type-body mt-2 text-text-secondary">{user.email}</p>
              </div>
              <Button variant="secondary" size="md" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>

            <h2 className="type-h3 mt-12">Your orders</h2>
            {error && (
              <p className="mt-4 text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            {!error && orders === null && <p className="type-body mt-4 text-text-secondary">Loading your orders…</p>}
            {orders?.length === 0 && (
              <p className="type-body mt-4 text-text-secondary">
                You have not placed an order yet. <a href="#collection" className="underline underline-offset-4">Browse the collection</a>.
              </p>
            )}
            {orders && orders.length > 0 && (
              <ul className="mt-4 divide-y divide-border border-y border-border">
                {orders.map((order) => (
                  <li key={order.id}>
                    <a
                      href={orderPath(order.id)}
                      onClick={() => saveLastOrder(order)}
                      className="flex flex-wrap items-center justify-between gap-3 py-5 hover:bg-surface-secondary/60"
                    >
                      <span>
                        <span className="block font-medium">
                          {order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')}
                        </span>
                        <span className="type-caption text-text-muted">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {' · '}
                          {STATUS_LABEL[order.status].label}
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums text-brand-primary">{formatINR(order.amountInPaise / 100)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
