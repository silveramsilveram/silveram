import { Query } from 'node-appwrite';

/**
 * In-memory stand-in for src/platform/appwrite.js, used with mock.module in tests.
 *  - A real query engine for the Query methods the API uses (filters, search, order, paging, or).
 *  - Transactions behave like Appwrite's: writes are staged, validated together at commit
 *    (duplicate ids -> 409) and applied atomically, or discarded when the work throws.
 */
export function createMemoryAppwrite() {
  const store = new Map();
  let counter = 0;
  const key = (collection, id) => `${collection}/${id}`;
  const rows = (collection) => [...store.entries()].filter(([k]) => k.startsWith(`${collection}/`)).map(([, v]) => v);
  const conflict = () => Object.assign(new Error('Document already exists'), { code: 409 });
  const notFound = () => Object.assign(new Error('Document not found'), { code: 404 });

  const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  function matches(doc, q) {
    const values = q.values ?? [];
    const [value] = values;
    const field = doc[q.attribute];
    switch (q.method) {
      case 'equal': return values.some((v) => field === v);
      case 'notEqual': return !values.some((v) => field === v);
      case 'lessThan': return field != null && field < value;
      case 'lessThanEqual': return field != null && field <= value;
      case 'greaterThan': return field != null && field > value;
      case 'greaterThanEqual': return field != null && field >= value;
      case 'between': return field != null && field >= values[0] && field <= values[1];
      case 'isNull': return field == null;
      case 'isNotNull': return field != null;
      case 'startsWith': return typeof field === 'string' && field.startsWith(value);
      case 'search': return typeof field === 'string' && field.toLowerCase().includes(String(value).toLowerCase());
      case 'or': return values.some((sub) => matches(doc, sub));
      case 'and': return values.every((sub) => matches(doc, sub));
      default: return true;
    }
  }

  function run(collection, queries) {
    const parsed = queries.map((raw) => (typeof raw === 'string' ? JSON.parse(raw) : raw));
    let result = rows(collection);
    for (const q of parsed.filter((item) => !['orderAsc', 'orderDesc', 'limit', 'offset', 'cursorAfter', 'select'].includes(item.method))) {
      result = result.filter((doc) => matches(doc, q));
    }
    for (const q of parsed.filter((item) => item.method === 'orderAsc' || item.method === 'orderDesc').reverse()) {
      result = [...result].sort((a, b) => (q.method === 'orderAsc' ? 1 : -1) * compare(a[q.attribute], b[q.attribute]));
    }
    const total = result.length;
    const cursor = parsed.find((q) => q.method === 'cursorAfter');
    if (cursor) result = result.slice(result.findIndex((doc) => doc.$id === cursor.values[0]) + 1);
    const offset = parsed.find((q) => q.method === 'offset')?.values[0] ?? 0;
    const limit = parsed.find((q) => q.method === 'limit')?.values[0] ?? 25;
    return { documents: result.slice(offset, offset + limit), total };
  }

  const ops = new Map(); // transactionId -> staged operations
  const stage = (transactionId, op) => ops.get(transactionId).push(op);

  function apply(op) {
    const k = key(op.collection, op.id);
    if (op.kind === 'create') store.set(k, { $id: op.id, ...op.data });
    else if (op.kind === 'update') store.set(k, { ...store.get(k), ...op.data });
    else if (op.kind === 'increment') {
      const doc = store.get(k);
      store.set(k, { ...doc, [op.attribute]: doc[op.attribute] + op.value });
    }
  }

  function validate(staged) {
    const created = new Set();
    const simulated = new Map();
    for (const op of staged) {
      const k = key(op.collection, op.id);
      if (op.kind === 'create') {
        if (store.has(k) || created.has(k)) throw conflict();
        created.add(k);
        simulated.set(k, { ...op.data });
      } else {
        const current = simulated.get(k) ?? store.get(k);
        if (!current) throw notFound();
        if (op.kind === 'increment') {
          const next = current[op.attribute] + op.value;
          if (op.min !== undefined && op.min !== null && next < op.min) throw Object.assign(new Error('min'), { code: 400 });
          simulated.set(k, { ...current, [op.attribute]: next });
        } else {
          simulated.set(k, { ...current, ...op.data });
        }
      }
    }
  }

  const direct = {
    createDocument: async (collection, id, data, transactionId) => {
      if (transactionId) {
        stage(transactionId, { kind: 'create', collection, id, data });
        return { $id: id, ...data };
      }
      if (store.has(key(collection, id))) throw conflict();
      const doc = { $id: id, ...data };
      store.set(key(collection, id), doc);
      return doc;
    },
    updateDocument: async (collection, id, data, transactionId) => {
      if (transactionId) {
        stage(transactionId, { kind: 'update', collection, id, data });
        return { ...store.get(key(collection, id)), ...data };
      }
      if (!store.has(key(collection, id))) throw notFound();
      const doc = { ...store.get(key(collection, id)), ...data };
      store.set(key(collection, id), doc);
      return doc;
    },
    incrementAttribute: async (collection, id, attribute, delta, transactionId, { min } = {}) => {
      if (transactionId) {
        stage(transactionId, { kind: 'increment', collection, id, attribute, value: delta, min });
        return store.get(key(collection, id));
      }
      const doc = store.get(key(collection, id));
      if (!doc) throw notFound();
      if (min !== undefined && doc[attribute] + delta < min) throw Object.assign(new Error('min'), { code: 400 });
      doc[attribute] += delta;
      return doc;
    },
  };

  const named = {
    Query,
    ID: { unique: () => `id${(counter += 1).toString().padStart(8, '0')}` },
    isNotFound: (error) => error?.code === 404,
    getAppwrite: () => ({
      databaseId: 'db',
      collections: new Proxy({}, { get: (_t, name) => String(name) }),
      databases: {
        updateDocument: async ({ collectionId, documentId, data, transactionId }) => direct.updateDocument(collectionId, documentId, data, transactionId),
        incrementDocumentAttribute: async ({ collectionId, documentId, attribute, value, max }) => {
          const doc = store.get(key(collectionId, documentId));
          if (max !== undefined && max !== null && doc[attribute] + value > max) throw Object.assign(new Error('max'), { code: 400 });
          doc[attribute] += value;
          return doc;
        },
      },
    }),
    getDocument: async (collection, id) => store.get(key(collection, id)) ?? null,
    createDocument: direct.createDocument,
    updateDocument: direct.updateDocument,
    incrementAttribute: direct.incrementAttribute,
    deleteDocument: async (collection, id) => store.delete(key(collection, id)),
    listDocuments: async (collection, queries = []) => run(collection, queries).documents,
    listDocumentsPage: async (collection, queries = []) => run(collection, queries),
    findDocument: async (collection, field, value) => rows(collection).find((doc) => doc[field] === value) ?? null,
    runTransaction: async (work) => {
      const transactionId = `txn${(counter += 1)}`;
      ops.set(transactionId, []);
      try {
        const result = await work(transactionId);
        const staged = ops.get(transactionId);
        validate(staged);
        staged.forEach(apply);
        return result;
      } finally {
        ops.delete(transactionId);
      }
    },
  };

  return {
    named,
    store,
    seed: (collection, id, data) => store.set(key(collection, id), { $id: id, ...data }),
    get: (collection, id) => store.get(key(collection, id)),
    all: rows,
    clear: () => store.clear(),
  };
}
