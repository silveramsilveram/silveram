import { loadConfig } from '../config.js';
import { configureAppwrite } from '../platform/appwrite.js';
import { createDocument, findDocument, updateDocument } from '../platform/appwrite.js';

const products = [
  {
    id: 'product-1',
    sku: 'SV-001',
    name: 'Silver Frame',
    description: 'A devotional frame featuring Goddess Lakshmi and Lord Ganesha, designed for meaningful gifting and home décor.',
    category: 'frame',
    priceInPaise: 99900,
  },
  {
    id: 'product-2',
    sku: 'SV-002',
    name: 'Silver Kada',
    description: 'Intricately patterned traditional bangles for festive and everyday styling.',
    category: 'bangle',
    priceInPaise: 99900,
  },
  {
    id: 'product-3',
    sku: 'SV-003',
    name: 'Peacock Ring',
    description: 'A peacock-inspired statement ring featuring colourful decorative detailing.',
    category: 'ring',
    priceInPaise: 1299900,
  },
];

const config = loadConfig();
configureAppwrite(config);

for (const { id, ...copy } of products) {
  const existing = await findDocument('products', 'sku', copy.sku);
  const now = Date.now();
  if (!existing) {
    await createDocument('products', id, {
      ...copy,
      currency: 'INR',
      stockQuantity: 0,
      active: false,
      imageUrl: '',
      imagesJson: '[]',
      createdAt: now,
      updatedAt: now,
    });
    console.log(`${copy.sku}: created (inactive, stock 0).`);
  } else if (existing.active !== true) {
    await updateDocument('products', existing.$id, {
      ...copy,
      updatedAt: now,
    });
    console.log(`${copy.sku}: catalogue copy refreshed (still inactive).`);
  } else {
    console.log(`${copy.sku}: already active, left unchanged.`);
  }
}
