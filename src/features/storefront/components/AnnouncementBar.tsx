import { ANNOUNCEMENT } from '../data/content';

export default function AnnouncementBar() {
  return (
    <aside aria-label="Store announcement" className="border-b border-border/60 bg-surface-secondary text-text-primary">
      <div className="page-container flex items-center justify-center py-2 text-center">
        <p className="type-caption inline-flex items-center gap-2 font-medium tracking-[0.08em] text-text-secondary">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-silver" aria-hidden="true" />
          <span>{ANNOUNCEMENT}</span>
        </p>
      </div>
    </aside>
  );
}
