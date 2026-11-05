import { useEffect, useState, type FormEvent } from 'react';
import { setAfterAuth } from '@/features/auth/redirect';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCart } from '@/features/cart/context/CartContext';
import { syncCart } from '@/features/cart/lib/syncCart';
import { isCheckoutEnabled } from '@/shared/lib/api';
import { setPageMeta } from '@/shared/lib/seo';
import Button, { buttonClasses } from '@/shared/ui/Button';
import { useCheckout } from '../context/CheckoutContext';
import { INDIAN_STATES } from '../data/states';
import { EMAIL_PATTERN, normalizePhone } from '../lib/validation';
import { CheckoutFrame } from './CheckoutLayout';

/** Checkout page 1 of 2: who is buying and where to deliver. Guests need no account. */
export default function CheckoutDetailsPage() {
  const { user, status: authStatus, signOut } = useAuth();
  const { cart } = useCart();
  const { info, setInfo } = useCheckout();

  const [guestEmail, setGuestEmail] = useState(info?.email ?? '');
  const [fullName, setFullName] = useState(info?.fullName ?? '');
  const [phone, setPhone] = useState(info?.phone ?? '');
  const [address, setAddress] = useState(info?.address ?? '');
  const [city, setCity] = useState(info?.city ?? '');
  const [state, setState] = useState(info?.state ?? '');
  const [postalCode, setPostalCode] = useState(info?.postalCode ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    setPageMeta({ title: 'Checkout details | Silveram', description: 'Enter your delivery details.', noindex: true });
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (user?.name) setFullName((current) => current || user.name);
  }, [user]);

  const email = user ? user.email : guestEmail.trim().toLowerCase();

  /** Guests: as soon as we have their e-mail (and later phone) save it, with the bag, in Appwrite. */
  const captureGuestContact = () => {
    if (user || !EMAIL_PATTERN.test(email)) return;
    void syncCart({ email, name: fullName.trim() || undefined, phone: normalizePhone(phone) || undefined, cart });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    let problem = '';
    if (!user && !EMAIL_PATTERN.test(email)) problem = 'Enter a valid email address for your order confirmation.';
    else if (!fullName.trim()) problem = 'Enter the recipient’s full name.';
    else if (!normalizePhone(phone)) problem = 'Enter a valid 10-digit Indian mobile number.';
    else if (!address.trim()) problem = 'Enter your delivery address.';
    else if (!city.trim()) problem = 'Enter your city.';
    else if (!state) problem = 'Select your state.';
    else if (!/^\d{6}$/.test(postalCode)) problem = 'Enter a valid six-digit PIN code.';
    if (problem) {
      setError(problem);
      return;
    }
    setInfo({
      email: user ? '' : email,
      fullName: fullName.trim(),
      phone: normalizePhone(phone),
      address: address.trim(),
      city: city.trim(),
      state,
      postalCode,
    });
    window.location.hash = '#/checkout/payment';
  };

  if (!isCheckoutEnabled) {
    return (
      <main id="main-content" tabIndex={-1} className="page-container pb-24 pt-12 focus:outline-none">
        <h1 className="type-h1">Checkout</h1>
        <p className="type-body-lg mt-4 max-w-xl text-text-secondary">
          Online checkout is opening soon. Please check back shortly, or contact us if you have a question.
        </p>
        <a href="#/shop" className={buttonClasses('primary', 'lg', 'mt-8')}>
          Continue browsing
        </a>
      </main>
    );
  }

  if (cart.length === 0) {
    return (
      <main id="main-content" tabIndex={-1} className="page-container pb-24 pt-12 focus:outline-none">
        <h1 className="type-h1">Checkout</h1>
        <p className="type-body-lg mt-4 text-text-secondary">Your bag is empty. Add a piece to begin.</p>
        <a href="#/shop" className={buttonClasses('primary', 'lg', 'mt-8')}>
          Shop the collection
        </a>
      </main>
    );
  }

  return (
    <CheckoutFrame step={1} title="Your details">
      <form className="space-y-10" onSubmit={submit} noValidate>
        <section aria-labelledby="contact-heading" className="space-y-4">
          <h2 id="contact-heading" className="text-lg font-medium">
            Contact
          </h2>
          {user ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-surface-white p-4 text-sm">
              <span>
                Signed in as <strong>{user.email}</strong>
              </span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="min-h-11 text-text-secondary underline underline-offset-4 hover:text-text-primary"
              >
                Not you? Sign out
              </button>
            </div>
          ) : (
            <>
              <label className="block text-sm font-medium">
                Email address
                <input
                  className="field mt-1.5"
                  type="email"
                  autoComplete="email"
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                  onBlur={captureGuestContact}
                  maxLength={254}
                  required
                />
              </label>
              <p className="type-caption text-text-muted">
                You are checking out as a guest. We will email your order confirmation here, and save your bag to this address so you can come back to it.
                {authStatus !== 'loading' && (
                  <>
                    {' '}Have an account?{' '}
                    <a href="#/signin" onClick={() => setAfterAuth('#/checkout')} className="underline underline-offset-4">
                      Sign in
                    </a>{' '}
                    or{' '}
                    <a href="#/signup" onClick={() => setAfterAuth('#/checkout')} className="underline underline-offset-4">
                      create one
                    </a>
                    .
                  </>
                )}
              </p>
            </>
          )}
        </section>

        <section aria-labelledby="delivery-heading" className="space-y-4">
          <h2 id="delivery-heading" className="text-lg font-medium">
            Delivery address
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Full name
              <input className="field mt-1.5" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={100} required />
            </label>
            <label className="block text-sm font-medium">
              Mobile number
              <input className="field mt-1.5" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} onBlur={captureGuestContact} maxLength={16} placeholder="98765 43210" required />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Address
            <textarea className="field mt-1.5 min-h-24 resize-y" autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={300} required />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm font-medium">
              City
              <input className="field mt-1.5" autoComplete="address-level2" value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} required />
            </label>
            <label className="block text-sm font-medium">
              State
              <select className="field mt-1.5" autoComplete="address-level1" value={state} onChange={(event) => setState(event.target.value)} required>
                <option value="">Select…</option>
                {INDIAN_STATES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              PIN code
              <input className="field mt-1.5" inputMode="numeric" autoComplete="postal-code" value={postalCode} onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} required />
            </label>
          </div>
          <p className="type-caption text-text-muted">Delivery within India only.</p>
        </section>

        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" size="lg" className="w-full sm:w-auto sm:min-w-64">
              Continue to payment
            </Button>
            <a href="#/cart" className="min-h-11 text-center text-sm leading-[2.75rem] text-text-secondary underline underline-offset-4 hover:text-text-primary sm:text-left">
              ← Back to bag
            </a>
          </div>
          <p className="mt-4 min-h-5 text-sm text-danger" role="alert">
            {error}
          </p>
        </div>
      </form>
    </CheckoutFrame>
  );
}
