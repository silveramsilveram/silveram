import { Fragment, useEffect } from 'react';
import { buttonClasses } from '@/shared/ui/Button';
import { applyPageSeo } from '@/shared/lib/seo';
import { policySeo } from '@/shared/seo/pages';
import { MARKER, POLICIES, POLICIES_LAST_UPDATED, POLICY_ORDER, countMarkers, type PolicyId } from '../data/policies';

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Shows plain text, with every unresolved `[OWNER INPUT REQUIRED: ...]` marker highlighted so it is never missed. */
function Text({ children }: { children: string }) {
  return (
    <>
      {children.split(MARKER).map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="rounded-[var(--radius-field)] bg-champagne px-1.5 py-0.5 text-brand-primary">
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** Each store policy is its own page (/policy/<id>). */
export default function PolicyPage({ id }: { id: PolicyId }) {
  const policy = POLICIES[id];
  const open = countMarkers(policy);

  useEffect(() => {
    applyPageSeo(policySeo(policy));
    window.scrollTo(0, 0);
  }, [policy]);

  return (
    <main id="main-content" tabIndex={-1} className="scene scene-canvas focus:outline-none">
      <div className="page-container-wide grid gap-10 pb-20 pt-10 md:pb-28 md:pt-16 lg:grid-cols-12 lg:gap-16">
        <header className="lg:col-span-4">
          <h1 className="ed-h1">{policy.title}</h1>
          <p className="scene-body mt-4 font-sans text-lg leading-relaxed">{policy.summary}</p>
          <p className="mt-4 font-sans text-sm text-text-muted">Last updated {POLICIES_LAST_UPDATED}</p>

          {policy.sections.length > 4 && (
            <nav aria-label="On this page" className="mt-8 hidden lg:block">
              <ul className="space-y-1 font-sans text-sm">
                {policy.sections.map((section) => (
                  <li key={section.heading}>
                    <a href={`#${slug(section.heading)}`} className="inline-flex min-h-8 items-center underline-offset-4 hover:underline">
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </header>

        <div className="lg:col-span-7 lg:col-start-6">
          {policy.draft && (
            <div className="frame-dashed p-5 font-sans text-sm text-text-primary" role="status">
              <p className="font-semibold">Draft for store review. These terms are not yet approved for production.</p>
              {open > 0 && (
                <p className="mt-1 text-text-secondary">
                  {open} {open === 1 ? 'detail is' : 'details are'} still missing or waiting for legal review. They are highlighted below.
                </p>
              )}
            </div>
          )}

          <div className="mt-8 space-y-10">
            {policy.sections.map((section) => (
              <section key={section.heading} aria-labelledby={slug(section.heading)} className="scroll-mt-28">
                <h2 id={slug(section.heading)} className="ed-h3">
                  {section.heading}
                </h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-3 max-w-prose font-sans text-base leading-relaxed text-text-secondary">
                    <Text>{paragraph}</Text>
                  </p>
                ))}
                {section.items && (
                  <ul className="mt-3 max-w-prose list-disc space-y-2 pl-5 font-sans text-base leading-relaxed text-text-secondary">
                    {section.items.map((item) => (
                      <li key={item}>
                        <Text>{item}</Text>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <nav aria-label="Other policies" className="rule-dashed mt-14 flex flex-wrap gap-x-6 gap-y-1 pt-6 font-sans text-sm">
            {POLICY_ORDER.filter((other) => other !== id).map((other) => (
              <a key={other} href={`/policy/${other}`} className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-text-primary">
                {POLICIES[other].title}
              </a>
            ))}
          </nav>
          <a href="/shop" className={buttonClasses('secondary', 'md', 'mt-4')}>
            Back to shop
          </a>
        </div>
      </div>
    </main>
  );
}
