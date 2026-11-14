import { Pagination, Select, Skeleton, Table } from 'antd';
import type { TableColumnType, TableProps } from 'antd';
import { useSyncExternalStore, type ReactNode } from 'react';

const QUERY = '(max-width: 767px)';
function subscribe(callback: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
/** True on phones and small tablets in portrait. Reads the media query directly, so there is no first-paint flash. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}

type Col<T> = TableColumnType<T>;
const titleOf = <T,>(column: Col<T>) => (typeof column.title === 'string' ? column.title : '');
const fieldOf = <T,>(column: Col<T>) => (typeof column.dataIndex === 'string' ? column.dataIndex : undefined);

function cellValue<T extends object>(column: Col<T>, row: T, index: number): ReactNode {
  const field = fieldOf(column);
  const value = field ? (row as Record<string, unknown>)[field] : undefined;
  return column.render ? (column.render(value, row, index) as ReactNode) : (value as ReactNode);
}

/**
 * One data table for every list. On desktop and laptop it is the Ant Design table (sortable headings,
 * horizontal scroll with a pinned first column). On phones the same columns become readable cards:
 * the first titled column is the card heading, the rest are label/value rows, and sorting moves into
 * a select. No information is dropped and nothing scrolls sideways.
 */
export function DataTable<T extends object>(props: TableProps<T>) {
  const mobile = useIsMobile();
  if (!mobile) return <Table<T> {...props} />;

  const columns = (props.columns ?? []) as Col<T>[];
  const rows = (props.dataSource ?? []) as T[];
  const heading = columns.find((column) => titleOf(column));
  const thumb = columns.find((column) => !titleOf(column) && fieldOf(column) === 'imageUrl');
  const actions = columns.filter((column) => !titleOf(column) && column !== thumb);
  const details = columns.filter((column) => titleOf(column) && column !== heading);
  const sortable = columns.filter((column) => column.sorter && fieldOf(column));
  const sorted = sortable.find((column) => column.sortOrder);
  const pagination = props.pagination === false ? null : props.pagination;
  const loading = typeof props.loading === 'boolean' ? props.loading : Boolean(props.loading && 'spinning' in props.loading && props.loading.spinning);
  const rowKey = (row: T, index: number) => {
    const key = props.rowKey;
    return typeof key === 'function' ? String(key(row)) : String(key ? (row as Record<string, unknown>)[key as string] : index);
  };
  const emit = (action: 'paginate' | 'sort', next: { current?: number; pageSize?: number }, sorter: object = {}) =>
    (props.onChange as ((...args: unknown[]) => void) | undefined)?.({ ...pagination, ...next }, {}, sorter, { action, currentDataSource: rows });

  return (
    <div>
      {sortable.length > 0 ? (
        <div style={{ padding: '12px 12px 0', display: 'flex', gap: 8 }}>
          <Select
            aria-label="Sort by"
            style={{ flex: 1 }}
            placeholder="Sort by"
            allowClear
            value={sorted ? `${fieldOf(sorted)}:${sorted.sortOrder}` : undefined}
            options={sortable.flatMap((column) => [
              { value: `${fieldOf(column)}:ascend`, label: `${titleOf(column)}: low to high` },
              { value: `${fieldOf(column)}:descend`, label: `${titleOf(column)}: high to low` },
            ])}
            onChange={(value?: string) => {
              if (!value) return emit('sort', { current: 1 }, {});
              const [field, order] = value.split(':');
              emit('sort', { current: 1 }, { field, order });
            }}
          />
        </div>
      ) : null}
      {loading && rows.length === 0 ? <div style={{ padding: 16 }}><Skeleton active paragraph={{ rows: 4 }} /></div> : null}
      {!loading && rows.length === 0 ? <div style={{ padding: 24 }}>{typeof props.locale?.emptyText === 'function' ? props.locale.emptyText() : props.locale?.emptyText}</div> : null}
      <ul className="sv-cards" aria-busy={loading} style={{ opacity: loading && rows.length ? 0.6 : 1 }}>
        {rows.map((row, index) => (
          <li key={rowKey(row, index)} className="sv-card">
            <div className="sv-card-head">
              {thumb ? <div className="sv-card-thumb">{cellValue(thumb, row, index)}</div> : null}
              <div style={{ minWidth: 0, flex: 1 }}>{heading ? cellValue(heading, row, index) : null}</div>
            </div>
            <dl className="sv-card-body">
              {details.map((column, i) => (
                <div key={`${titleOf(column)}-${i}`} className="sv-card-row">
                  <dt>{titleOf(column)}</dt>
                  <dd>{cellValue(column, row, index)}</dd>
                </div>
              ))}
            </dl>
            {actions.length ? <div className="sv-card-actions">{actions.map((column, i) => <span key={i}>{cellValue(column, row, index)}</span>)}</div> : null}
          </li>
        ))}
      </ul>
      {pagination ? (
        <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            simple
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            showSizeChanger={false}
            hideOnSinglePage
            onChange={(current, pageSize) => emit('paginate', { current, pageSize })}
          />
        </div>
      ) : null}
    </div>
  );
}
