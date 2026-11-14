import { loadConfig } from '../config.js';
import { connectDatabase, listDocumentsPage, Query, updateDocument } from '../platform/appwrite.js';

/**
 * One-off, idempotent, additive: copies each existing order's customer name and phone out of its
 * shippingJson into the new searchable `customerName` / `customerPhone` fields. It only fills
 * missing values (never overwrites), never deletes, and defaults to a dry run.
 *
 *   npm --prefix server run admin:backfill            # dry run: reports what would change
 *   npm --prefix server run admin:backfill -- --apply # writes the fields
 */
const apply = process.argv.includes('--apply');
await connectDatabase(loadConfig());

let cursor;
let scanned = 0;
let changed = 0;
let skipped = 0;
while (true) {
  const page = await listDocumentsPage('orders', [
    Query.orderAsc('createdAt'),
    Query.limit(100),
    ...(cursor ? [Query.cursorAfter(cursor)] : []),
  ]);
  for (const order of page.documents) {
    scanned += 1;
    if (order.customerPhone && order.customerName) { skipped += 1; continue; }
    let shipping;
    try {
      shipping = JSON.parse(order.shippingJson);
    } catch {
      console.warn(`  skip ${order.$id}: unreadable shippingJson`);
      skipped += 1;
      continue;
    }
    const data = {
      ...(!order.customerName && shipping.name && { customerName: String(shipping.name).slice(0, 100) }),
      ...(!order.customerPhone && shipping.phone && { customerPhone: String(shipping.phone).slice(0, 10) }),
    };
    if (Object.keys(data).length === 0) { skipped += 1; continue; }
    changed += 1;
    if (apply) await updateDocument('orders', order.$id, data);
  }
  if (page.documents.length < 100) break;
  cursor = page.documents[page.documents.length - 1].$id;
}
console.log(`${apply ? 'Updated' : 'Would update'} ${changed} of ${scanned} orders (${skipped} already complete or unreadable).`);
if (!apply && changed) console.log('Re-run with --apply to write these fields.');
