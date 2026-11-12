import { useCallback, useSyncExternalStore } from 'react';

/**
 * One site-wide switch for decorative motion (marquee, spinning stamps, looping film).
 * State lives on <html data-motion="paused|running"> so CSS can react to it, and is remembered
 * per browser. Storage may be blocked (private windows), so every access is guarded.
 * Meaningful motion (page transitions the user triggers, focus changes) is never paused by this.
 */
const STORAGE_KEY = 'silveram:motion';
const listeners = new Set<() => void>();

function readPaused(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.motion === 'paused';
}

if (typeof document !== 'undefined') {
  try {
    if (window.localStorage.getItem(STORAGE_KEY) === 'paused') document.documentElement.dataset.motion = 'paused';
  } catch {
    /* storage unavailable: motion simply starts running */
  }
}

export function setDecorativeMotionPaused(paused: boolean): void {
  document.documentElement.dataset.motion = paused ? 'paused' : 'running';
  try {
    window.localStorage.setItem(STORAGE_KEY, paused ? 'paused' : 'running');
  } catch {
    /* ignore */
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `[paused, setPaused]` for the global decorative-motion switch. */
export function useDecorativeMotionPaused(): readonly [boolean, (paused: boolean) => void] {
  const paused = useSyncExternalStore(subscribe, readPaused, () => false);
  const set = useCallback((value: boolean) => setDecorativeMotionPaused(value), []);
  return [paused, set] as const;
}

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReduced(listener: () => void): () => void {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

/** True when the visitor's system asks for reduced motion. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}
