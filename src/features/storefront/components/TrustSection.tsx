import { TRUST_ITEMS } from '../data/content';

function TrustIcon({ id }: { id: string }) {
  const props = {
    width: 28,
    height: 28,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.5',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'text-brand-primary',
    'aria-hidden': true,
  };

  switch (id) {
    case 'selected':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12.5 2.5 2.5 4.5-5" />
        </svg>
      );
    case 'transparency':
      return (
        <svg {...props}>
          <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
          <path d="M2 9h20" />
          <path d="m10 3 2 6-2 12" />
          <path d="m14 3-2 6 2 12" />
        </svg>
      );
    case 'assistance':
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M8 10h.01M12 10h.01M16 10h.01" />
        </svg>
      );
    case 'delivery':
      return (
        <svg {...props}>
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      );
    default:
      return null;
  }
}

export default function TrustSection() {
  return (
    <section aria-labelledby="trust-heading" className="section-pad border-y border-border/60 bg-surface-primary">
      <div className="page-container">
        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16" data-reveal>
          <h2 id="trust-heading" className="type-h2 font-medium text-balance">
            Why Choose Silveram
          </h2>
          <p className="type-body mt-3 text-text-secondary">
            A small, considered collection. We show a product detail only once it has been verified.
          </p>
        </div>

        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <li
              key={item.id}
              className="group rounded-[2px] border border-border bg-surface-white p-6 transition-all duration-200 hover:border-accent-silver hover:shadow-sm"
              data-reveal
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-[2px] bg-surface-primary transition-colors group-hover:bg-surface-secondary">
                <TrustIcon id={item.id} />
              </div>
              <h3 className="type-body-lg font-semibold text-brand-primary">{item.title}</h3>
              <p className="type-body mt-2 text-text-secondary leading-relaxed">{item.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
