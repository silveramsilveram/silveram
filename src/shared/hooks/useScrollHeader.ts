import { useEffect, useState } from 'react';

interface ScrollHeaderState {
  /** Page has moved off the top: the header gains a hairline. */
  scrolled: boolean;
  /** Scrolling down past `hideAfter`: the header slides away; any upward scroll brings it back. */
  hidden: boolean;
}

/**
 * Scroll-aware header state. One passive listener, throttled to animation frames, with a small
 * dead-zone so jitter and iOS rubber-banding never flip the header. The header is always shown
 * near the top of the page. Callers keep it visible while a menu is open or focus is inside it.
 */
export function useScrollHeader({ hideAfter = 140, tolerance = 10 } = {}): ScrollHeaderState {
  const [state, setState] = useState<ScrollHeaderState>({ scrolled: false, hidden: false });

  useEffect(() => {
    let lastY = Math.max(0, window.scrollY);
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const delta = y - lastY;
      setState((previous) => {
        const scrolled = y > 8;
        let hidden = previous.hidden;
        if (y < hideAfter) hidden = false;
        else if (delta > tolerance) hidden = true;
        else if (delta < -tolerance) hidden = false;
        return previous.scrolled === scrolled && previous.hidden === hidden ? previous : { scrolled, hidden };
      });
      if (Math.abs(delta) > tolerance) lastY = y;
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [hideAfter, tolerance]);

  return state;
}
