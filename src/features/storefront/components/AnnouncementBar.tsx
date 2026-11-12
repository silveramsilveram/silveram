import Marquee from '@/shared/ui/Marquee';
import { ANNOUNCEMENT_ITEMS } from '../data/content';

/**
 * Compact ticker of facts the site already states. On the homepage it overlays the hero; elsewhere it
 * remains a normal-flow midnight strip. The pause control stops all decorative motion.
 */
export default function AnnouncementBar({ overlay = false }: { overlay?: boolean }) {
  return (
    <aside
      aria-label="Store announcement"
      className={`scene scene-deep ${overlay ? 'absolute inset-x-0 top-0 z-30 bg-brand-primary/70' : ''}`}
    >
      <div className="page-container-wide flex h-10 items-center">
        <Marquee items={ANNOUNCEMENT_ITEMS} label="Store information" compact className="w-full" />
      </div>
    </aside>
  );
}
