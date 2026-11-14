import {
  AppstoreOutlined, BarChartOutlined, DashboardOutlined, DownloadOutlined, InboxOutlined, LogoutOutlined, MenuOutlined, SettingOutlined,
  ShoppingOutlined, SwapOutlined, TeamOutlined, TagsOutlined,
} from '@ant-design/icons';
import { useLogout } from '@refinedev/core';
import { Alert, Button, Drawer, Grid, Layout, Menu, Tag } from 'antd';
import type { MenuProps } from 'antd';
import { Suspense, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { LoadingBlock } from '@/components/primitives';
import { loadIdentity } from '@/providers/authProvider';
import { EXPECTED_API_VERSION } from '@/services/api';
import { useApiQuery } from '@/services/useApiQuery';

const { Sider, Header, Content } = Layout;

type Item = Required<MenuProps>['items'][number];
const link = (key: string, label: string): Item => ({ key, label: <Link to={key}>{label}</Link> });

/** Every entry routes to a real, working page. Capabilities that do not exist (refunds, settlements) are not listed. */
export const MENU_ITEMS: Item[] = [
  { key: '/', icon: <DashboardOutlined />, label: <Link to="/">Overview</Link> },
  {
    key: 'products', icon: <TagsOutlined />, label: 'Products',
    children: [link('/products', 'All products'), link('/products/create', 'Add product'), link('/products/price-history', 'Price history')],
  },
  {
    key: 'orders', icon: <ShoppingOutlined />, label: 'Orders',
    children: [
      link('/orders', 'All orders'),
      link('/orders?status=placed_cod,paid', 'Awaiting dispatch'),
      link('/orders?status=fulfilled', 'Dispatched'),
      link('/orders?shippingStatus=delivered', 'Delivered'),
      link('/orders?overdue=true', 'Overdue delivery'),
      link('/orders?status=cancelled,expired,payment_review', 'Cancelled / expired / review'),
    ],
  },
  {
    key: 'transactions', icon: <SwapOutlined />, label: 'Transactions',
    children: [
      link('/transactions', 'All transactions'),
      link('/transactions?type=payment&status=success', 'Successful collections'),
      link('/transactions?type=payment_attempt', 'Failed attempts'),
      link('/transactions?type=refund', 'Refunds'),
      link('/transactions/cod', 'COD cash & reconciliation'),
    ],
  },
  {
    key: 'inventory', icon: <InboxOutlined />, label: 'Inventory',
    children: [link('/inventory', 'Stock overview'), link('/inventory?state=low', 'Low stock'), link('/inventory/movements', 'Stock movements')],
  },
  { key: '/customers', icon: <TeamOutlined />, label: <Link to="/customers">Customers</Link> },
  { key: '/analytics', icon: <BarChartOutlined />, label: <Link to="/analytics">Analytics</Link> },
  { key: '/reports', icon: <DownloadOutlined />, label: <Link to="/reports">Reports</Link> },
  { key: '/settings', icon: <SettingOutlined />, label: <Link to="/settings">Settings</Link> },
];

function selectedKey(pathname: string, search: string): { selected: string; open: string[] } {
  const full = `${pathname}${search}`;
  const flat = MENU_ITEMS.flatMap((item) => ('children' in (item ?? {}) ? ((item as { children: Item[] }).children) : [item]));
  const keys = flat.map((item) => String((item as { key: string }).key));
  const selected = keys.includes(full) ? full
    : keys.filter((key) => !key.includes('?') && key !== '/' && (pathname === key || pathname.startsWith(`${key}/`))).sort((a, b) => b.length - a.length)[0]
      ?? (pathname === '/' ? '/' : '');
  const open = MENU_ITEMS.filter((item) => 'children' in (item ?? {}) && (item as { children: Item[] }).children.some((child) => (child as { key: string }).key === selected))
    .map((item) => String((item as { key: string }).key));
  return { selected, open };
}

function Brand() {
  return (
    <div className="sv-brand">
      <span className="display">Silveram</span>
      <span className="mono">Admin</span>
    </div>
  );
}

export function AdminLayout() {
  const screens = Grid.useBreakpoint();
  const mobile = screens.md === false;
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const { mutate: logout, isPending } = useLogout();
  const me = useApiQuery(['me'], () => loadIdentity(), { staleTime: 60_000 });
  const { selected, open } = useMemo(() => selectedKey(location.pathname, location.search), [location.pathname, location.search]);

  const menu = (
    <Menu theme="dark" mode="inline" items={MENU_ITEMS} selectedKeys={[selected]} defaultOpenKeys={open} onClick={() => setDrawer(false)} style={{ borderInlineEnd: 0, background: 'transparent' }} />
  );

  return (
    <Layout style={{ minHeight: '100%' }}>
      <a className="skip-link" href="#main">Skip to content</a>
      {mobile ? (
        <Drawer placement="left" open={drawer} onClose={() => setDrawer(false)} width={280} styles={{ body: { padding: 0, background: '#182d49' }, header: { display: 'none' } }}>
          <Brand />
          {menu}
        </Drawer>
      ) : (
        <Sider className="sv-sider" width={264} collapsible collapsed={collapsed} onCollapse={setCollapsed} breakpoint="lg" style={{ position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
          {collapsed ? <div className="sv-brand" style={{ padding: '22px 0', textAlign: 'center' }}><span className="display">S</span></div> : <Brand />}
          {menu}
        </Sider>
      )}
      <Layout>
        <Header className="sv-header">
          {mobile ? <Button type="text" icon={<MenuOutlined />} aria-label="Open navigation" onClick={() => setDrawer(true)} /> : null}
          <AppstoreOutlined aria-hidden style={{ color: 'var(--muted)' }} />
          <span className="muted" style={{ flex: 1 }}>Store admin</span>
          {me.data ? <Tag style={{ margin: 0 }} title="Signed in as">{me.data.user.email}</Tag> : null}
          <Button icon={<LogoutOutlined />} loading={isPending} onClick={() => logout()}>{mobile ? '' : 'Sign out'}</Button>
        </Header>
        <Content>
          <main id="main" className="sv-content" tabIndex={-1}>
            {me.data && me.data.apiVersion !== EXPECTED_API_VERSION ? (
              <Alert style={{ marginBottom: 16 }} type="warning" showIcon message="The admin API needs updating"
                description={`This admin expects API version ${EXPECTED_API_VERSION} but the server reports ${me.data.apiVersion}. Deploy the matching backend before using financial screens.`} />
            ) : null}
            {me.data && !me.data.schema.ready ? (
              <Alert style={{ marginBottom: 16 }} type="warning" showIcon message="The database needs the admin schema update"
                description={<span>These items are not provisioned yet: <span className="mono">{me.data.schema.missing.join(', ')}</span>. Run <span className="mono">npm --prefix server run appwrite:setup</span> (additive, safe to repeat); some screens will fail until then.</span>} />
            ) : null}
            <Suspense fallback={<LoadingBlock rows={8} />}><Outlet /></Suspense>
          </main>
        </Content>
      </Layout>
    </Layout>
  );
}
