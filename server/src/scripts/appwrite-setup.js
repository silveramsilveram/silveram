import { loadConfig } from '../config.js';
import { configureAppwrite, getAppwrite } from '../platform/appwrite.js';
import { APPWRITE_SCHEMA } from '../platform/appwrite-schema.js';

const setupKey = process.env.APPWRITE_SETUP_API_KEY?.trim();
if (!setupKey) throw new Error('Set APPWRITE_SETUP_API_KEY to a temporary setup key before provisioning Appwrite');
const config = loadConfig({ allowSetupKey: true });
configureAppwrite({ ...config, appwriteApiKey: setupKey });
const { databases, databaseId, collections } = getAppwrite();

function isConflict(error) {
  return error?.code === 409;
}

async function ensureDatabase() {
  try {
    await databases.get({ databaseId });
  } catch (error) {
    if (error?.code !== 404) throw error;
    await databases.create({ databaseId, name: 'Silveram', enabled: true });
    console.log(`Created Appwrite database "${databaseId}".`);
  }
}

async function ensureCollection(id, name) {
  try {
    await databases.getCollection({ databaseId, collectionId: id });
  } catch (error) {
    if (error?.code !== 404) throw error;
    await databases.createCollection({
      databaseId,
      collectionId: id,
      name,
      permissions: [],
      documentSecurity: false,
      enabled: true,
    });
    console.log(`Created private collection "${id}".`);
  }
}

async function ensureAttribute(collectionId, [key, type, required, size]) {
  const params = { databaseId, collectionId, key, required };
  let exists = true;
  try {
    await databases.getAttribute({ databaseId, collectionId, key });
  } catch (error) {
    if (error?.code !== 404) throw error;
    exists = false;
  }

  if (!exists) {
    try {
      if (type === 'string') {
        await databases.createStringAttribute({ ...params, size });
      } else if (type === 'integer') {
        await databases.createIntegerAttribute(params);
      } else {
        await databases.createBooleanAttribute(params);
      }
    } catch (error) {
      if (!isConflict(error)) throw error;
    }
  }

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const attribute = await databases.getAttribute({ databaseId, collectionId, key });
    if (attribute.status === 'available') return;
    if (attribute.status === 'failed') {
      throw new Error(`Appwrite attribute setup failed: ${collectionId}.${key}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for Appwrite attribute ${collectionId}.${key}`);
}

async function ensureIndex(collectionId, [key, type, attributes]) {
  try {
    await databases.createIndex({ databaseId, collectionId, key, type, attributes });
  } catch (error) {
    if (!isConflict(error)) throw error;
  }
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const collection = await databases.getCollection({ databaseId, collectionId });
    const index = collection.indexes.find((item) => item.key === key);
    if (index?.status === 'available') return;
    if (index?.status === 'failed') throw new Error(`Appwrite index setup failed: ${collectionId}.${key}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timed out waiting for Appwrite index ${collectionId}.${key}`);
}

await ensureDatabase();
for (const [key, definition] of Object.entries(APPWRITE_SCHEMA)) {
  const collectionId = collections[key];
  await ensureCollection(collectionId, definition.name);
  for (const attribute of definition.attributes) {
    await ensureAttribute(collectionId, attribute);
  }
  for (const index of definition.indexes) {
    await ensureIndex(collectionId, index);
  }
  console.log(`${collectionId}: schema and indexes are ready.`);
}
