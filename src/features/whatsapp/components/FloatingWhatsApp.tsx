import { useEffect, useRef, useState } from 'react';
import { WhatsAppIcon } from '@/shared/ui/icons';
import { buildWhatsAppUrl } from '../url';
import { buildGeneralMessage } from '../messages';

/** Below this width the hero fills the screen, so the chat shortcut waits until the hero has scrolled away. */
const COMPACT_QUERY = '(max-width: 1023px)';
const ACTION_SELECTOR = [
  'main a[href]',
  'main button',
  'main input',
  'main select',
  'main summary',
  'main textarea',
  'footer a[href]',
  'footer button',
  'footer input',
  'footer select',
  'footer summary',
  'footer textarea',
].join(',');

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

function useHiddenWhenOverlappingAction(): boolean {
  const [overlap, setOverlap] = useState(false);
  const overlapRef = useRef(false);

  useEffect(() => {
    let settleTimer = 0;
    const update = () => {
      const floating = document.querySelector<HTMLElement>('aside[aria-label="WhatsApp contact"] a');
      if (!floating) return;

      const floatingRect = floating.getBoundingClientRect();
      const collides = Array.from(document.querySelectorAll<HTMLElement>(ACTION_SELECTOR)).some((target) => {
        const rect = target.getBoundingClientRect();
        if (
          rect.width <= 0 ||
          rect.height <= 0 ||
          rect.left >= floatingRect.right ||
          rect.right <= floatingRect.left ||
          rect.top >= floatingRect.bottom ||
          rect.bottom <= floatingRect.top
        ) {
          return false;
        }

        const style = window.getComputedStyle(target);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (collides === overlapRef.current) return;
      overlapRef.current = collides;
      setOverlap(collides);
    };
    const onScroll = () => {
      update();
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(update, 150);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', update);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    resizeObserver?.observe(document.body);
    const mutationObserver = new MutationObserver(update);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', update);
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      window.clearTimeout(settleTimer);
    };
  }, []);

  return overlap;
}

/** Floating chat shortcut. Renders nothing until a WhatsApp number is configured. */
export default function FloatingWhatsApp() {
  const href = buildWhatsAppUrl(buildGeneralMessage());
  const overHero = useHiddenOverHero();
  const overlapsAction = useHiddenWhenOverlappingAction();
  const hidden = overHero || overlapsAction;
  if (!href) return null;

  return (
    <aside aria-label="WhatsApp contact" aria-hidden={hidden || undefined}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Silveram on WhatsApp (opens in a new tab)"
        aria-hidden={hidden || undefined}
        tabIndex={hidden ? -1 : undefined}
        style={overlapsAction ? { transition: 'none' } : undefined}
        className={`group fixed bottom-5 right-5 z-30 flex items-center gap-2.5 rounded-full border border-accent-silver/50 bg-brand-primary p-3 text-surface-primary shadow-xl transition-[transform,opacity,visibility,background-color,box-shadow] duration-300 hover:scale-105 hover:bg-brand-primary-hover hover:shadow-2xl active:scale-95 md:bottom-7 md:right-7 ${
          overlapsAction
            ? 'pointer-events-none invisible opacity-0'
            : hidden
              ? 'pointer-events-none invisible translate-y-3 opacity-0'
              : 'visible translate-y-0 opacity-100'
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
