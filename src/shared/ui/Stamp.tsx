import type { ReactNode } from 'react';

/** Oval outlined label for a category or status ("Devotional frames", "Back in stock"). Inherits the scene's text colour. */
export default function Stamp({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`stamp ${className}`.trim()}>{children}</span>;
}
