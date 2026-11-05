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

export async function createDocument(collectionId, documentId, data) {
  assertConfigured();
  return databases.createDocument({
    databaseId: config.appwriteDatabaseId,
    collectionId: config.appwriteCollections[collectionId],
    documentId,
    data,
  });
}

export async function updateDocument(collectionId, documentId, data) {
  assertConfigured();
  return databases.updateDocument({
    databaseId: config.appwriteDatabaseId,
    collectionId: config.appwriteCollections[collectionId],
    documentId,
    data,
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

export async function findDocument(collectionId, field, value) {
  const [document] = await listDocuments(collectionId, [Query.equal(field, value), Query.limit(1)]);
  return document || null;
}

export async function connectDatabase(nextConfig) {
  configureAppwrite(nextConfig);
  await databases.get({ databaseId: config.appwriteDatabaseId });
}

export async function checkDatabase() {
  assertConfigured();
  await databases.get({ databaseId: config.appwriteDatabaseId });
}

export async function closeDatabase() {}

export { ID, Query };
