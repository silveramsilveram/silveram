import { formatDateTime } from '@/lib/dates';
import { SHIPPING_STATUS, TIMELINE_LABEL } from '@/lib/status';
import type { TimelineEntry } from '@/types/api';

function describe(entry: TimelineEntry): string {
  const base = TIMELINE_LABEL[entry.type] ?? entry.type.replace(/_/g, ' ');
  if (entry.type === 'shipping_status_changed' && entry.fromStatus && entry.toStatus) {
    return `${base}: ${SHIPPING_STATUS[entry.fromStatus]?.label ?? entry.fromStatus} → ${SHIPPING_STATUS[entry.toStatus]?.label ?? entry.toStatus}`;
  }
  if (entry.fromStatus && entry.toStatus) return `${base}: ${entry.fromStatus} → ${entry.toStatus}`;
  return base;
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="sv-timeline" aria-label="Order timeline">
      {entries.map((entry) => (
        <li key={entry.id}>
          <div><strong>{describe(entry)}</strong></div>
          <div className="when">
            {formatDateTime(entry.at)} · {entry.actorType === 'system' ? 'System' : entry.actor}
            {entry.source === 'order_record' ? ' · from the order record' : ''}
          </div>
          {entry.note ? <div>{entry.note}</div> : null}
        </li>
      ))}
    </ol>
  );
}
