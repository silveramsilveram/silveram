import { listDocumentsPage, Query } from './appwrite.js';

/**
 * Reads every document matching `queries` in bounded pages using cursor pagination, instead of one
 * unbounded call. `truncated` is true when `maxDocuments` was reached, so callers can say so
 * rather than silently under-reporting.
 */
export async function listAllDocuments(collectionId, queries = [], { pageSize = 100, maxDocuments = 10_000 } = {}) {
  const documents = [];
  let cursor;
  let total = 0;
  while (documents.length < maxDocuments) {
    const page = await listDocumentsPage(collectionId, [
      ...queries,
      Query.limit(Math.min(pageSize, maxDocuments - documents.length)),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ]);
    total = page.total;
    documents.push(...page.documents);
    if (page.documents.length < pageSize) return { documents, total, truncated: false };
    cursor = page.documents[page.documents.length - 1].$id;
  }
  return { documents, total, truncated: documents.length < total };
}
