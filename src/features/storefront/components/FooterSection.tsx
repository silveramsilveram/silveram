import { useState, type FormEvent } from 'react';
import { ArrowRightIcon, InstagramIcon, WhatsAppIcon } from '@/shared/ui/icons';
import { SITE } from '@/shared/config/site';
import { PRODUCTS, productPath } from '@/features/products/data/products';
import { WHATSAPP_DISPLAY, buildGeneralMessage, buildWhatsAppUrl } from '@/features/whatsapp';
import { POLICIES, type PolicyId } from '@/features/policies/data/policies';
import { policyPath } from '@/shared/routing/router';
import { apiRequest, isNewsletterEnabled } from '@/shared/lib/api';
import WordSculpture from '@/shared/ui/WordSculpture';

const linkClass =
  'inline-flex min-h-11 items-center font-sans text-base text-surface-primary/85 underline-offset-4 transition-colors duration-[250ms] hover:text-surface-primary hover:underline';

/**
 * Footer on a midnight scene: newsletter and contact details, three dashed-ruled link columns, legal line and the
 * SILVERAM word across the full width. The newsletter keeps its consent checkbox and its existing API call unchanged.
 */
export default function FooterSection() {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const whatsappUrl = buildWhatsAppUrl(buildGeneralMessage());
  const hasContact = Boolean(whatsappUrl || SITE.instagramUrl || SITE.contactEmail || SITE.contactPhone);

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
    <footer id="contact" className="scene scene-deep">
      <div className="page-container-wide pt-16 md:pt-24">
        <div className="rule-dashed grid gap-12 pt-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <p className="ed-h3 max-w-sm">Silver gifting and jewellery, thoughtfully selected for the moments that matter.</p>

            {isNewsletterEnabled && (
              <form className="mt-8 max-w-md" onSubmit={submitNewsletter}>
                <label htmlFor="newsletter-email" className="label-mono">
                  Silveram updates
                </label>
                <p className="scene-body mt-2 font-sans text-base">Product news and occasional offers, only if you opt in.</p>
                <div className="mt-4 flex items-center gap-2 rounded-[var(--radius-field)] border border-accent-silver p-1.5 pl-4 focus-within:border-surface-primary">
                  <input
                    id="newsletter-email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={newsletterEmail}
                    onChange={(event) => setNewsletterEmail(event.target.value)}
                    placeholder="Email address"
                    className="min-w-0 flex-1 bg-transparent py-2 font-sans text-base text-surface-primary outline-none placeholder:text-surface-primary/60"
                  />
                  <button
                    type="submit"
                    disabled={newsletterBusy || !newsletterConsent}
                    aria-label={newsletterBusy ? 'Joining' : 'Join the Silveram updates list'}
                    className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[var(--radius-field)] bg-surface-primary px-4 font-sans text-sm font-semibold text-brand-primary transition-colors duration-[250ms] hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {newsletterBusy ? 'Joining…' : 'Join'}
                    <ArrowRightIcon size={16} />
                  </button>
                </div>
                <label className="mt-4 flex items-start gap-3 font-sans text-sm leading-relaxed text-surface-primary/85">
                  <input
                    type="checkbox"
                    required
                    checked={newsletterConsent}
                    onChange={(event) => setNewsletterConsent(event.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-accent-silver"
                  />
                  <span>
                    I agree to receive marketing emails. I can unsubscribe at any time. Order and sign-in emails are separate.
                  </span>
                </label>
                <p className="mt-3 min-h-5 font-sans text-sm text-surface-primary/85" role="status" aria-live="polite">
                  {newsletterMessage}
                </p>
              </form>
            )}
          </div>

          <div className="grid gap-10 sm:grid-cols-3 lg:col-span-8 lg:border-l lg:border-dashed lg:border-[color:var(--scene-line)] lg:pl-10">
            <nav aria-label="Collection">
              <h2 className="label-mono label-mono-strong">Collection</h2>
              <ul className="mt-3">
                {PRODUCTS.map((product) => (
                  <li key={product.id}>
                    <a href={productPath(product)} className={linkClass}>
                      {product.name}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="/shop" className={linkClass}>
                    Shop all
                  </a>
                </li>
              </ul>
            </nav>

            <nav aria-label="Company and policies">
              <h2 className="label-mono label-mono-strong">Silveram</h2>
              <ul className="mt-3">
                <li><a href="/#story" className={linkClass}>About us</a></li>
                <li><a href="/#gifting" className={linkClass}>Gifting</a></li>
                <li><a href="/#faq" className={linkClass}>FAQ</a></li>
                <li><a href="/track" className={linkClass}>Track your order</a></li>
                {(Object.keys(POLICIES) as PolicyId[]).map((id) => (
                  <li key={id}>
                    <a href={policyPath(id)} className={linkClass}>
                      {POLICIES[id].title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <h2 className="label-mono label-mono-strong">Visit &amp; contact</h2>
              <address className="scene-body mt-3 font-sans text-base not-italic leading-relaxed">
                <strong className="font-semibold text-surface-primary">{SITE.legalName}</strong>
                <br />
                {SITE.ownerName && <span>Owner: {SITE.ownerName}</span>}
                {SITE.ownerName && <br />}
                {SITE.address.lines.map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
                {SITE.address.locality}, {SITE.address.region} {SITE.address.postalCode}
              </address>
              <ul className="mt-2">
                <li>
                  <a href={SITE.directionsUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    Get directions<span className="sr-only"> (opens Google Maps in a new tab)</span>
                  </a>
                </li>
                <li>
                  <a href={SITE.googleListingUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    Find us on Google<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
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
                {SITE.contactPhone && (
                  <li>
                    <a href={`tel:${SITE.contactPhone.replace(/\s+/g, '')}`} className={linkClass}>
                      {SITE.contactPhone}
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
              {!hasContact && <p className="scene-body mt-3 font-sans text-base">Contact details coming soon.</p>}
            </div>
          </div>
        </div>

        <p className="rule-dashed mt-12 pt-5 font-mono text-[0.8125rem] text-surface-primary/75">
          © {new Date().getFullYear()} Silveram. All rights reserved.
        </p>
      </div>

      <div className="page-container-wide pb-6 pt-8 md:pb-10">
        <WordSculpture />
      </div>
    </footer>
  );
}
