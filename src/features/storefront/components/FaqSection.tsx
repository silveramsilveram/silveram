import { useState } from 'react';
import { ChevronDownIcon, WhatsAppIcon } from '@/shared/ui/icons';
import { buildGeneralMessage, buildWhatsAppUrl } from '@/features/whatsapp';
import { FAQS } from '../data/content';

export default function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(null);
  const whatsappUrl = buildWhatsAppUrl(buildGeneralMessage());

  return (
    <section id="faq" aria-labelledby="faq-heading" className="section-pad bg-surface-secondary">
      <div className="page-container grid gap-10 lg:grid-cols-[1fr_1.8fr] lg:gap-20">
        <div data-reveal>
          <span className="block h-px w-14 bg-brand-primary" aria-hidden="true" />
          <h2 id="faq-heading" className="type-h2 mt-6 text-balance font-medium">
            Frequently Asked Questions
          </h2>
          <p className="type-body mt-4 max-w-sm text-text-secondary leading-relaxed">
            Answers about our products, ordering and delivery.
          </p>

          {whatsappUrl && (
            <div className="mt-8 rounded-[2px] border border-border bg-surface-white p-5">
              <p className="type-body font-medium text-brand-primary">Need immediate guidance?</p>
              <p className="type-caption mt-1 text-text-secondary">
                Our silver team is available on WhatsApp for quick sizing and styling answers.
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-[2px] bg-brand-primary px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-surface-primary transition-colors hover:bg-brand-primary-hover"
              >
                <WhatsAppIcon size={16} aria-hidden="true" />
                <span>Ask on WhatsApp</span>
                <span className="sr-only"> (opens WhatsApp in a new tab)</span>
              </a>
            </div>
          )}
        </div>

        <ul className="divide-y divide-border-strong border-y border-border-strong" data-reveal>
          {FAQS.map((faq) => {
            const open = openId === faq.id;
            return (
              <li key={faq.id} className="transition-colors hover:bg-surface-primary/40">
                <h3>
                  <button
                    type="button"
                    id={`${faq.id}-button`}
                    aria-expanded={open}
                    aria-controls={`${faq.id}-panel`}
                    onClick={() => setOpenId(open ? null : faq.id)}
                    className="type-body-lg flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left font-medium text-brand-primary transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDownIcon
                      size={20}
                      className={`shrink-0 transition-transform duration-200 text-accent-silver ${open ? 'rotate-180 text-brand-primary' : ''}`}
                    />
                  </button>
                </h3>
                <div
                  id={`${faq.id}-panel`}
                  role="region"
                  aria-labelledby={`${faq.id}-button`}
                  hidden={!open}
                  className="transition-all"
                >
                  <p className="type-body pb-5 pr-8 text-text-secondary leading-relaxed">{faq.answer}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
