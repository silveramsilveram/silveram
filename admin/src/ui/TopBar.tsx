import {
  BellOutlined, DownOutlined, LogoutOutlined, MenuOutlined, QuestionCircleOutlined, SearchOutlined, SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useLogout } from '@refinedev/core';
import { Avatar, Button, Dropdown, Popover } from 'antd';
import type { MenuProps } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import type { AdminMe, AdminStatus } from '@/types/api';
import { CommandPalette } from './CommandPalette';
import { StoreSwitcher } from './StoreSwitcher';

export function TopBar({ me, status, onMenuOpen }: {
  me?: AdminMe;
  status?: AdminStatus;
  onMenuOpen: () => void;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { mutate: logout, isPending } = useLogout();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === 'Escape') setPaletteOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const accountItems: MenuProps['items'] = [
    { key: 'email', label: <span className="sv-account-email">{me?.user.email ?? 'Administrator'}</span>, disabled: true },
    { type: 'divider' },
    { key: 'settings', icon: <SettingOutlined />, label: <Link to="/settings">Your settings</Link> },
    { key: 'signout', icon: <LogoutOutlined />, label: 'Sign out', disabled: isPending },
  ];

  return (
    <>
      <header className="sv-topbar">
        <div className="sv-topbar-brand">
          <Button className="sv-mobile-menu-button" type="text" icon={<MenuOutlined />} aria-label="Open navigation" onClick={onMenuOpen} />
          <Link className="sv-wordmark" to="/" aria-label="Silveram home">Silveram</Link>
          <div className="sv-topbar-store-switcher"><StoreSwitcher /></div>
        </div>
        <div className="sv-topbar-main">
          <Popover
            trigger="click"
            placement="bottom"
            content={(
              <div className="sv-help-popover">
                <strong>Using the admin</strong>
                <p>Search pages and store records with <kbd>Ctrl</kbd> or <kbd>⌘</kbd> + <kbd>K</kbd>.</p>
                <Link to="/settings">Review store settings</Link>
              </div>
            )}
          >
            <Button className="sv-topbar-text-button sv-help-button" type="text" icon={<QuestionCircleOutlined />}>Help</Button>
          </Popover>
          <Link
            className={`sv-checkout-status${status ? (status.checkout.live ? ' is-open' : ' is-paused') : ' is-unknown'}`}
            to="/settings"
            aria-label={status ? `Orders ${status.checkout.live ? 'open' : 'paused'}, view checkout settings` : 'Store status unavailable'}
          >
            <span className="sv-status-dot" aria-hidden />
            {status ? (status.checkout.live ? 'Orders open' : 'Orders paused') : 'Status unavailable'}
          </Link>
          <Button className="sv-search-trigger" icon={<SearchOutlined />} onClick={() => setPaletteOpen(true)} aria-label="Search">
            <span className="sv-search-prompt">Search orders, products, customers…</span>
            <kbd>⌘K / Ctrl K</kbd>
          </Button>
          <Popover
            trigger="click"
            placement="bottomRight"
            content={<div className="sv-notifications-popover"><strong>Store attention</strong><p>Current order and stock priorities are on Home.</p><Link to="/">Go to Home</Link></div>}
          >
            <Button className="sv-header-icon-button" type="text" icon={<BellOutlined />} aria-label="Store attention" />
          </Popover>
          <Dropdown
            trigger={['click']}
            menu={{
              items: accountItems,
              onClick: ({ key }) => { if (key === 'signout') logout(); },
            }}
          >
            <Button className="sv-account-button" type="text" aria-label="Account menu">
              <Avatar size={28} icon={<UserOutlined />} />
              <DownOutlined aria-hidden />
            </Button>
          </Dropdown>
        </div>
      </header>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
