import { SearchOutlined } from '@ant-design/icons';
import { Empty, Input, Modal, Skeleton } from 'antd';
import type { InputRef } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { formatPaise } from '@/lib/money';
import { request } from '@/services/apiClient';
import type { CustomerRow, OrderRow, ProductRow } from '@/types/api';

type SearchHit = { group: string; label: string; detail: string; to: string };
type SearchPage<T> = { data: T[] };

const PAGES: SearchHit[] = [
  { group: 'Pages', label: 'Home', detail: 'Store overview', to: '/' },
  { group: 'Pages', label: 'Orders', detail: 'Review and fulfil orders', to: '/orders' },
  { group: 'Pages', label: 'Products', detail: 'Manage the catalogue', to: '/products' },
  { group: 'Pages', label: 'Inventory', detail: 'Check and adjust stock', to: '/inventory' },
  { group: 'Pages', label: 'Customers', detail: 'View customer records', to: '/customers' },
  { group: 'Pages', label: 'Payments', detail: 'Review payments', to: '/money/payments' },
  { group: 'Pages', label: 'COD cash', detail: 'Record cash collected and handed over', to: '/money/cod' },
  { group: 'Pages', label: 'Analytics', detail: 'Review store performance', to: '/analytics' },
  { group: 'Pages', label: 'Reports', detail: 'Download reports', to: '/reports' },
  { group: 'Pages', label: 'Settings', detail: 'Review store configuration', to: '/settings' },
  { group: 'Quick actions', label: 'Add product', detail: 'Create a catalogue listing', to: '/products/create' },
];

function hitPage<T extends { id: string }>(rows: T[], group: string, label: (row: T) => string, detail: (row: T) => string, to: (row: T) => string): SearchHit[] {
  return rows.map((row) => ({ group, label: label(row), detail: detail(row), to: to(row) }));
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [value, setValue] = useState('');
  const [remoteHits, setRemoteHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<InputRef>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open || value.trim().length < 2) {
      setRemoteHits([]);
      setSearching(false);
      setError(null);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const query = { search: value.trim(), page: 1, limit: 5 };
        const [orders, products, customers] = await Promise.all([
          request<SearchPage<OrderRow>>('/admin/orders', { query, signal: controller.signal }),
          request<SearchPage<ProductRow>>('/admin/products', { query, signal: controller.signal }),
          request<SearchPage<CustomerRow>>('/admin/customers', { query, signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        const hits = [
          ...hitPage(orders.data, 'Orders', (row) => `Order ${row.id.slice(0, 8)}`, (row) => `${row.customerName || row.email} · ${formatPaise(row.amountInPaise)}`, (row) => `/orders/show/${row.id}`),
          ...hitPage(products.data, 'Products', (row) => row.name, (row) => row.sku, (row) => `/products/edit/${row.id}`),
          ...hitPage(customers.data, 'Customers', (row) => row.name || row.email, (row) => row.email, (row) => `/customers/show/${row.id}`),
        ];
        setRemoteHits(hits);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : 'Could not search. Try again.');
          setRemoteHits([]);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, value]);

  const hits = useMemo(() => {
    const normalized = value.trim().toLowerCase();
    const pages = PAGES.filter((hit) => `${hit.label} ${hit.detail}`.toLowerCase().includes(normalized));
    return [...remoteHits, ...pages];
  }, [remoteHits, value]);

  useEffect(() => setActive(0), [hits.length, value]);

  function choose(hit: SearchHit) {
    onClose();
    setValue('');
    navigate(hit.to);
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="Search Silveram"
      className="sv-command-modal"
      afterOpenChange={(visible) => { if (visible) inputRef.current?.focus(); }}
      destroyOnHidden
    >
      <Input
        ref={inputRef}
        autoFocus
        size="large"
        prefix={<SearchOutlined aria-hidden />}
        placeholder="Search orders, products, customers…"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => Math.min(index + 1, hits.length - 1)); }
          if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); }
          if (event.key === 'Enter' && hits[active]) { event.preventDefault(); choose(hits[active]); }
        }}
        aria-label="Search orders, products, and customers"
        aria-controls="sv-command-results"
      />
      <div id="sv-command-results" className="sv-command-results" role="listbox" aria-label="Search results" aria-busy={searching}>
        {searching ? <Skeleton active title={false} paragraph={{ rows: 4 }} /> : null}
        {error ? <p className="sv-command-error" role="alert">Could not search store records: {error}</p> : null}
        {!searching && !error && hits.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No matching pages or records." /> : null}
        {!searching ? hits.map((hit, index) => (
          <button
            type="button"
            role="option"
            aria-selected={active === index}
            className="sv-command-hit"
            key={`${hit.group}:${hit.to}`}
            onMouseEnter={() => setActive(index)}
            onClick={() => choose(hit)}
          >
            <span className="sv-command-hit-text"><strong>{hit.label}</strong><span>{hit.detail}</span></span>
            <span className="sv-command-hit-group">{hit.group}</span>
          </button>
        )) : null}
      </div>
      <p className="sv-command-hint"><kbd>↑</kbd><kbd>↓</kbd> to move <kbd>Enter</kbd> to open <kbd>Esc</kbd> to close</p>
    </Modal>
  );
}
