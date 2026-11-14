import { useList, type BaseRecord, type CrudFilters, type HttpError } from '@refinedev/core';
import { keepPreviousData } from '@tanstack/react-query';
import type { TableProps } from 'antd';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

interface Options {
  /** URL/query parameter names that act as filters (they are sent to the API under the same name). */
  filterKeys: string[];
  defaultSort?: { field: string; order: 'asc' | 'desc' };
  pageSize?: number;
  meta?: { path?: string; query?: Record<string, string> };
  enabled?: boolean;
}

/**
 * Server-paginated, server-filtered table state that lives in the address bar
 * (?page=2&status=paid&search=asha&sort=amountInPaise&dir=asc), so every filtered view can be
 * bookmarked or shared. Data comes through Refine's `useList` (data provider + TanStack cache);
 * changing any filter resets to page 1 and the previous page stays on screen while the next loads.
 */
export function useUrlTable<T extends BaseRecord>(resource: string, { filterKeys, defaultSort, pageSize = 25, meta, enabled = true }: Options) {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const sortField = params.get('sort') ?? defaultSort?.field;
  const sortOrder = (params.get('dir') as 'asc' | 'desc' | null) ?? defaultSort?.order ?? 'desc';

  const values = useMemo(() => Object.fromEntries(filterKeys.map((key) => [key, params.get(key) ?? ''])), [filterKeys, params]);
  const filters: CrudFilters = useMemo(
    () => filterKeys.filter((key) => values[key]).map((key) => ({ field: key, operator: 'eq' as const, value: values[key] })),
    [filterKeys, values],
  );

  const { query, result } = useList<T, HttpError>({
    resource,
    pagination: { currentPage: page, pageSize },
    filters,
    sorters: sortField ? [{ field: sortField, order: sortOrder }] : [],
    meta,
    queryOptions: { placeholderData: keepPreviousData, enabled },
  });

  const setFilter = useCallback((key: string, value: string | undefined) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value); else next.delete(key);
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setParams]);

  const setFilters = useCallback((patch: Record<string, string | undefined>) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(patch)) { if (value) next.set(key, value); else next.delete(key); }
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setParams]);

  const clearFilters = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);

  const tableProps: TableProps<T> = {
    rowKey: 'id',
    dataSource: result.data,
    loading: query.isFetching,
    scroll: { x: 'max-content' },
    pagination: {
      current: page,
      pageSize,
      total: result.total ?? 0,
      showSizeChanger: false,
      showTotal: (total, [from, to]) => `${from}–${to} of ${total.toLocaleString('en-IN')}`,
    },
    onChange: (pagination, _filters, sorter) => {
      const one = Array.isArray(sorter) ? sorter[0] : sorter;
      setParams((current) => {
        const next = new URLSearchParams(current);
        if (one?.order && typeof one.field === 'string') { next.set('sort', one.field); next.set('dir', one.order === 'ascend' ? 'asc' : 'desc'); }
        else { next.delete('sort'); next.delete('dir'); }
        if (pagination.current && pagination.current > 1) next.set('page', String(pagination.current)); else next.delete('page');
        return next;
      }, { replace: false });
    },
  };

  return {
    tableProps, values, setFilter, setFilters, clearFilters, query, total: result.total ?? 0,
    sort: sortField ? { field: sortField, order: sortOrder } : undefined,
    hasFilters: filters.length > 0,
  };
}
