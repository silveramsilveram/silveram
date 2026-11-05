/**
 * Dummy UPI and card forms for TEST MODE. Nothing typed here is ever sent to the server: the UPI ID or
 * card number only decides whether the simulated payment succeeds or is declined. They are replaced by the
 * real gateway's hosted checkout (UPI, debit and credit cards) once it is connected.
 */
export const SUCCESS_CARD = '4111111111111111';
export const DECLINE_CARD = '4000000000000002';
export const SUCCESS_UPI = 'success@upi';
export const DECLINE_UPI = 'failure@upi';

export interface TestCard {
  number: string;
  expiry: string;
  cvv: string;
}

const groupDigits = (digits: string) => digits.replace(/(.{4})/g, '$1 ').trim();

export function validateTestCard(card: TestCard): string {
  const digits = card.number.replace(/\s/g, '');
  if (digits !== SUCCESS_CARD && digits !== DECLINE_CARD) {
    return 'Test mode only accepts the test cards shown below.';
  }
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry)) return 'Enter the card expiry as MM/YY.';
  if (!/^\d{3}$/.test(card.cvv)) return 'Enter the 3-digit CVV.';
  return '';
}

export function validateTestUpi(upiId: string): string {
  return /^[a-z0-9._-]{2,}@[a-z][a-z0-9]{1,}$/i.test(upiId.trim())
    ? ''
    : 'Enter a valid UPI ID, for example name@bank.';
}

function Banner() {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">
      Test mode · no real money is charged
    </p>
  );
}

const helperButton =
  'min-h-11 rounded-[2px] border border-border-strong px-3 text-xs hover:bg-surface-secondary';

export function TestUpiPanel({ upiId, onChange }: { upiId: string; onChange: (upiId: string) => void }) {
  return (
    <div className="space-y-4 border border-dashed border-brand-primary/50 bg-surface-white p-4 sm:p-5">
      <Banner />
      <label className="block text-sm font-medium">
        UPI ID
        <input
          className="field mt-1.5 font-mono"
          autoComplete="off"
          inputMode="email"
          placeholder="name@bank"
          value={upiId}
          onChange={(event) => onChange(event.target.value.trim())}
        />
      </label>
      <p className="text-xs text-text-muted">
        In test mode any valid UPI ID succeeds, except <code>{DECLINE_UPI}</code>, which is declined.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={helperButton} onClick={() => onChange(SUCCESS_UPI)}>
          Use {SUCCESS_UPI}
        </button>
        <button type="button" className={helperButton} onClick={() => onChange(DECLINE_UPI)}>
          Use {DECLINE_UPI} (declined)
        </button>
      </div>
    </div>
  );
}

export function TestCardPanel({ card, onChange }: { card: TestCard; onChange: (card: TestCard) => void }) {
  return (
    <div className="space-y-4 border border-dashed border-brand-primary/50 bg-surface-white p-4 sm:p-5">
      <Banner />
      <label className="block text-sm font-medium">
        Card number
        <input
          className="field mt-1.5 font-mono"
          inputMode="numeric"
          autoComplete="off"
          value={groupDigits(card.number.replace(/\D/g, '').slice(0, 16))}
          onChange={(event) => onChange({ ...card, number: event.target.value.replace(/\D/g, '').slice(0, 16) })}
        />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="block text-sm font-medium">
          Expiry (MM/YY)
          <input
            className="field mt-1.5 font-mono"
            inputMode="numeric"
            autoComplete="off"
            maxLength={5}
            value={card.expiry}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
              onChange({ ...card, expiry: digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits });
            }}
          />
        </label>
        <label className="block text-sm font-medium">
          CVV
          <input
            className="field mt-1.5 font-mono"
            inputMode="numeric"
            autoComplete="off"
            maxLength={3}
            value={card.cvv}
            onChange={(event) => onChange({ ...card, cvv: event.target.value.replace(/\D/g, '').slice(0, 3) })}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={helperButton} onClick={() => onChange({ ...card, number: SUCCESS_CARD })}>
          Use success card ({groupDigits(SUCCESS_CARD)})
        </button>
        <button type="button" className={helperButton} onClick={() => onChange({ ...card, number: DECLINE_CARD })}>
          Use declined card ({groupDigits(DECLINE_CARD)})
        </button>
      </div>
    </div>
  );
}
