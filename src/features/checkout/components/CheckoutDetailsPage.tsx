import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { setAfterAuth } from '@/features/auth/redirect';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCart } from '@/features/cart/context/CartContext';
import { syncCart } from '@/features/cart/lib/syncCart';
import { isCheckoutEnabled } from '@/shared/lib/api';
import { setPageMeta } from '@/shared/lib/seo';
import Button, { buttonClasses } from '@/shared/ui/Button';
import { useCheckout } from '../context/CheckoutContext';
import { INDIAN_STATES } from '../data/states';
import { EMAIL_PATTERN, normalizePhone, PINCODE_PATTERN } from '../lib/validation';
import { CheckoutFrame } from './CheckoutLayout';

type FieldName = 'email' | 'fullName' | 'phone' | 'altPhone' | 'address' | 'city' | 'state' | 'postalCode';
type Errors = Partial<Record<FieldName, string>>;

function Field({
  label,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      <span>
        {label}
        {optional && <span className="ml-1.5 font-normal text-text-muted">(optional)</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <span className="mt-1 block text-xs font-normal text-text-muted">{hint}</span>}
      {error && (
        <span className="mt-1 block text-xs font-normal text-danger" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

/** Checkout page 1 of 2: who is buying and where to deliver. Guests need no account. */
export default function CheckoutDetailsPage() {
  const { user, status: authStatus, signOut } = useAuth();
  const { cart } = useCart();
  const { info, setInfo } = useCheckout();

  const [guestEmail, setGuestEmail] = useState(info?.email ?? '');
  const [fullName, setFullName] = useState(info?.fullName ?? '');
  const [phone, setPhone] = useState(info?.phone ?? '');
  const [altPhone, setAltPhone] = useState(info?.altPhone ?? '');
  const [address, setAddress] = useState(info?.address ?? '');
  const [landmark, setLandmark] = useState(info?.landmark ?? '');
  const [city, setCity] = useState(info?.city ?? '');
  const [state, setState] = useState(info?.state ?? '');
  const [postalCode, setPostalCode] = useState(info?.postalCode ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setPageMeta({ title: 'Delivery details | Silveram', description: 'Enter your delivery details.', noindex: true });
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

  const validate = (): Errors => {
    const next: Errors = {};
    if (!user && !EMAIL_PATTERN.test(email)) next.email = 'Enter a valid email address, e.g. name@example.com.';
    if (fullName.trim().length < 2) next.fullName = 'Enter the recipient’s full name.';
    if (!normalizePhone(phone)) next.phone = 'Enter a valid 10-digit Indian mobile number.';
    if (altPhone.trim()) {
      if (!normalizePhone(altPhone)) next.altPhone = 'Enter a valid 10-digit mobile number, or leave this empty.';
      else if (normalizePhone(altPhone) === normalizePhone(phone)) next.altPhone = 'This is the same as your mobile number. Use a different one or leave it empty.';
    }
    if (address.trim().length < 8) next.address = 'Enter your full address: house / flat number, street and area.';
    if (!city.trim()) next.city = 'Enter your city or town.';
    if (!state) next.state = 'Select your state.';
    if (!PINCODE_PATTERN.test(postalCode)) next.postalCode = 'Enter a valid 6-digit PIN code.';
    return next;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    const first = (Object.keys(found) as FieldName[])[0];
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setInfo({
      email: user ? '' : email,
      fullName: fullName.trim(),
      phone: normalizePhone(phone),
      altPhone: altPhone.trim() ? normalizePhone(altPhone) : '',
      address: address.trim(),
      landmark: landmark.trim(),
      city: city.trim(),
      state,
      postalCode,
    });
    window.location.hash = '#/checkout/payment';
  };

  const inputProps = (name: FieldName) => ({
    name,
    'aria-invalid': errors[name] ? (true as const) : undefined,
    className: `field ${errors[name] ? 'border-danger' : ''}`,
  });

  if (!isCheckoutEnabled) {
    return (
      <main id="main-content" tabIndex={-1} className="page-container pb-24 pt-12 focus:outline-none">
        <h1 className="type-h1">Checkout</h1>
        <p className="type-body-lg mt-4 max-w-xl text-text-secondary">
          Checkout is opening soon. Please check back shortly, or contact us if you have a question.
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
    <CheckoutFrame step={1} title="Delivery details">
      <form ref={formRef} className="space-y-10" onSubmit={submit} noValidate>
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
              <div className="flex flex-wrap items-center justify-between gap-2 border border-border bg-surface-white p-4 text-sm">
                <span>
                  <strong>Checking out as a guest.</strong> No account needed.
                </span>
                {authStatus !== 'loading' && (
                  <span className="text-text-secondary">
                    Already have an account?{' '}
                    <a href="#/signin" onClick={() => setAfterAuth('#/checkout')} className="underline underline-offset-4 hover:text-text-primary">
                      Sign in
                    </a>
                  </span>
                )}
              </div>
              <Field label="Email address" hint="We send your order confirmation here, and you use it to track your order." error={errors.email}>
                <input
                  {...inputProps('email')}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={guestEmail}
                  onChange={(event) => setGuestEmail(event.target.value)}
                  onBlur={captureGuestContact}
                  maxLength={254}
                  required
                />
              </Field>
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mobile number" hint="The delivery partner will call this number." error={errors.phone}>
              <input
                {...inputProps('phone')}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                onBlur={captureGuestContact}
                maxLength={16}
                placeholder="98765 43210"
                required
              />
            </Field>
            <Field label="Alternate mobile number" optional hint="Used if we cannot reach you on the first number." error={errors.altPhone}>
              <input
                {...inputProps('altPhone')}
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={altPhone}
                onChange={(event) => setAltPhone(event.target.value)}
                maxLength={16}
                placeholder="98765 43210"
              />
            </Field>
          </div>
        </section>

        <section aria-labelledby="delivery-heading" className="space-y-4">
          <h2 id="delivery-heading" className="text-lg font-medium">
            Delivery address
          </h2>
          <Field label="Full name" error={errors.fullName}>
            <input {...inputProps('fullName')} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={100} required />
          </Field>
          <Field label="Address" hint="House / flat number, building, street and area." error={errors.address}>
            <textarea
              {...inputProps('address')}
              className={`field min-h-24 resize-y ${errors.address ? 'border-danger' : ''}`}
              autoComplete="street-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              maxLength={300}
              required
            />
          </Field>
          <Field label="Landmark" optional hint="e.g. near the temple, opposite the school. Helps the courier find you.">
            <input name="landmark" className="field" value={landmark} onChange={(event) => setLandmark(event.target.value)} maxLength={120} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="PIN code" error={errors.postalCode}>
              <input
                {...inputProps('postalCode')}
                inputMode="numeric"
                autoComplete="postal-code"
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                placeholder="845401"
                required
              />
            </Field>
            <Field label="City / town" error={errors.city}>
              <input {...inputProps('city')} autoComplete="address-level2" value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} required />
            </Field>
            <Field label="State" error={errors.state}>
              <select {...inputProps('state')} autoComplete="address-level1" value={state} onChange={(event) => setState(event.target.value)} required>
                <option value="">Select…</option>
                {INDIAN_STATES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="type-caption text-text-muted">We deliver across India.</p>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" className="w-full sm:w-auto sm:min-w-64">
            Continue to payment
          </Button>
          <a href="#/cart" className="min-h-11 text-center text-sm leading-[2.75rem] text-text-secondary underline underline-offset-4 hover:text-text-primary sm:text-left">
            ← Back to bag
          </a>
        </div>
      </form>
    </CheckoutFrame>
  );
}
