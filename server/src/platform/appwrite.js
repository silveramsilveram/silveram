import { Client, Databases, ID, Query, Users } from 'node-appwrite';

let client;
let databases;
let users;
let config;

export function configureAppwrite(nextConfig) {
  config = nextConfig;
  client = new Client()
    .setEndpoint(config.appwriteEndpoint)
    .setProject(config.appwriteProjectId)
    .setKey(config.appwriteApiKey);
  databases = new Databases(client);
  users = new Users(client);
}

function assertConfigured() {
  if (!databases || !config) throw new Error('Appwrite is not configured.');
}

export function getAppwrite() {
  assertConfigured();
  return { client, databases, users, databaseId: config.appwriteDatabaseId, collections: config.appwriteCollections };
}

export function isNotFound(error) {
  return error?.code === 404;
}

export async function getDocument(collectionId, documentId) {
  assertConfigured();
  try {
    return await databases.getDocument({
      databaseId: config.appwriteDatabaseId,
      collectionId: config.appwriteCollections[collectionId],
      documentId,
    });
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export async function createDocument(collectionId, documentId, data, transactionId) {
  assertConfigured();
  return databases.createDocument({
    databaseId: config.appwriteDatabaseId,
    collectionId: config.appwriteCollections[collectionId],
    documentId,
    data,
    ...(transactionId && { transactionId }),
  });
}

export async function updateDocument(collectionId, documentId, data, transactionId) {
  assertConfigured();
  return databases.updateDocument({
    databaseId: config.appwriteDatabaseId,
    collectionId: config.appwriteCollections[collectionId],
    documentId,
    data,
    ...(transactionId && { transactionId }),
  });
}

export async function deleteDocument(collectionId, documentId) {
  assertConfigured();
  try {
    await databases.deleteDocument({
      databaseId: config.appwriteDatabaseId,
      collectionId: config.appwriteCollections[collectionId],
      documentId,
    });
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
}

export async function listDocuments(collectionId, queries = []) {
  assertConfigured();
  const result = await databases.listDocuments({
    databaseId: config.appwriteDatabaseId,
    collectionId: config.appwriteCollections[collectionId],
    queries,
  });
  return result.documents;
}

/** Like listDocuments, but keeps Appwrite's `total` so callers can paginate. */
export async function listDocumentsPage(collectionId, queries = []) {
  assertConfigured();
  const result = await databases.listDocuments({
    databaseId: config.appwriteDatabaseId,
    collectionId: config.appwriteCollections[collectionId],
    queries,
  });
  return { documents: result.documents, total: result.total };
}

/** Atomically add `delta` to a numeric attribute (staged when a transactionId is given). */
export async function incrementAttribute(collectionId, documentId, attribute, delta, transactionId, { min } = {}) {
  assertConfigured();
  const params = {
    databaseId: config.appwriteDatabaseId,
    collectionId: config.appwriteCollections[collectionId],
    documentId,
    attribute,
    ...(transactionId && { transactionId }),
  };
  return delta >= 0
    ? databases.incrementDocumentAttribute({ ...params, value: delta })
    : databases.decrementDocumentAttribute({ ...params, value: -delta, ...(min !== undefined && { min }) });
}

export async function findDocument(collectionId, field, value) {
  const [document] = await listDocuments(collectionId, [Query.equal(field, value), Query.limit(1)]);
  return document || null;
}

export async function runTransaction(work) {
  assertConfigured();
  const transaction = await databases.createTransaction({ ttl: 60 });
  try {
    const result = await work(transaction.$id);
    await databases.updateTransaction({ transactionId: transaction.$id, commit: true });
    return result;
  } catch (error) {
    try {
      await databases.updateTransaction({ transactionId: transaction.$id, rollback: true });
    } catch (rollbackError) {
      console.error('Appwrite transaction rollback failed:', rollbackError?.message || rollbackError);
    }
    throw error;
  }
}

export async function connectDatabase(nextConfig) {
  configureAppwrite(nextConfig);
  await databases.get({ databaseId: config.appwriteDatabaseId });
}

export async function checkDatabase() {
  assertConfigured();
  await databases.get({ databaseId: config.appwriteDatabaseId });
}

export async function closeDatab