import { useEffect, useRef, useState } from 'react';
import { BagIcon, CloseIcon, MenuIcon, UserIcon } from '@/shared/ui/icons';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCart } from '@/features/cart/context/CartContext';
import { NAV_LINKS } from '../data/content';

export default function Header() {
  const { itemCount, setIsCartOpen } = useCart();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const linkClass =
    'type-caption inline-flex min-h-11 items-center font-semibold uppercase tracking-[0.14em] text-text-primary transition-colors underline-offset-8 decoration-accent-silver decoration-1 hover:text-brand-primary hover:underline';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface-primary/95 backdrop-blur-md transition-shadow">
      <div className="page-container flex h-16 items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr]">
        <a
          href="#home"
          className="inline-flex min-h-11 items-center text-lg font-semibold uppercase tracking-[0.3em] text-brand-primary transition-opacity hover:opacity-85"
          aria-label="Silveram – home"
        >
          Silveram
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={linkClass}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-1">
          <a
            href="#/account"
            className="flex h-11 items-center justify-center gap-2 rounded-[2px] px-2.5 text-brand-primary transition-colors hover:bg-surface-secondary"
            aria-label={user ? 'Your account' : 'Sign in or create an account'}
          >
            <UserIcon size={22} />
            <span className="type-caption hidden font-semibold uppercase tracking-[0.14em] lg:inline">
              {user ? 'Account' : 'Sign in'}
            </span>
          </a>
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="group relative flex h-11 w-11 items-center justify-center rounded-[2px] text-brand-primary transition-colors hover:bg-surface-secondary active:scale-95"
            aria-label={`Open shopping bag, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
          >
            <BagIcon size={24} className="transition-transform group-hover:scale-105" />
            {itemCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1 text-xs font-semibold tabular-nums text-surface-primary shadow-sm animate-in fade-in zoom-in-75 duration-200">
                {itemCount}
              </span>
            )}
          </button>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-[2px] text-brand-primary transition-colors hover:bg-surface-secondary active:scale-95 md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 top-16 z-30 bg-brand-primary/40 backdrop-blur-xs md:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <nav
            id="mobile-menu"
            aria-label="Mobile"
            className="relative z-40 border-t border-border bg-surface-primary shadow-xl md:hidden"
          >
            <ul className="page-container py-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href} className="border-b border-border/60 last:border-b-0">
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="type-body flex min-h-12 items-center font-medium uppercase tracking-[0.14em] text-text-primary transition-colors hover:text-brand-primary"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </header>
  );
}
