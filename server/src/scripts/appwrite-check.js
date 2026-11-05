import { loadConfig } from '../config.js';
import { connectDatabase, getAppwrite } from '../platform/appwrite.js';
import { APPWRITE_SCHEMA } from '../platform/appwrite-schema.js';

const config = loadConfig();
const failures = [];
const warnings = [];
const ok = (message) => console.log(`  ok   ${message}`);
const fail = (message) => { failures.push(message); console.log(`  FAIL ${message}`); };
const warn = (message) => { warnings.push(message); console.log(`  warn ${message}`); };

if (config.isProduction && new URL(config.appwriteEndpoint).protocol !== 'https:') {
  fail('APPWRITE_ENDPOINT must use HTTPS in production');
} else {
  ok('Appwrite endpoint uses a secure scheme');
}
if (config.isProduction && config.adminEmails.size === 0) fail('ADMIN_EMAILS is empty in production');
if (!config.cloudinaryCloudName) warn('Cloudinary public image delivery is not configured');

await connectDatabase(config);
const { databases, databaseId, collections } = getAppwrite();
console.log(`Appwrite project: ${config.appwriteProjectId}`);
for (const [key, definition] of Object.entries(APPWRITE_SCHEMA)) {
  const collectionId = collections[key];
  try {
    const collection = await databases.getCollection({ databaseId, collectionId });
    const attributes = new Set(collection.attributes.filter((attribute) => attribute.status === 'available').map((attribute) => attribute.key));
    const missing = definition.attributes.map(([name]) => name).filter((name) => !attributes.has(name));
    if (missing.length) fail(`${collectionId}: missing attributes ${missing.join(', ')}`);
    else ok(`${collectionId}: collection and ${attributes.size} attributes available`);
    const indexes = new Set(collection.indexes.filter((index) => index.status === 'available').map((index) => index.key));
    const missingIndexes = definition.indexes.map(([name]) => name).filter((name) => !indexes.has(name));
    if (missingIndexes.length) fail(`${collectionId}: missing indexes ${missingIndexes.join(', ')}`);
  } catch (error) {
    if (error?.code === 404) fail(`${collectionId}: collection not found (run npm run appwrite:setup)`);
    else throw error;
  }
}

console.log(`\n${failures.length} failure(s), ${warnings.length} warning(s).`);
process.exitCode = failures.length ? 1 : 0;
