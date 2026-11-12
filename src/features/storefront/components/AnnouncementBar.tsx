import Marquee from '@/shared/ui/Marquee';
import { ANNOUNCEMENT_ITEMS } from '../data/content';

/**
 * Compact midnight strip above the header: a slow ticker of facts the site already states. It scrolls away
 * with the page (the header is the sticky element). The pause control stops all decorative motion.
 */
export default function AnnouncementBar() {
  return (
    <aside aria-label="Store announcement" className="scene scene-deep">
      <div className="page-container-wide flex h-10 items-center">
        <Marquee items={ANNOUNCEMENT_ITEMS} label="Store information" compact className="w-full" />
      </div>
    </aside>
  );
}
