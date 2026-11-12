import type { KeyboardEvent } from 'react';

/**
 * Arrow-key navigation for a row of tabs or radio-style choices (WAI-ARIA roving tabindex pattern):
 * Left/Up = previous, Right/Down = next, Home/End = first/last. Returns the new index, or null when the key
 * is not a navigation key. The caller moves focus to the matching element.
 */
export function nextRovingIndex(event: KeyboardEvent, current: number, count: number): number | null {
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
