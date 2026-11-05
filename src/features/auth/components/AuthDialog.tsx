import { useRef } from 'react';
import { CloseIcon } from '@/shared/ui/icons';
import { useDialog } from '@/shared/hooks/useDialog';
import { useAuth } from '../context/AuthContext';
import AuthForm from './AuthForm';

/** Sign-in / create-account modal, opened from the header, the checkout and the account page. */
export default function AuthDialog() {
  const { authDialog, closeAuth } = useAuth();
  const panelRef = useRef<HTMLDivElement>(null);
  useDialog(authDialog.open, closeAuth, panelRef);

  if (!authDialog.open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-brand-primary/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeAuth();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        tabIndex={-1}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[2px] bg-surface-primary p-6 shadow-2xl focus:outline-none sm:p-8"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="auth-dialog-title" className="type-h3">
            Your Silveram account
          </h2>
          <button
            type="button"
            onClick={closeAuth}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px] text-text-secondary hover:bg-surface-secondary"
            aria-label="Close"
          >
            <CloseIcon size={22} />
          </button>
        </div>
        <AuthForm key={authDialog.mode} initialMode={authDialog.mode} onSuccess={closeAuth} />
      </div>
    </div>
  );
}
