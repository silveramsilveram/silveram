import { useMemo, useState } from 'react';
import { buildGeneralMessage, buildWhatsAppUrl } from '@/features/whatsapp';
import { WhatsAppIcon } from '@/shared/ui/icons';
import { FAQ_CATEGORIES, FAQS, type FaqCategory } from '../data/content';

type Filter = 'All' | FaqCategory;
const FILTERS: readonly Filter[] = ['All', ...FAQ_CATEGORIES];

/**
 * FAQ on a stone scene. Category buttons filter the list (pressing the active one again is harmless); each question
 * is a disclosure button with a round plus/minus, one open at a time. Answers are the store's existing neutral text.
 */
export default function FaqSection() {
  const [filter, setFilter] = useState<Filter>('All');
  const [openId, setOpenId] = useState<string | null>(null);
  const whatsappUrl = buildWhatsAppUrl(buildGeneralMessage());
  const visible = useMemo(() => (filter === 'All' ? FAQS : FAQS.filter((faq) => faq.category === filter)), [filter]);

  const choose = (next: Filter) => {
    setFilter(next);
    setOpenId(null);
  };

  return (
    <section id="faq" aria-labelledby="faq-heading" className="scene scene-mat py-16 md:py-24">
      <div className="page-container-wide grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-20">
        <div className="min-w-0">
          <h2 id="faq-heading" className="ed-h1">
            What’s on your mind?
          </h2>

          <div role="group" aria-label="Filter questions by topic" className="mt-8 flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:items-start lg:overflow-visible">
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={filter === item}
                onClick={() => choose(item)}
                className="chip whitespace-nowrap"
              >
                {item}
              </button>
            ))}
          </div>

          {whatsappUrl && (
            <div className="frame-dashed mt-8 hidden p-5 lg:block">
              <p className="font-sans font-semibold">Don’t see your question?</p>
              <p className="scene-body mt-1 font-sans text-sm leading-relaxed">Message us on WhatsApp and we will answer it.</p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-11 items-center gap-2 font-sans text-base font-semibold underline decoration-1 underline-offset-4"
              >
                <WhatsAppIcon size={18} aria-hidden="true" />
                Ask on WhatsApp
                <span className="sr-only"> (opens WhatsApp in a new tab)</span>
              </a>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="label-mono-sm scene-body" role="status" aria-live="polite">
            {visible.length} {visible.length === 1 ? 'question' : 'questions'}
            {filter === 'All' ? '' : ` about ${filter.toLowerCase()}`}
          </p>
          <ul className="rule-dashed mt-3">
            {visible.map((faq) => {
              const open = openId === faq.id;
              return (
                <li key={faq.id} className="rule-dashed-b">
                  <h3>
                    <button
                      type="button"
                      id={`${faq.id}-button`}
                      aria-expanded={open}
                      aria-controls={`${faq.id}-panel`}
                      onClick={() => setOpenId(open ? null : faq.id)}
                      className="flex min-h-16 w-full items-center justify-between gap-6 py-4 text-left font-sans text-lg font-semibold"
                    >
                      <span>{faq.question}</span>
                      <span className="toggle-dot" aria-hidden="true">
                        {open ? '−' : '+'}
                      </span>
                    </button>
                  </h3>
                  <div id={`${faq.id}-panel`} role="region" aria-labelledby={`${faq.id}-button`} hidden={!open}>
                    <p className="scene-body max-w-2xl pb-6 pr-10 font-sans text-base leading-relaxed">{faq.answer}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-11 items-center gap-2 font-sans text-base font-semibold underline decoration-1 underline-offset-4 lg:hidden"
            >
              <WhatsAppIcon size={18} aria-hidden="true" />
              Don’t see your question? Ask on WhatsApp
              <span className="sr-only"> (opens WhatsApp in a new tab)</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
