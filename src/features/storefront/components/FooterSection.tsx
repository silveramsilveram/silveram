import { useState, type FormEvent } from 'react';
import { InstagramIcon, WhatsAppIcon } from '@/shared/ui/icons';
import { SITE } from '@/shared/config/site';
import { PRODUCTS, productPath } from '@/features/products/data/products';
import { WHATSAPP_DISPLAY, buildGeneralMessage, buildWhatsAppUrl } from '@/features/whatsapp';
import { POLICIES, type PolicyId } from '@/features/policies/data/policies';
import { apiRequest, isNewsletterEnabled } from '@/shared/lib/api';

interface FooterSectionProps {
  onOpenPolicy: (id: PolicyId) => void;
}

const linkClass =
  'type-body inline-flex min-h-11 items-center text-surface-primary/80 underline-offset-4 hover:text-surface-primary hover:underline';

export default function FooterSection({ onOpenPolicy }: FooterSectionProps) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const whatsappUrl = buildWhatsAppUrl(buildGeneralMessage());
  const hasContact = Boolean(whatsappUrl || SITE.instagramUrl || SITE.contactEmail);

  async function submitNewsletter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNewsletterBusy(true);
    setNewsletterMessage('');
    try {
      await apiRequest('/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email: newsletterEmail, consent: newsletterConsent }),
      });
      setNewsletterEmail('');
      setNewsletterConsent(false);
      setNewsletterMessage('Thanks for subscribing. You can unsubscribe from any marketing email.');
    } catch (error) {
      setNewsletterMessage(error instanceof Error ? error.message : 'Unable to subscribe right now. Please try again.');
    } finally {
      setNewsletterBusy(false);
    }
  }

  return (
    <footer id="contact" className="on-navy bg-brand-primary text-surface-primary">
      <div className="page-container section-pad grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="text-xl font-semibold uppercase tracking-[0.3em]">Silveram</p>
          <p className="type-body mt-4 max-w-sm text-surface-primary/80">
            Silver gifting and jewellery, thoughtfully selected for the moments that matter.
          </p>
        </div>

        <nav aria-label="Collection">
          <h2 className="type-eyebrow text-accent-silver">Collection</h2>
          <ul className="mt-3">
            {PRODUCTS.map((product) => (
              <li key={product.id}>
                <a href={productPath(product)} className={linkClass}>
                  {product.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Company and policies">
          <h2 className="type-eyebrow text-accent-silver">Silveram</h2>
          <ul className="mt-3">
            <li><a href="#story" className={linkClass}>About us</a></li>
            <li><a href="#gifting" className={linkClass}>Gifting</a></li>
            <li><a href="#faq" className={linkClass}>FAQ</a></li>
            {(Object.keys(POLICIES) as PolicyId[]).map((id) => (
              <li key={id}>
                <button type="button" onClick={() => onOpenPolicy(id)} className={`${linkClass} cursor-pointer`}>
                  {POLICIES[id].title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="type-eyebrow text-accent-silver">Visit &amp; contact</h2>
          <address className="type-body mt-3 not-italic text-surface-primary/80">
            <strong className="font-semibold text-surface-primary">Silveram</strong>
            <br />
            {SITE.address.lines.map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
            {SITE.address.locality}, {SITE.address.region} {SITE.address.postalCode}
          </address>
          <p className="mt-1 flex flex-wrap gap-x-4">
            <a href={SITE.directionsUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Get directions<span className="sr-only"> (opens Google Maps in a new tab)</span>
            </a>
            <a href={SITE.googleListingUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Find us on Google<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
          <ul className="mt-2">
            {whatsappUrl && (
              <li>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${linkClass} gap-2`}>
                  <WhatsAppIcon size={18} /> WhatsApp{WHATSAPP_DISPLAY ? ` ${WHATSAPP_DISPLAY}` : ''}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            )}
            {SITE.instagramUrl && (
              <li>
                <a href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer" className={`${linkClass} gap-2`}>
                  <InstagramIcon size={18} /> {SITE.instagramHandle}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            )}
            {SITE.contactEmail && (
              <li>
                <a href={`mailto:${SITE.contactEmail}`} className={linkClass}>
                  {SITE.contactEmail}
                </a>
              </li>
            )}
          </ul>
          {!hasContact && (
            <p className="type-body mt-3 text-surface-primary/80">Contact details coming soon.</p>
          )}
          {isNewsletterEnabled && (
            <form className="mt-8" onSubmit={submitNewsletter}>
              <label htmlFor="newsletter-email" className="type-eyebrow text-accent-silver">
                Silveram updates
              </label>
              <p className="type-body mt-2 text-surface-primary/80">
                Product news and occasional offers, only if you opt in.
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  id="newsletter-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={newsletterEmail}
                  onChange={(event) => setNewsletterEmail(event.target.value)}
                  placeholder="Email address"
                  className="min-w-0 flex-1 rounded-[2px] border border-accent-silver/50 bg-transparent px-3 py-2 text-sm text-surface-primary placeholder:text-surface-primary/60"
                />
                <button
                  type="submit"
                  disabled={newsletterBusy || !newsletterConsent}
                  className="min-h-11 rounded-[2px] border border-accent-silver px-3 text-sm font-medium text-surface-primary hover:bg-surface-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {newsletterBusy ? 'Joining…' : 'Join'}
                </button>
              </div>
              <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-surface-primary/80">
                <input
                  type="checkbox"
                  required
                  checked={newsletterConsent}
                  onChange={(event) => setNewsletterConsent(event.target.checked)}
                  className="mt-0.5 accent-accent-silver"
                />
                <span>
                  I agree to receive marketing emails. I can unsubscribe at any time. Order and sign-in emails are separate.
                </span>
              </label>
              <p className="mt-2 text-xs text-surface-primary/80" role="status" aria-live="polite">
                {newsletterMessage}
              </p>
            </form>
          )}
        </div>
      </div>
      <div className="border-t border-accent-silver/30">
        <p className="type-caption page-container py-5 text-surface-primary/70">
          © {new Date().getFullYear()} Silveram. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
