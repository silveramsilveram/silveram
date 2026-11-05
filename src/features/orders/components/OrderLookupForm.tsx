import { useState, type FormEvent } from 'react';
import Button from '@/shared/ui/Button';
import { orderPath } from '@/shared/hooks/useHashRoute';
import { lookupGuestOrder } from '../api';
import { rememberGuestOrder, saveLastOrder } from '../storage';

/** Lets a guest reopen an order with its reference and the e-mail it was placed with. */
export default function OrderLookupForm({ initialOrderId = '', onFound }: { initialOrderId?: string; onFound?: () => void }) {
  const [orderId, setOrderId] = useState(initialOrderId);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const order = await lookupGuestOrder(orderId.trim(), email.trim().toLowerCase());
      saveLastOrder(order);
      rememberGuestOrder({ id: order.id, email: order.email });
      onFound?.();
      window.location.hash = orderPath(order.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not find that order.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(event) => void submit(event)}>
      <label className="block text-sm font-medium">
        Order reference
        <input className="field mt-1.5 font-mono" value={orderId} onChange={(event) => setOrderId(event.target.value)} maxLength={36} required />
      </label>
      <label className="block text-sm font-medium">
        Email used for the order
        <input className="field mt-1.5" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required />
      </label>
      <Button type="submit" variant="secondary" size="lg" className="w-full" disabled={busy}>
        {busy ? 'Looking up…' : 'Find my order'}
      </Button>
      <p className="min-h-5 text-sm text-danger" role="alert">
        {error}
      </p>
    </form>
  );
}
