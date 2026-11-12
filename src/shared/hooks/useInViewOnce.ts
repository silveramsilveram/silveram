import { useEffect, useState, type RefObject } from 'react';

/**
 * Scroll-triggered, once-only reveal. `armed` turns on after mount (so with no JavaScript, or under
 * `prefers-reduced-motion`, nothing is ever hidden); `seen` turns on the first time the element is 25% in view.
 * Pair with the `.reveal-lines` classes in utilities.css.
 */
export function useInViewOnce(ref: RefObject<HTMLElement | null>): { armed: boolean; seen: boolean } {
  const [armed, setArmed] = useState(false);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof IntersectionObserver === 'undefined') return;
    setArmed(true);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return { armed, seen };
}
