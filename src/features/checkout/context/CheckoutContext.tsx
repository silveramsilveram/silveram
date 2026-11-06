import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/** What the customer entered on the "Details" page; carried to the "Payment" page. */
export interface CheckoutInfo {
  /** Guests only; signed-in customers use their account e-mail. */
  email: string;
  fullName: string;
  phone: string;
  /** Optional second number the courier can call. '' when not given. */
  altPhone: string;
  address: string;
  /** Optional nearby landmark. '' when not given. */
  landmark: string;
  city: string;
  state: string;
  postalCode: string;
}

interface CheckoutContextValue {
  info: CheckoutInfo | null;
  setInfo: (info: CheckoutInfo) => void;
  clearInfo: () => void;
}

const KEY = 'silveram_checkout_info';
const CheckoutContext = createContext<CheckoutContextValue | undefined>(undefined);

function load(): CheckoutInfo | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(KEY) || 'null') as Partial<CheckoutInfo> | null;
    if (!parsed) return null;
    const keys: Array<keyof CheckoutInfo> = ['email', 'fullName', 'phone', 'altPhone', 'address', 'landmark', 'city', 'state', 'postalCode'];
    return keys.every((key) => typeof parsed[key] === 'string') ? (parsed as CheckoutInfo) : null;
  } catch {
    return null;
  }
}

/** Kept in sessionStorage so a refresh on the payment page does not lose the details. */
export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [info, setInfoState] = useState<CheckoutInfo | null>(load);

  const setInfo = useCallback((next: CheckoutInfo) => {
    setInfoState(next);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Ignore: details simply will not survive a refresh.
    }
  }, []);

  const clearInfo = useCallback(() => {
    setInfoState(null);
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // Ignore.
    }
  }, []);

  const value = useMemo(() => ({ info, setInfo, clearInfo }), [info, setInfo, clearInfo]);
  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error('useCheckout must be used within CheckoutProvider');
  return ctx;
}
