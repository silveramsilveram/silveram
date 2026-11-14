import type { ReactNode } from 'react';

export interface HBarItem { key: string; label: ReactNode; value: number; display: ReactNode; note?: ReactNode }

/** Ranked horizontal bars (labels + values stay as text, so it works without seeing colour). */
export function HBarList({ items, empty = 'Nothing to show for this period.' }: { items: HBarItem[]; empty?: string }) {
  if (items.length === 0) return <div className="muted">{empty}</div>;
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div role="list">
      {items.map((item) => (
        <div className="sv-hbar" role="listitem" key={item.key}>
          <div style={{ overflowWrap: 'anywhere' }}>{item.label}{item.note ? <div className="muted" style={{ fontSize: 12 }}>{item.note}</div> : null}</div>
          <div className="track" aria-hidden="true"><div className="fill" style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0)}%` }} /></div>
          <div className="num" style={{ textAlign: 'right', fontWeight: 500 }}>{item.display}</div>
        </div>
      ))}
    </div>
  );
}
