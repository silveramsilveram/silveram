import { useRef } from 'react';
import { CloseIcon } from '@/shared/ui/icons';
import Button from '@/shared/ui/Button';
import { useDialog } from '@/shared/hooks/useDialog';
import { POLICIES, type PolicyId } from '../data/policies';

interface PolicyModalProps {
  policyId: PolicyId | null;
  onClose: () => void;
}

export default function PolicyModal({ policyId, onClose }: PolicyModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialog(policyId !== null, onClose, panelRef);

  if (!policyId) return null;
  const policy = POLICIES[policyId];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-primary/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="policy-dialog-title"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2px] bg-surface-primary p-6 shadow-2xl focus:outline-none sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <h2 id="policy-dialog-title" className="type-h3">
            {policy.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px] text-text-secondary hover:bg-surface-secondary"
            aria-label="Close dialog"
          >
            <CloseIcon size={22} />
          </button>
        </div>

        {policy.draft && (
          <p className="mt-5 rounded-[2px] border border-border bg-surface-secondary px-4 py-3 text-sm text-text-primary" role="status">
            Draft for store review — these terms are not yet approved for production.
          </p>
        )}

        <div className="type-body mt-5 space-y-3 text-text-secondary">
          {policy.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
