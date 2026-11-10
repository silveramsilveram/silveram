import { ANNOUNCEMENT } from '../data/content';

export default function AnnouncementBar() {
  return (
    <aside aria-label="Store announcement" className="border-b border-border bg-surface-secondary text-text-primary">
      <div className="page-container flex items-center justify-center py-2 text-center">
        <p className="type-caption font-medium text-text-secondary">{ANNOUNCEMENT}</p>
      </div>
    </aside>
  );
}
