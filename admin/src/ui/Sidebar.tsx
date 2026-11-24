import {
  BarChartOutlined, DashboardOutlined, DownOutlined, ExportOutlined, SettingOutlined, ShoppingOutlined,
  StarOutlined, TagsOutlined, TeamOutlined, SwapOutlined,
} from '@ant-design/icons';
import { App, Button, Menu, Popover, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router';
import type { AdminStatus } from '@/types/api';
import { QuickAdd } from './QuickAdd';
import { SetupProgress } from './SetupProgress';

type MenuItem = Required<MenuProps>['items'][number];
const FAVOURITES_KEY = 'silveram.admin.favourites.v1';
const FAVOURITE_ROUTES: Record<string, string> = {
  '/': 'Home',
  '/orders': 'Orders',
  '/products': 'Products',
  '/inventory': 'Inventory',
  '/customers': 'Customers',
  '/money/payments': 'Payments',
  '/money/cod': 'COD cash',
  '/analytics': 'Analytics',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

const link = (to: string, label: string): MenuItem => ({
  key: to,
  title: label,
  label: <Link to={to}>{label}</Link>,
});

function menuItems(ordersWaiting: number): MenuItem[] {
  return [
  { key: '/', icon: <DashboardOutlined />, title: 'Home', label: <Link to="/">Home</Link> },
  {
    key: '/orders',
    icon: <ShoppingOutlined />,
    title: 'Orders',
    label: <Link className="sv-navigation-label" to="/orders">
      <span>Orders</span>
      {ordersWaiting > 0 ? <span className="sv-menu-count" aria-label={`${ordersWaiting} waiting for dispatch`}>{ordersWaiting}</span> : null}
    </Link>,
  },
  {
    key: 'products',
    icon: <TagsOutlined />,
    title: 'Products',
    label: 'Products',
    children: [link('/products', 'Products'), link('/inventory', 'Inventory'), link('/products/price-history', 'Price history')],
  },
  { key: '/customers', icon: <TeamOutlined />, title: 'Customers', label: <Link to="/customers">Customers</Link> },
  {
    key: 'money',
    icon: <SwapOutlined />,
    title: 'Money',
    label: 'Money',
    children: [link('/money/payments', 'Payments'), link('/money/cod', 'COD cash'), link('/reports', 'Reports')],
  },
  { key: '/analytics', icon: <BarChartOutlined />, title: 'Analytics', label: <Link to="/analytics">Analytics</Link> },
  { key: '/settings', icon: <SettingOutlined />, title: 'Settings', label: <Link to="/settings">Settings</Link> },
  ];
}

const MENU_ITEMS = menuItems(0);

function routeState(pathname: string): { selected: string; open: string[] } {
  const flat = MENU_ITEMS.flatMap((item) => ('children' in (item ?? {}) ? ((item as { children: MenuItem[] }).children) : [item]));
  const keys = flat.map((item) => String((item as { key: string }).key));
  const selected = keys.includes(pathname)
    ? pathname
    : keys.filter((key) => key.startsWith('/') && key !== '/' && pathname.startsWith(`${key}/`)).sort((a, b) => b.length - a.length)[0]
      ?? (pathname === '/' ? '/' : '');
  const open = MENU_ITEMS.filter((item) => 'children' in (item ?? {}) && (item as { children: MenuItem[] }).children.some((child) => (child as { key: string }).key === selected))
    .map((item) => String((item as { key: string }).key));
  return { selected, open };
}

function storedFavourites(): string[] {
  const value = window.localStorage.getItem(FAVOURITES_KEY);
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((path): path is string => typeof path === 'string' && path in FAVOURITE_ROUTES).slice(0, 5);
  } catch {
    return [];
  }
}

export function Sidebar({ status, ordersWaiting = 0, collapsed, onCollapse, onNavigate }: {
  status?: AdminStatus;
  ordersWaiting?: number;
  collapsed: boolean;
  onCollapse: () => void;
  onNavigate?: () => void;
}) {
  const { message } = App.useApp();
  const location = useLocation();
  const { selected, open } = useMemo(() => routeState(location.pathname), [location.pathname]);
  const items = useMemo(() => menuItems(ordersWaiting), [ordersWaiting]);
  const [openKeys, setOpenKeys] = useState(open);
  const [favourites, setFavourites] = useState<string[]>(storedFavourites);
  const [favouriteOpen, setFavouriteOpen] = useState(false);

  useEffect(() => setOpenKeys(open), [open]);

  function saveFavourites(next: string[]) {
    setFavourites(next);
    try {
      window.localStorage.setItem(FAVOURITES_KEY, JSON.stringify(next));
    } catch (error) {
      message.error(error instanceof Error ? `Could not save favourites: ${error.message}` : 'Could not save favourites.');
    }
  }

  function toggleCurrentFavourite() {
    const path = location.pathname;
    if (!(path in FAVOURITE_ROUTES)) return;
    if (favourites.includes(path)) {
      saveFavourites(favourites.filter((item) => item !== path));
      return;
    }
    if (favourites.length === 5) {
      message.info('You can save up to five favourite pages. Remove one before adding another.');
      return;
    }
    saveFavourites([...favourites, path]);
  }

  const favouriteContent = (
    <div className="sv-favourites-popover">
      <Button type="text" block onClick={toggleCurrentFavourite}>
        <StarOutlined aria-hidden /> {favourites.includes(location.pathname) ? 'Remove this page' : 'Save this page'}
      </Button>
      {favourites.length ? (
        <div className="sv-favourite-links">
          {favourites.map((path) => (
            <div className="sv-favourite-row" key={path}>
              <Link to={path} onClick={() => setFavouriteOpen(false)}>{FAVOURITE_ROUTES[path]}</Link>
              <Button type="text" size="small" aria-label={`Remove ${FAVOURITE_ROUTES[path]} from favourites`} onClick={() => saveFavourites(favourites.filter((item) => item !== path))}>×</Button>
            </div>
          ))}
        </div>
      ) : <p className="sv-favourites-empty">Save pages you use often. Up to five.</p>}
    </div>
  );

  return (
    <nav className={`sv-sidebar-content${collapsed ? ' is-collapsed' : ''}`} aria-label="Main navigation">
      <div className="sv-sidebar-tools">
        <Popover open={favouriteOpen} onOpenChange={setFavouriteOpen} trigger="click" placement="rightTop" content={favouriteContent} title="Favourite pages">
          <Tooltip title={collapsed ? 'Favourite pages' : undefined} placement="right">
            <Button className="sv-favourite-button" aria-label="Favourite pages" aria-expanded={favouriteOpen} icon={<StarOutlined />} />
          </Tooltip>
        </Popover>
        <QuickAdd collapsed={collapsed} />
        <Tooltip title={collapsed ? 'Expand navigation' : 'Collapse navigation'} placement="right">
          <Button className="sv-collapse-button" icon={<DownOutlined />} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} aria-expanded={!collapsed} onClick={onCollapse} />
        </Tooltip>
      </div>
      {!collapsed ? <SetupProgress status={status} /> : null}
      <Menu
        className="sv-navigation-menu"
        theme="dark"
        mode="inline"
        inlineCollapsed={collapsed}
        items={items}
        selectedKeys={[selected]}
        openKeys={openKeys}
        onOpenChange={(keys) => setOpenKeys(keys.slice(-1))}
        onClick={() => onNavigate?.()}
      />
      <a className="sv-live-store" href="https://silveram.in/" target="_blank" rel="noreferrer" aria-label="View the live Silveram store">
        <ExportOutlined aria-hidden />
        {!collapsed ? <span>View live store</span> : null}
      </a>
    </nav>
  );
}
