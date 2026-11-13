import { z } from 'zod';
import { getDocument, listDocuments, listDocumentsPage, Query } from '../platform/appwrite.js';
import { listAllDocuments } from '../platform/paging.js';
import { cleanSearch, httpError, idSchema, pageQuerySchema, parse, route } from './common.js';
import { isConfirmed } from './metrics.js';
import { serializeOrder } from './orders.js';

const listSchema = pageQuerySchema.extend({
  search: z.string().optional(),
  source: z.enum(['guest', 'account']).optional(),
  sort: z.enum(['createdAt', 'lastOrderAt']).default('createdAt'),
  dir: z.enum(['asc', 'desc']).default('desc'),
});

const maskPhone = (phone) => (phone ? `${'•'.repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}` : null);

function aggregate(orders) {
  const confirmed = orders.filter(isConfirmed);
  return {
    orderCount: orders.filter((order) => order.paymentMethod !== 'test').length,
    confirmedOrderCount: confirmed.length,
    lifetimeOrderValueInPaise: confirmed.reduce((sum, order) => sum + order.amountInPaise, 0),
    lastOrderAt: orders.length ? Math.max(...orders.map((order) => order.createdAt)) : null,
  };
}

/** List rows: masked phone, no address, no saved bag. */
function serializeListRow(customer, orders) {
  return {
    id: customer.$id,
    email: customer.email,
    name: customer.name || '',
    phoneMasked: maskPhone(customer.phone),
    source: customer.source,
    createdAt: customer.createdAt,
    lastOrderAt: customer.lastOrderAt ?? null,
    ...aggregate(orders),
  };
}

export function registerCustomerRoutes(router) {
  router.get('/customers', route(async (req, res) => {
    const input = parse(listSchema, req.query, 'Check the customer filters.');
    const queries = [];
    if (input.source) queries.push(Query.equal('source', input.source));
    const search = cleanSearch(input.search);
    if (search) {
      if (search.includes('@')) queries.push(Query.startsWith('email', search.toLowerCase()));
      else if (/^\d{10}$/.test(search)) queries.push(Query.equal('phone', search));
      else queries.push(Query.search('name', search));
    }
    const page = await listDocumentsPage('customers', [
      ...queries,
      input.dir === 'asc' ? Query.orderAsc(input.sort) : Query.orderDesc(input.sort),
      Query.limit(input.limit),
      Query.offset((input.page - 1) * input.limit),
    ]);
    // One batched read for the whole page (not one per customer).
    const emails = page.documents.map((customer) => customer.email);
    const orders = emails.length
      ? await listDocuments('orders', [
        Query.equal('email', emails),
        Query.select(['email', 'status', 'paymentMethod', 'amountInPaise', 'createdAt']),
        Query.limit(500),
      ])
      : [];
    const byEmail = new Map();
    for (const order of orders) byEmail.set(order.email, [...(byEmail.get(order.email) || []), order]);
    return res.json({
      data: page.documents.map((customer) => serializeListRow(customer, byEmail.get(customer.email) || [])),
      total: page.total,
      page: input.page,
      limit: input.limit,
      aggregateNote: orders.length >= 500 ? 'Order totals for this page are capped at the 500 most recent matching orders.' : null,
    });
  }));

  async function loadCustomer(id) {
    parse(idSchema, id, 'Customer not found.');
    const customer = await getDocument('customers', id);
    if (!customer) throw httpError(404, 'Customer not found.');
    return customer;
  }

  router.get('/customers/:id', route(async (req, res) => {
    const customer = await loadCustomer(req.params.id);
    const { documents, truncated } = await listAllDocuments('orders', [
      Query.equal('email', customer.email),
      Query.select(['email', 'status', 'paymentMethod', 'amountInPaise', 'createdAt']),
    ], { maxDocuments: 1000 });
    let address = null;
    try {
      address = customer.addressJson ? JSON.parse(customer.addressJson) : null;
    } catch {
      address = null;
    }
    return res.json({
      customer: {
        id: customer.$id,
        email: customer.email,
        name: customer.name || '',
        phone: customer.phone || null,
        altPhone: customer.altPhone || null,
        lastAddress: address,
        source: customer.source,
        createdAt: customer.createdAt,
        lastOrderAt: customer.lastOrderAt ?? null,
        ...aggregate(documents),
        aggregateTruncated: truncated,
      },
    });
  }));

  router.get('/customers/:id/orders', route(async (req, res) => {
    const customer = await loadCustomer(req.params.id);
    const input = parse(pageQuerySchema, req.query);
    const page = await listDocumentsPage('orders', [
      Query.equal('email', customer.email),
      Query.orderDesc('createdAt'),
      Query.limit(input.limit),
      Query.offset((input.page - 1) * input.limit),
    ]);
    return res.json({ data: page.documents.map((order) => serializeOrder(order)), total: page.total, page: input.page, limit: input.limit });
  }));
}

