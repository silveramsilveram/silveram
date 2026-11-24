import { Drawer, Grid } from 'antd';
import { useState } from 'react';
import { useLocation } from 'react-router';
import { adminApi } from '@/services/api';
import { request } from '@/services/apiClient';
import { useApiQuery } from '@/services/useApiQuery';
import type { AdminMe } from '@/types/api';
import { NoticeBar } from './NoticeBar';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell({ me, children }: { me?: AdminMe; children: React.ReactNode }) {
  const screens = Grid.useBreakpoint();
  const location = useLocation();
  const mobile = screens.md === false;
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const statusQuery = useApiQuery(['status'], () => adminApi.status(), { staleTime: 60_000 });
  const dispatchQuery = useApiQuery(
    ['shell-awaiting-dispatch'],
    () => request<{ total: number }>('/admin/orders', { query: { status: 'placed_cod,paid', page: 1, limit: 1 } }),
    { staleTime: 60_000 },
  );

  return (
    <div className={`sv-app-shell${collapsed ? ' sidebar-collapsed' : ''}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <TopBar me={me} status={statusQuery.data} onMenuOpen={() => setDrawerOpen(true)} />
      <div className="sv-shell-body">
        {mobile ? (
          <Drawer
            className="sv-mobile-drawer"
            placement="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            width={280}
            title={null}
          >
            <Sidebar status={statusQuery.data} ordersWaiting={dispatchQuery.data?.total} collapsed={false} onCollapse={() => setCollapsed((value) => !value)} onNavigate={() => setDrawerOpen(false)} />
          </Drawer>
        ) : (
          <aside className={`sv-sidebar${collapsed ? ' is-collapsed' : ''}`}>
            <Sidebar status={statusQuery.data} ordersWaiting={dispatchQuery.data?.total} collapsed={collapsed} onCollapse={() => setCollapsed((value) => !value)} />
          </aside>
        )}
        <main id="main" className={`sv-main${location.pathname === '/' ? ' is-home' : ''}`} tabIndex={-1}>
          <div className="sv-content">{children}</div>
        </main>
      </div>
      <NoticeBar status={statusQuery.data} />
    </div>
  );
}
