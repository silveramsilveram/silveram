import { DownOutlined, ShopOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { Link } from 'react-router';

export function StoreSwitcher() {
  const items: MenuProps['items'] = [
    { key: 'store', label: <a href="https://silveram.in/" target="_blank" rel="noreferrer">View live store</a> },
    { key: 'settings', label: <Link to="/settings">Store details</Link> },
  ];
  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <button className="sv-store-switcher" type="button" aria-label="Silveram store menu">
        <ShopOutlined aria-hidden />
        <span>Silveram</span>
        <DownOutlined aria-hidden />
      </button>
    </Dropdown>
  );
}
