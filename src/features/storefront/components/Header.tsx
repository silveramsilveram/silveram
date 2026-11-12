import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BagIcon, CloseIcon, MenuIcon, UserIcon } from '@/shared/ui/icons';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useCartStore } from '@/features/cart/store/cartStore';
import { useDialog } from '@/shared/hooks/useDialog';
import { useScrollHeader } from '@/shared/hooks/useScrollHeader';
import { useHash, useLocationKey, useRoute } from '@/shared/routing/router';
import { MENU_EXTRA_LINKS, NAV_LINKS } from '../data/content';

const WORDMARK =
  'inline-flex min-h-11 items-center justify-self-start font-display text-[1.75rem] uppercase leading-none tracking-[0.06em] transition-opacity duration-[250ms] hover:opacity-80';

export default function Header({ overlay = false }: { overlay?: boolean }) {
  const itemCount = useCartStore((state) => state.itemCount);
  const user = useAuthStore((state) => state.user);
  const route = useRoute();
  const hash = useHash();
  const locationKey = useLocationKey();
  const { scrolled, hidden } = useScrollHeader();
  const [menuOpen, setMenuOpen] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => setMenuOpen(false);
  // Esc to close, focus trap, scroll lock, and focus returns to the menu button.
  useDialog(menuOpen, closeMenu, panelRef);

  useEffect(() => {
    if (!overlay) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const hero = document.getElementById('home');
      const next = hero
        ? hero.getBoundingClientRect().bottom <= (headerRef.current?.offsetHeight ?? 0)
        : false;
      setPastHero((current) => (current === next ? current : next));
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [overlay]);

  // The panel is for small screens only: close it if the window grows to the desktop layout,
  // and whenever the page changes.
  const closedByResize = useRef(false);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (!query.matches) return;
      closedByResize.current = true;
      setMenuOpen(false);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  // The menu button is hidden at desktop width, so it cannot take focus back after a resize.
  // Declared after useDialog so it runs after the dialog has tried to restore focus.
  useEffect(() => {
    if (menuOpen || !closedByResize.current) return;
    closedByResize.current = false;
    document.querySelector<HTMLElement>('nav[aria-label="Primary"] a')?.focus();
  }, [menuOpen]);
  useEffect(() => setMenuOpen(false), [locationKey]);

  /** Shop is the current page on the shop and product routes; in-page links mark the current section. */
  const currentFor = (href: string): 'page' | 'location' | undefined => {
    if (href === '/shop') return route.name === 'shop' || route.name === 'product' ? 'page' : undefined;
    return route.name === 'home' && `/${hash}` === href ? 'location' : undefined;
  };

  const accountCurrent: 'page' | undefined = ['account', 'signin', 'signup'].includes(route.name) ? 'page' : undefined;
  const bagCurrent: 'page' | undefined = route.name === 'cart' ? 'page' : undefined;
  const accountHref = user ? '/account' : '/signin';
  const accountLabel = user ? 'Your account' : 'Sign in';
  const bagLabel = `Shopping bag, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;

  // Never hide the header while the menu is open or keyboard focus is inside it.
  const slideAway = hidden && !menuOpen && !focusInside;
  const transparent = overlay && !pastHero;
  const position = overlay ? `fixed inset-x-0 ${scrolled ? 'top-0' : 'top-10'}` : 'sticky top-0';
  const shadow = scrolled && (!overlay || pastHero) ? 'shadow-[0_1px_0_0_var(--color-border)]' : '';

  return (
    <>
      <header
        ref={headerRef}
        onFocusCapture={() => setFocusInside(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusInside(false);
        }}
        className={`${position} z-40 ${
          transparent ? 'header-home-overlay bg-transparent' : 'bg-surface-primary'
        } transition-[top,transform,box-shadow,background-color] duration-[400ms] ease-in-out ${
          slideAway ? '-translate-y-full' : ''
        } ${shadow}`}
      >
        <div className="page-container-wide flex h-[4.5rem] items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr]">
          <a
            href="/"
            className={`${WORDMARK} ${transparent ? 'text-surface-primary' : 'text-brand-primary'} header-wordmark`}
            aria-label="Silveram, home"
          >
            Silveram
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-8 md:flex lg:gap-12">
            {NAV_LINKS.map((link) => {
              const current = currentFor(link.href);
              return (
                <a key={link.href} href={link.href} aria-current={current} className="nav-link">
                  {link.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center justify-end gap-2">
            <a href={accountHref} aria-current={accountCurrent} className="header-chip" aria-label={accountLabel}>
              <UserIcon size={20} />
              <span className="hidden lg:inline">{user ? 'Account' : 'Sign in'}</span>
            </a>
            <a href="/cart" aria-current={bagCurrent} className="header-chip" aria-label={bagLabel}>
              <BagIcon size={20} />
              <span className="hidden sm:inline">Bag</span>
              <span aria-hidden="true" className="font-mono text-[0.8125rem] tabular-nums">
                {itemCount > 0 ? `(${itemCount})` : ''}
              </span>
            </a>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="header-chip md:hidden"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <MenuIcon size={22} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          id="mobile-menu"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          tabIndex={-1}
          className="menu-in scene scene-canvas fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain focus:outline-none md:hidden"
        >
          <div className="page-container-wide flex h-[4.5rem] shrink-0 items-center justify-between">
            <a href="/" onClick={closeMenu} className={`${WORDMARK} text-brand-primary`} aria-label="Silveram, home">
              Silveram
            </a>
            <button type="button" onClick={closeMenu} className="header-chip" aria-label="Close menu">
              <CloseIcon size={22} />
            </button>
          </div>

          <nav aria-label="Mobile" className="page-container-wide flex flex-1 flex-col pb-8 pt-4">
            <ul className="rule-dashed">
              {NAV_LINKS.map((link, index) => {
                const current = currentFor(link.href);
                return (
                  <li key={link.href} className="rule-dashed-b menu-link-in" style={{ '--i': index } as CSSProperties}>
                    <a
                      href={link.href}
                      aria-current={current}
                      onClick={closeMenu}
                      className="ed-h2 flex min-h-[4.5rem] items-center justify-between"
                    >
                      {link.label}
                      {current && <span aria-hidden="true" className="inline-block h-2 w-2 rotate-45 border border-current" />}
                    </a>
                  </li>
                );
              })}
            </ul>

            <ul className="mt-6">
              {[
                { key: 'account', href: accountHref, label: accountLabel, current: accountCurrent, icon: <UserIcon size={22} /> },
                { key: 'bag', href: '/cart', label: `Bag${itemCount > 0 ? ` (${itemCount})` : ''}`, current: bagCurrent, icon: <BagIcon size={22} /> },
              ].map((item, index) => (
                <li key={item.key} className="menu-link-in" style={{ '--i': NAV_LINKS.length + index } as CSSProperties}>
                  <a
                    href={item.href}
                    aria-current={item.current}
                    onClick={closeMenu}
                    className="flex min-h-12 items-center gap-3 font-sans text-base font-semibold"
                  >
                    {item.icon}
                    {item.label}
                  </a>
                </li>
              ))}
              {MENU_EXTRA_LINKS.map((link, index) => (
                <li key={link.href} className="menu-link-in" style={{ '--i': NAV_LINKS.length + 2 + index } as CSSProperties}>
                  <a href={link.href} onClick={closeMenu} className="flex min-h-12 items-center font-sans text-base text-text-secondary">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
