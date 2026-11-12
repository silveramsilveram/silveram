import { useDecorativeMotionPaused } from '@/shared/lib/motion';
import { PauseIcon, PlayIcon } from './icons';

interface MarqueeProps {
  /** Short, factual phrases. They repeat as a continuous strip. */
  items: readonly string[];
  /** Accessible name for the strip ("Store information"). */
  label: string;
  /** Tighter spacing and a smaller pause control, for the announcement strip. */
  compact?: boolean;
  className?: string;
}

/**
 * Slow information ticker (20s per loop, linear). Screen readers get one static list; the repeated copy
 * is aria-hidden. The pause control switches off *all* decorative motion site-wide (WCAG 2.2.2), and
 * under `prefers-reduced-motion` the strip does not move at all.
 */
export default function Marquee({ items, label, compact = false, className = '' }: MarqueeProps) {
  const [paused, setPaused] = useDecorativeMotionPaused();

  const group = (hidden: boolean) => (
    <div className="marquee__group" aria-hidden={hidden || undefined}>
      {items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className={`${compact ? 'label-mono-sm gap-8' : 'label-mono gap-12'} inline-flex items-center whitespace-nowrap`}
        >
          {item}
          <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rotate-45 border border-current" />
        </span>
      ))}
    </div>
  );

  return (
    <div className={`flex items-center ${compact ? 'gap-3' : 'gap-4'} ${className}`.trim()} role="group" aria-label={label}>
      <div className="marquee min-w-0 flex-1">
        {group(false)}
        {group(true)}
      </div>
      <button
        type="button"
        className={`btn-round shrink-0 ${compact ? 'btn-round--sm' : ''}`.trim()}
        aria-pressed={paused}
        aria-label="Pause animations"
        onClick={() => setPaused(!paused)}
      >
        {paused ? <PlayIcon size={compact ? 14 : 18} /> : <PauseIcon size={compact ? 14 : 18} />}
      </button>
    </div>
  );
}
