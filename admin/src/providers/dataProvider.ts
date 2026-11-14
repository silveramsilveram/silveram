import type { BaseRecord, CrudFilters, CrudSorting, DataProvider, HttpError } from '@refinedev/core';
import { ApiError, request } from '@/services/apiClient';

/**
 * Maps Refine's generic CRUD calls onto the Silveram admin API. The API's wrappers do not follow a
 * generic REST shape (lists are `{data,total}`, single records are `{order}`, `{product}`...), so each
 * resource declares its paths and how to unwrap them. Only operations the API really supports exist:
 * `deleteOne` on products is a soft deactivation, and orders/transactions are not generically editable.
 */
interface ResourceMap {
  list: string;
  one?: (id: string) => string;
  unwrapOne?: (json: Record<string, unknown>) => BaseRecord;
  create?: { path: string; unwrap: string };
  update?: { path: (id: string) => string; unwrap: string };
  remove?: (id: string) => string;
}

export const resourceMap: Record<string, ResourceMap> = {
  products: {
    list: '/admin/products',
    one: (id) => `/admin/products/${id}`,
    unwrapOne: (json) => json.product as BaseRecord,
    create: { path: '/products/admin', unwrap: 'product' },
    update: { path: (id) => `/products/admin/${id}`, unwrap: 'product' },
    remove: (id) => `/products/admin/${id}`,
  },
  orders: {
    list: '/admin/orders',
    one: (id) => `/admin/orders/${id}`,
    unwrapOne: (json) => ({ ...(json.order as BaseRecord), timeline: json.timeline, transactions: json.transactions }),
  },
  transactions: {
    list: '/admin/transactions',
    one: (id) => `/admin/transactions/${id}`,
    unwrapOne: (json) => ({ ...(json.transaction as BaseRecord), order: json.order }),
  },
  customers: {
    list: '/admin/customers',
    one: (id) => `/admin/customers/${id}`,
    unwrapOne: (json) => json.customer as BaseRecord,
  },
  inventory: { list: '/admin/inventory' },
  'inventory-movements': { list: '/admin/inventory/movements' },
  'price-history': { list: '/admin/price-history' },
};

function configFor(resource: string): ResourceMap {
  const config = resourceMap[resource];
  if (!config) throw toHttpError(new ApiError(`Unknown resource "${resource}".`, 404));
  return config;
}

export function toHttpError(error: unknown): HttpError {
  if (error instanceof ApiError) return { message: error.message, statusCode: error.status };
  if (error instanceof Error) return { message: error.message, statusCode: 500 };
  return { message: 'Something went wrong.', statusCode: 500 };
}

/** Refine filters -> query string. A filter's `field` is the API parameter name; arrays join with commas. */
export function filtersToQuery(filters: CrudFilters | undefined): Record<string, string> {
  const query: Record<string, string> = {};
  for (const filter of filters ?? []) {
    if (!('field' in filter)) continue; // conditional (or/and) filters are not used by this API
    const { field, value } = filter;
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) continue;
    query[field] = Array.isArray(value) ? value.join(',') : String(value);
  }
  return query;
}

/** First sorter only: the API sorts by one column. `sort` + `dir` match the server's query schema. */
export function sortersToQuery(sorters: CrudSorting | undefined): Record<string, string> {
  const [first] = sorters ?? [];
  return first ? { sort: first.field, dir: first.order } : {};
}

export const dataProvider: DataProvider = {
  getApiUrl: () => '/api',

  getList: async ({ resource, pagination, filters, sorters, meta }) => {
    const config = configFor(resource);
    const page = pagination?.currentPage ?? 1;
    const limit = pagination?.pageSize ?? 25;
    try {
      const { data, total, ...extra } = await request<{ data: BaseRecord[]; total: number } & Record<string, unknown>>((meta?.path as string | undefined) ?? config.list, {
        query: { page, limit, ...filtersToQuery(filters), ...sortersToQuery(sorters), ...(meta?.query as Record<string, string> | undefined) },
      });
      // Extra top-level fields (for example trackingStartedAt) ride along for pages that show them.
      return { data: data as never, total, ...extra };
    } catch (error) {
      throw toHttpError(error);
    }
  },

  getOne: async ({ resource, id }) => {
    const config = configFor(resource);
    if (!config.one || !config.unwrapOne) throw toHttpError(new ApiError(`"${resource}" cannot be read one at a time.`, 405));
    try {
      return { data: config.unwrapOne(await request<Record<string, unknown>>(config.one(String(id)))) as never };
    } catch (error) {
      throw toHttpError(error);
    }
  },

  create: async ({ resource, variables }) => {
    const config = configFor(resource);
    if (!config.create) throw toHttpError(new ApiError(`"${resource}" cannot be created here.`, 405));
    try {
      const json = await request<Record<string, BaseRecord>>(config.create.path, { method: 'POST', body: variables });
      return { data: json[config.create.unwrap] as never };
    } catch (error) {
      throw toHttpError(error);
    }
  },

  update: async ({ resource, id, variables }) => {
    const config = configFor(resource);
    if (!config.update) throw toHttpError(new ApiError(`"${resource}" cannot be edited generically.`, 405));
    try {
      const json = await request<Record<string, BaseRecord>>(config.update.path(String(id)), { method: 'PATCH', body: variables });
      return { data: json[config.update.unwrap] as never };
    } catch (error) {
      throw toHttpError(error);
    }
  },

  // Products only, and it is a soft deactivation on the server (the document is kept).
  deleteOne: async ({ resource, id }) => {
    const config = configFor(resource);
    if (!config.remove) throw toHttpError(new ApiError(`"${resource}" cannot be deleted.`, 405));
    try {
      await request<void>(config.remove(String(id)), { method: 'DELETE' });
      return { data: { id } as never };
    } catch (error) {
      throw toHttpError(error);
    }
  },
};
