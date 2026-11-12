import { useRef, type CSSProperties } from 'react';
import { useInViewOnce } from '@/shared/hooks/useInViewOnce';
import { buttonClasses } from '@/shared/ui/Button';
import { PROMISE } from '../data/content';

const step = (index: number) => ({ '--i': index }) as CSSProperties;

/** Single-ink ring-and-gem motif, drawn for Silveram (not taken from any other brand). */
function RingMotif() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="h-24 w-24 text-brand-primary md:h-28 md:w-28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="60" cy="78" r="30" />
      <circle cx="60" cy="78" r="22" opacity="0.45" />
      <path d="M60 10 74 26 60 42 46 26Z" />
      <path d="M46 26h28M60 10v32" opacity="0.5" />
      <path d="M92 22v12M86 28h12M26 14v8M22 18h8" />
    </svg>
  );
}

/**
 * The brand statement and the "Our story" anchor. Two staggered lines rise from behind a mask the first time
 * the scene is 25% in view (armed only when JavaScript runs and motion is allowed, so nothing is ever hidden otherwise).
 */
export default function EditorialPromise() {
  const ref = useRef<HTMLElement>(null);
  const { armed, seen } = useInViewOnce(ref);

  return (
    <section
      id="story"
      ref={ref}
      aria-labelledby="promise-heading"
      className={`reveal-lines scene scene-canvas py-20 md:py-28 ${armed ? 'is-armed' : ''} ${seen ? 'is-seen' : ''}`}
    >
      <div className="page-container-wide">
        <RingMotif />

        <h2 id="promise-heading" className="mt-6">
          <span className="line-reveal ed-display max-w-[16ch]" style={step(0)}>
            <span>{PROMISE.lines[0]}</span>
          </span>
          <span className="line-reveal ed-h1 ed-italic mt-6 max-w-[20ch] lg:ml-[22%]" style={step(1)}>
            <span>{PROMISE.accent}</span>
          </span>
        </h2>

        <div className="mt-10 max-w-xl lg:ml-[44%]">
          <p className="scene-body font-sans text-lg leading-relaxed">{PROMISE.description}</p>
          <a href={PROMISE.cta.href} className={`${buttonClasses('primary', 'lg')} mt-8`}>
            {PROMISE.cta.label}
          </a>
        </div>
      </div>
    </section>
  );
}
