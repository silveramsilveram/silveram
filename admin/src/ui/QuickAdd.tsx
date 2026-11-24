import { PlusOutlined } from '@ant-design/icons';
import { Button, Popover } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router';

const ACTIONS = [
  { label: 'Add product', to: '/products/create' },
  { label: 'Record COD cash', to: '/money/cod' },
  { label: 'Adjust stock', to: '/inventory' },
];

export function QuickAdd({ collapsed = false }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="rightTop"
      title="Quick add"
      content={(
        <div className="sv-quick-add-list">
          {ACTIONS.map((action) => (
            <Link key={action.to} to={action.to} className="sv-quick-add-item" onClick={() => setOpen(false)}>
              {action.label}
            </Link>
          ))}
        </div>
      )}
    >
      <Button className="sv-quick-add-button" icon={<PlusOutlined />} aria-label="Quick add">
        {collapsed ? null : 'Quick add'}
      </Button>
    </Popover>
  );
}
