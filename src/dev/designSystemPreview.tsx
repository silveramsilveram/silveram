import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import Button, { buttonClasses } from '../shared/ui/Button';
import CarouselControls from '../shared/ui/CarouselControls';
import Marquee from '../shared/ui/Marquee';
import Media from '../shared/ui/Media';
import Stamp from '../shared/ui/Stamp';
import WordSculpture from '../shared/ui/WordSculpture';
import HeroSection from '../features/storefront/components/HeroSection';

/** [token, hex, role, measured pairing] from DESIGN.md. */
const SWATCHES: Array<[string, string, string, string]> = [
  ['Midnight Navy', '#182D49', 'Brand anchor', '13.0:1 with ivory'],
  ['Deep Midnight', '#101F34', 'Pressed, deep scenes', '15.5:1 with ivory'],
  ['Soft Midnight', '#243F63', 'Hover', '10.0:1 with ivory'],
  ['Steel Navy', '#385575', 'Supporting tint', '7.2:1 with ivory'],
  ['Ivory', '#F8F7F4', 'Canvas', '13.0:1 with navy'],
  ['Soft Stone', '#EEECE7', 'Mat', '11.8:1 with navy'],
  ['Ice Blue', '#DCE6F0', 'Promo scene', '11.0:1 with navy'],
  ['Champagne', '#D9C5A3', 'Gifting accent', '8.3:1 with navy'],
  ['Sterling Silver', '#A7ADB5', 'Decor; text on navy only', '6.2:1 on navy, 2.1:1 on ivory'],
];

function Section({ title, scene = 'scene-canvas', children }: { title: string; scene?: string; children: React.ReactNode }) {
  return (
    <section className={`scene ${scene} py-14 md:py-20`}>
      <div className="page-container-wide">
        <p className="label-mono rule-dashed pt-3">{title}</p>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

function Preview() {
  const [rail, setRail] = useState(0);
  return (
    <>
      <header className="scene scene-deep py-6">
        <div className="page-container-wide flex items-baseline justify-between gap-4">
          <p className="font-sans text-lg font-semibold tracking-[0.3em] uppercase">Silveram</p>
          <p className="label-mono-sm">Design system, dev preview</p>
        </div>
      </header>

      <Section title="Colour">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SWATCHES.map(([name, hex, role, pair]) => (
            <div key={hex} className="flex items-center gap-4">
              <span className="h-16 w-16 shrink-0 rounded-[var(--radius-field)] border border-border" style={{ background: hex }} />
              <div>
                <p className="font-sans font-semibold">{name}</p>
                <p className="label-mono-sm">{hex} · {role}</p>
                <p className="label-mono-sm scene-body">{pair}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type: Instrument Serif, Courier Prime, League Spartan" scene="scene-mat">
        <p className="ed-statement">A gift that stays.</p>
        <p className="ed-display mt-6">Small keepsakes, <span className="ed-italic">lasting meaning.</span></p>
        <p className="ed-h1 mt-6">Three pieces for the home and the wrist</p>
        <p className="ed-h2 mt-6">Chosen for festivals, weddings and housewarmings</p>
        <p className="ed-h3 mt-6">Silver Kada</p>
        <p className="ed-product mt-6">Peacock Ring</p>
        <p className="label-mono mt-8">Devotional frames · ₹999 · Cash on delivery across India</p>
        <p className="label-mono-sm label-mono-strong mt-2">Courier Prime bold, 13px floor for captions</p>
        <p className="mt-8 max-w-prose font-sans text-base leading-relaxed scene-body">
          League Spartan carries navigation, buttons, prices, forms and every paragraph a customer has to read. It stays
          legible at body size and keeps the quiet, modern counterweight to the serif. ₹12,999 and ₹999 use tabular figures.
        </p>
      </Section>

      <Section title="Actions: pill with checkered underside">
        <div className="flex flex-wrap items-start gap-6">
          <Button>Add to bag</Button>
          <Button variant="secondary">View piece</Button>
          <Button size="lg">Shop the collection</Button>
          <Button size="sm" variant="secondary">Small</Button>
          <Button disabled>Disabled</Button>
          <Button aria-busy="true">Adding…</Button>
          <a href="#x" className={buttonClasses('primary', 'md')}>Link styled as button</a>
          <Button variant="text">Text action</Button>
        </div>
        <div className="scene scene-deep mt-10 flex flex-wrap items-start gap-6 rounded-[var(--radius-media)] p-8">
          <Button variant="inverse">Shop now</Button>
          <Button variant="outline-inverse">Ask on WhatsApp</Button>
          <Button variant="inverse" disabled>Disabled</Button>
        </div>
        <p className="label-mono-sm mt-6 scene-body">Hover compresses the underside, press flattens it. Tab to see the focus ring.</p>
      </Section>

      <Section title="Stamps, dashed rules, form field" scene="scene-ice">
        <div className="flex flex-wrap items-center gap-4">
          <Stamp>Devotional frames</Stamp>
          <Stamp>Kada &amp; bangles</Stamp>
          <Stamp>Statement rings</Stamp>
        </div>
        <div className="rule-dashed mt-8" />
        <div className="frame-dashed mt-8 grid gap-4 p-6 sm:grid-cols-2">
          <label className="label-mono-sm block">
            Email address
            <input className="field mt-2 font-sans" type="email" placeholder="name@example.com" />
          </label>
          <label className="label-mono-sm block">
            Delivery pincode
            <input className="field mt-2 font-sans" inputMode="numeric" placeholder="845401" />
          </label>
        </div>
      </Section>

      <Section title="Media: native size, 20px corners, focal point, film fallback" scene="scene-canvas">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="group">
            <div className="media-zoom">
              <Media src="/images/products/silver-frame-03.webp" alt="Silver Frame in a navy gift box" width={508} height={508} ratio="1 / 1" radius="media" />
            </div>
            <p className="ed-product mt-4">Silver Frame</p>
            <p className="label-mono-sm">508 × 508, shown at native size</p>
          </div>
          <div className="group">
            <div className="media-zoom">
              <Media src="/images/products/peacock-ring-02.webp" alt="Peacock ring from above" width={920} height={768} ratio="4 / 5" focal={{ x: 55, y: 50 }} radius="media" />
            </div>
            <p className="ed-product mt-4">Peacock Ring</p>
            <p className="label-mono-sm">Cropped 4:5 with focal point 55% / 50%</p>
          </div>
          <div>
            <Media kind="video" alt="Silver Kada film" width={920} height={768} ratio="6 / 5" radius="media" poster="/images/products/silver-kada-01.webp" />
            <p className="ed-product mt-4">Film slot, no film yet</p>
            <p className="label-mono-sm">Shows its first frame; a real film plugs into the same slot later</p>
          </div>
        </div>
        <div className="mt-8 flex items-center gap-6">
          <CarouselControls onPrev={() => setRail((v) => Math.max(0, v - 1))} onNext={() => setRail((v) => Math.min(4, v + 1))} prevDisabled={rail === 0} nextDisabled={rail === 4} />
          <p className="label-mono-sm">Position {rail + 1} of 5</p>
        </div>
      </Section>

      <Section title="Marquee with global pause" scene="scene-champagne">
        <Marquee label="Store information" items={['Cash on delivery across India', 'Visit the store in Motihari', 'Questions? Chat with us on WhatsApp']} />
      </Section>

      <Section title="Word sculpture" scene="scene-deep">
        <WordSculpture />
      </Section>

      <Section title="Hero: full-bleed variant (for a future film; photo shown here is only 920px wide, so it is stretched and would be replaced)">
        <HeroSection variant="bleed" />
      </Section>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
