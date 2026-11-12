import { useEffect, useState } from 'react';
import { WhatsAppIcon } from '@/shared/ui/icons';
import { buildWhatsAppUrl } from '../url';
import { buildGeneralMessage } from '../messages';

/** Below this width the hero fills the screen, so the chat shortcut waits until the hero has scrolled away. */
const COMPACT_QUERY = '(max-width: 1023px)';

/**
 * Whether the home page hero (`#home`) is on screen on a compact viewport. On those screens the floating button
 * would sit on top of the hero's product list and photograph, so it hides until the hero has scrolled out of view.
 * On other pages (no `#home`) and on wide screens it is always shown.
 */
function useHiddenOverHero(): boolean {
  const [overHero, setOverHero] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('home');
    if (!hero || typeof IntersectionObserver === 'undefined') return;
    const query = window.matchMedia(COMPACT_QUERY);
    let intersecting = false;
    const apply = () => setOverHero(query.matches && intersecting);
    const observer = new IntersectionObserver(
      ([entry]) => {
        intersecting = Boolean(entry?.isIntersecting);
        apply();
      },
      // Treat the hero as "in view" until its bottom edge is well above the button.
      { rootMargin: '0px 0px -80px 0px', threshold: 0 },
    );
    observer.observe(hero);
    query.addEventListener('change', apply);
    return () => {
      observer.disconnect();
      query.removeEventListener('change', apply);
    };
  }, []);

  return overHero;
}

/** Floating chat shortcut. Renders nothing until a WhatsApp number is configured. */
export default function FloatingWhatsApp() {
  const href = buildWhatsAppUrl(buildGeneralMessage());
  const hidden = useHiddenOverHero();
  if (!href) return null;

  return (
    <aside aria-label="WhatsApp contact">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Silveram on WhatsApp (opens in a new tab)"
        aria-hidden={hidden || undefined}
        tabIndex={hidden ? -1 : undefined}
        className={`group fixed bottom-5 right-5 z-30 flex items-center gap-2.5 rounded-full border border-accent-silver/50 bg-brand-primary p-3 text-surface-primary shadow-xl transition-[transform,opacity,visibility,background-color,box-shadow] duration-300 hover:scale-105 hover:bg-brand-primary-hover hover:shadow-2xl active:scale-95 md:bottom-7 md:right-7 ${
          hidden ? 'pointer-events-none invisible translate-y-3 opacity-0' : 'visible translate-y-0 opacity-100'
        }`}
      >
        <span className="relative flex h-8 w-8 items-center justify-center">
          <WhatsAppIcon size={24} aria-hidden="true" />
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-brand-primary bg-emerald-400" aria-hidden="true" />
        </span>
        <span className="hidden pr-2 text-xs font-semibold uppercase tracking-wider md:inline-block">
          Chat with us
        </span>
      </a>
    </aside>
  );
}
