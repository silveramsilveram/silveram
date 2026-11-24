import { z } from 'zod';
import { getDocument, listDocuments, listDocumentsPage, Query } from '../platform/appwrite.js';
import { listAllDocuments } from '../platform/paging.js';
import { consumeRateLimit } from '../security.js';
import { createMarketingUnsubscribeToken } from '../marketing.js';
import { isoOrBlank, toCsv } from './csv.js';
import { actorOf, cleanSearch, httpError, idSchema, pageQuerySchema, parse, route, ymdIst } from './common.js';
import { isConfirmed } from './metrics.js';
import { serializeOrder } from './orders.js';

const listSchema = pageQuerySchema.extend({
  search: z.string().optional(),
  source: z.enum(['guest', 'account']).optional(),
  sort: z.enum(['createdAt', 'lastOrderAt']).default('createdAt'),
  dir: z.enum(['asc', 'desc']).default('desc'),
});

const maskPhone = (phone) => (phone ? `${'•'.repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}` : null);
const MAX_MARKETING_EXPORT = 5000;
const HOUR = 60 * 60 * 1000;

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

export function registerCustomerRoutes(router, config) {
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

  router.get('/customers/marketing.csv', route(async (req, res) => {
    if (!(await consumeRateLimit(actorOf(req), 'admin-export', 30, HOUR))) {
      throw httpError(429, 'Too many exports. Please try again later.');
    }
    const result = await listAllDocuments('marketingContacts', [
      Query.equal('status', 'subscribed'),
      Query.orderDesc('consentedAt'),
    ], { maxDocuments: MAX_MARKETING_EXPORT });
    const contacts = result.documents.filter((contact) =>
      contact.status === 'subscribed' && Number.isInteger(contact.consentedAt));
    const baseUrl = config.storeUrl ? new URL(config.storeUrl) : null;
    const columns = [
      { header: 'E-mail', value: (contact) => contact.email },
      { header: 'Name', value: (contact) => contact.name || '' },
      { header: 'Consent recorded at (UTC ISO)', value: (contact) => isoOrBlank(contact.consentedAt) },
      {
        header: 'Unsubscribe URL',
        value: (contact) => {
          const token = createMarketingUnsubscribeToken(contact.$id, config.otpPepper);
          const path = `/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
          return baseUrl ? new URL(path, baseUrl).toString() : path;
        },
      },
    ];
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="silveram-marketing-opt-ins-${ymdIst(Date.now())}.csv"`,
      'Cache-Control': 'no-store',
      'X-Export-Rows': String(contacts.length),
      'X-Export-Truncated': String(result.truncated),
    });
    return res.send(toCsv(columns, contacts));
  }));

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

