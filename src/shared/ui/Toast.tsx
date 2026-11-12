import { useCartStore } from '@/features/cart/store/cartStore';

export default function Toast() {
  const toastMessage = useCartStore((state) => state.toastMessage);
  const liveAnnouncement = useCartStore((state) => state.liveAnnouncement);

  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>
      {toastMessage && (
        <div
          aria-hidden="true"
          className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-[2px] border border-accent-silver bg-brand-primary px-4 py-3 text-center text-sm font-medium text-surface-primary shadow-lg md:bottom-6 md:left-6 md:translate-x-0 md:text-left"
        >
          {toastMessage}
        </div>
      )}
    </>
  );
}
