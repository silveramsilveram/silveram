import { useEffect } from 'react';
import { buttonClasses } from '@/shared/ui/Button';
import { applyPageSeo } from '@/shared/lib/seo';
import { policySeo } from '@/shared/seo/pages';
import { POLICIES, type PolicyId } from '../data/policies';

/** Each store policy is its own page (/policy/<id>). */
export default function PolicyPage({ id }: { id: PolicyId }) {
  const policy = POLICIES[id];

  useEffect(() => {
    applyPageSeo(policySeo(policy));
    window.scrollTo(0, 0);
  }, [policy]);

  return (
    <main id="main-content" tabIndex={-1} className="focus:outline-none">
      <div className="page-container pb-20 pt-10 md:pb-28 md:pt-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="type-h1">{policy.title}</h1>
          {policy.draft && (
            <p className="mt-6 border border-border bg-surface-secondary px-4 py-3 text-sm text-text-primary" role="status">
              Draft for store review — these terms are not yet approved for production.
            </p>
          )}
          <div className="type-body mt-8 space-y-4 text-text-secondary">
            {policy.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <nav aria-label="Other policies" className="mt-12 flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-6 text-sm">
            {(Object.keys(POLICIES) as PolicyId[])
              .filter((other) => other !== id)
              .map((other) => (
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
