import { useEffect, useState } from 'react';
import OrderLookupForm from '@/features/orders/components/OrderLookupForm';
import { fetchMyOrders } from '@/features/orders/api';
import { saveLastOrder } from '@/features/orders/storage';
import { STATUS_LABEL, type Order } from '@/features/orders/types';
import { orderPath } from '@/shared/hooks/useHashRoute';
import { formatINR } from '@/shared/lib/money';
import { setPageMeta } from '@/shared/lib/seo';
import Button from '@/shared/ui/Button';
import { useAuth } from '../context/AuthContext';
import AuthForm from './AuthForm';

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
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <section aria-labelledby="account-heading">
              <h1 id="account-heading" className="type-h1">
                Your account
              </h1>
              <p className="type-body mt-3 mb-8 max-w-md text-text-secondary">
                Sign in or create an account to see your orders and check out faster. You can always check out as a guest too.
              </p>
              <div className="max-w-md">
                <AuthForm />
              </div>
            </section>
            <section aria-labelledby="track-heading" className="max-w-md">
              <h2 id="track-heading" className="type-h3">
                Placed an order as a guest?
              </h2>
              <p className="type-body mt-3 mb-6 text-text-secondary">
                Find it with your order reference and email address.
              </p>
              <OrderLookupForm />
            </section>
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
