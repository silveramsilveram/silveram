import { ArrowLeftIcon, ArrowRightIcon } from './icons';

interface CarouselControlsProps {
  onPrev: () => void;
  onNext: () => void;
  prevLabel?: string;
  nextLabel?: string;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  className?: string;
}

const half =
  'flex h-10 w-14 items-center justify-center transition-colors duration-[250ms] ease-in-out ' +
  'hover:bg-[var(--scene-fg,var(--color-brand-primary))] hover:text-[var(--scene-bg,var(--color-surface-primary))] ' +
  'active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit';

/**
 * Two-part outlined pill (previous | next). Used for editorial rails and galleries. Each half is a real
 * button with its own label, a 40x56px target, and works without hover (touch).
 */
export default function CarouselControls({
  onPrev,
  onNext,
  prevLabel = 'Previous',
  nextLabel = 'Next',
  prevDisabled,
  nextDisabled,
  className = '',
}: CarouselControlsProps) {
  return (
    <div
      role="group"
      aria-label="Carousel controls"
      className={`inline-flex overflow-hidden rounded-full border border-current ${className}`.trim()}
    >
      <button type="button" onClick={onPrev} disabled={prevDisabled} aria-label={prevLabel} className={half}>
        <ArrowLeftIcon size={18} />
      </button>
      <span aria-hidden="true" className="w-px self-stretch bg-current" />
      <button type="button" onClick={onNext} disabled={nextDisabled} aria-label={nextLabel} className={half}>
        <ArrowRightIcon size={18} />
      </button>
    </div>
  );
}
