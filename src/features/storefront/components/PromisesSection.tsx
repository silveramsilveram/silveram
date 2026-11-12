import type { CSSProperties } from 'react';
import { PROMISES } from '../data/content';

/** Slight rotations give the outlined notes a hand-placed feel. Content stays upright for reading. */
const TILTS = [-2, 1.5, 1.5, -1.5] as const;

/**
 * "Silveram is always": a central midnight blob with four outlined notes around it. The notes are the site's
 * existing promises, nothing more. On phones the blob leads and the notes stack beneath it.
 */
export default function PromisesSection() {
  const [first, ...rest] = PROMISES.heading.split(' ');
  const lead = [first, ...rest.slice(0, -1)].join(' ');
  const accent = rest[rest.length - 1];

  const note = (index: number, className: string) => {
    const item = PROMISES.items[index];
    return (
      <li
        key={item.id}
        className={`oval-note flex flex-col items-center justify-center px-8 py-10 text-center md:px-12 md:py-12 ${className}`}
        style={{ transform: `rotate(${TILTS[index]}deg)` } as CSSProperties}
      >
        <h3 className="label-mono label-mono-strong">{item.title}</h3>
        <p className="scene-body mt-2 max-w-[17rem] font-sans text-base leading-relaxed">{item.description}</p>
      </li>
    );
  };

  return (
    <section aria-labelledby="promises-heading" className="scene scene-canvas overflow-hidden py-16 md:py-24">
      <div className="page-container-wide">
        <div className="grid items-center gap-6 md:grid-cols-[1fr_1.15fr_1fr] md:grid-rows-2 md:gap-x-2 md:gap-y-6">
          <div className="scene-deep blob order-first flex min-h-[15rem] flex-col items-center justify-center px-8 py-12 text-center md:col-start-2 md:row-span-2 md:row-start-1 md:min-h-[22rem]">
            <h2 id="promises-heading" className="ed-h1">
              {lead}
              <br />
              <span className="ed-italic underline decoration-1 underline-offset-[0.12em]">{accent}</span>
            </h2>
          </div>

          <ul role="list" className="contents">
            {note(0, 'md:col-start-1 md:row-start-1')}
            {note(1, 'md:col-start-3 md:row-start-1')}
            {note(2, 'md:col-start-1 md:row-start-2')}
            {note(3, 'md:col-start-3 md:row-start-2')}
          </ul>
        </div>
      </div>
    </section>
  );
}
