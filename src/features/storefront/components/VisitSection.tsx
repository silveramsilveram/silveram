import { WhatsAppButton, buildGeneralMessage } from '@/features/whatsapp';
import { SITE } from '@/shared/config/site';
import { buttonClasses } from '@/shared/ui/Button';
import Media from '@/shared/ui/Media';
import Stamp from '@/shared/ui/Stamp';
import { VISIT } from '../data/content';

/**
 * The shop in Motihari: a large statement and a dashed address card with working directions, phone and WhatsApp links.
 * Everything shown comes from SITE (the same verified details as the footer). A photograph of the shop can be added
 * later through VISIT.image; the layout already reserves its slot and renders nothing until one exists.
 */
export default function VisitSection() {
  const image = VISIT.image;
  const phoneHref = `tel:${SITE.contactPhone.replace(/\s+/g, '')}`;

  return (
    <section id="visit" aria-labelledby="visit-heading" className="scene scene-mat py-16 md:py-24">
      <div className="page-container-wide grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        {image && (
          <div className="lg:col-span-5">
            <Media
              src={image.src}
              fallbackSrc={image.fallbackSrc}
              alt={image.alt}
              width={image.width}
              height={image.height}
              radius="media"
              sizes="(min-width: 1024px) 520px, 100vw"
            />
          </div>
        )}

        <div className="lg:col-span-7">
          <h2 id="visit-heading" className="ed-display">
            {VISIT.statement}
          </h2>
          <p className="scene-body mt-6 max-w-lg font-sans text-lg leading-relaxed">{VISIT.description}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <a href={SITE.directionsUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses('primary', 'lg')}>
              Get directions
              <span className="sr-only"> (opens Google Maps in a new tab)</span>
            </a>
            <a href={SITE.googleListingUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses('secondary', 'lg')}>
              Find us on Google
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>

        <div className={image ? 'lg:col-span-12' : 'lg:col-span-5'}>
          <div className="frame-dashed p-7 md:p-9">
            <Stamp>
              {SITE.address.locality}, {SITE.address.region}
            </Stamp>
            <address className="mt-5 font-sans text-lg not-italic leading-relaxed">
              <strong className="font-semibold">{SITE.legalName}</strong>
              <br />
              {SITE.address.lines.map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
              {SITE.address.locality}, {SITE.address.region} {SITE.address.postalCode}
            </address>
            <ul className="mt-5 space-y-1 font-sans text-base">
              <li>
                <a href={phoneHref} className="inline-flex min-h-11 items-center underline decoration-1 underline-offset-4">
                  {SITE.contactPhone}
                </a>
              </li>
              {SITE.contactEmail && (
                <li>
                  <a href={`mailto:${SITE.contactEmail}`} className="inline-flex min-h-11 items-center underline decoration-1 underline-offset-4">
                    {SITE.contactEmail}
                  </a>
                </li>
              )}
            </ul>
            <div className="mt-5">
              <WhatsAppButton message={buildGeneralMessage()} variant="secondary" size="md">
                Message us on WhatsApp
              </WhatsAppButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
