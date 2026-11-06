import { useEffect, useRef, useState } from 'react';
import { BagIcon, CloseIcon, MenuIcon, UserIcon } from '@/shared/ui/icons';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCart } from '@/features/cart/context/CartContext';
import { useDialog } from '@/shared/hooks/useDialog';
import { useHashRoute } from '@/shared/hooks/useHashRoute';
import { NAV_LINKS } from '../data/content';

const WORDMARK =
  'inline-flex min-h-11 items-center text-lg font-semibold uppercase tracking-[0.3em] text-brand-primary transition-opacity hover:opacity-85';

/** Tracks the URL hash so in-page links (#story, #gifting, #contact) can show where you are. */
function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export default function Header() {
  const { itemCount } = useCart();
  const { user } = useAuth();
  const route = useHashRoute();
  const hash = useHash();
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => setMenuOpen(false);
  // Esc to close, focus trap, scroll lock, and focus returns to the menu button.
  useDialog(menuOpen, closeMenu, panelRef);

  // The panel is for small screens only: close it if the window grows to the desktop layout,
  // and whenever the page changes.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const onChange = () => query.matches && setMenuOpen(false);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  useEffect(() => setMenuOpen(false), [hash]);

  /** Shop is the current page on the shop and product routes; in-page links mark the current section. */
  const currentFor = (href: string): 'page' | 'location' | undefined => {
    if (href === '#/shop') return route.name === 'shop' || route.name === 'product' ? 'page' : undefined;
    return route.name === 'home' && hash === href ? 'location' : undefined;
  };

  const accountCurrent = ['account', 'signin', 'signup'].includes(route.name) ? 'page' : undefined;
  const bagCurrent = route.name === 'cart' ? 'page' : undefined;
  const accountHref = user ? '#/account' : '#/signin';
  const accountLabel = user ? 'Your account' : 'Sign in';
  const bagLabel = `Shopping bag, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;

  const navLink = (current: 'page' | 'location' | undefined) =>
    `type-body inline-flex min-h-11 items-center font-medium underline-offset-8 decoration-1 transition-colors hover:text-brand-primary hover:underline ${
      current ? 'text-brand-primary underline decoration-brand-primary' : 'text-text-primary decoration-accent-silver'
    }`;
  const iconLink =
    'flex h-11 items-center justify-center gap-2 rounded-[2px] px-2.5 text-brand-primary transition-colors hover:bg-surface-secondary aria-[current=page]:bg-surface-secondary';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface-primary">
      <div className="page-container flex h-16 items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr]">
        <a href="#home" className={WORDMARK} aria-label="Silveram, home">
          Silveram
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex lg:gap-10">
          {NAV_LINKS.map((link) => {
            const current = currentFor(link.href);
            return (
              <a key={link.href} href={link.href} aria-current={current} className={navLink(current)}>
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-1">
          <a href={accountHref} aria-current={accountCurrent} className={iconLink} aria-label={accountLabel}>
            <UserIcon size={22} />
            <span className="type-body hidden font-medium lg:inline">{user ? 'Account' : 'Sign in'}</span>
          </a>
          <a href="#/cart" aria-current={bagCurrent} className={`${iconLink} relative w-11 px-0!`} aria-label={bagLabel}>
            <BagIcon size={24} />
            {itemCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute right-0 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-[2px] bg-brand-primary px-1 text-xs font-semibold tabular-nums text-surface-primary"
              >
                {itemCount}
              </span>
            )}
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-[2px] text-brand-primary transition-colors hover:bg-surface-secondary md:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <MenuIcon size={24} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="mobile-menu"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain bg-surface-primary focus:outline-none md:hidden"
        >
          <div className="page-container flex h-16 shrink-0 items-center justify-between border-b border-border">
            <a href="#home" onClick={closeMenu} className={WORDMARK} aria-label="Silveram, home">
              Silveram
            </a>
            <button
              type="button"
              onClick={closeMenu}
              className="flex h-11 w-11 items-center justify-center rounded-[2px] text-brand-primary transition-colors hover:bg-surface-secondary"
              aria-label="Close menu"
            >
              <CloseIcon size={24} />
            </button>
          </div>

          <nav aria-label="Mobile" className="page-container flex-1 py-6">
            <ul>
              {NAV_LINKS.map((link) => {
                const current = currentFor(link.href);
                return (
                  <li key={link.href} className="border-b border-border">
                    <a
                      href={link.href}
                      aria-current={current}
                      onClick={closeMenu}
                      className={`type-h3 flex min-h-16 items-center justify-between ${
                        current ? 'text-brand-primary' : 'text-text-primary'
                      }`}
                    >
                      {link.label}
                    </a>
                  </li>
                );
              })}
            </ul>

            <ul className="mt-6">
              <li>
                <a href={accountHref} aria-current={accountCurrent} onClick={closeMenu} className="type-body flex min-h-12 items-center gap-3 font-medium">
                  <UserIcon size={22} />
                  {accountLabel}
                </a>
              </li>
              <li>
                <a href="#/cart" aria-current={bagCurrent} onClick={closeMenu} className="type-body flex min-h-12 items-center gap-3 font-medium">
                  <BagIcon size={22} />
                  Bag{itemCount > 0 ? ` (${itemCount})` : ''}
                </a>
              </li>
              <li>
                <a href="#/track" onClick={closeMenu} className="type-body flex min-h-12 items-center font-medium text-text-secondary">
                  Track your order
                </a>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
