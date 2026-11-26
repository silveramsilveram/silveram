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
    priceInPaise: 100,
  },
  {
    id: 'product-3',
    sku: 'SV-003',
    name: 'Peacock Ring',
    description: 'A peacock-inspired statement ring featuring colourful decorative detailing.',
    category: 'ring',
    priceInPaise: 1299900,
  },
  {
    id: 'product-4',
    sku: 'SV-004',
    name: 'Chapka',
    description: 'A traditional chapka with pearl strands, colourful beads and ornate gold tone detailing.',
    category: 'uncategorised',
    priceInPaise: 1199900,
  },
  {
    id: 'product-5',
    sku: 'SV-005',
    name: 'Shiv Locket',
    description: 'A round Shiv locket featuring a detailed portrait, trishul and decorative relief.',
    category: 'necklace',
    priceInPaise: 499900,
  },
  {
    id: 'product-6',
    sku: 'SV-006',
    name: 'Adipurush Locket',
    description: 'An Adipurush locket with a sculpted face, flowing hair and intricate devotional detailing.',
    category: 'necklace',
    priceInPaise: 499900,
  },
  {
    id: 'product-7',
    sku: 'SV-007',
    name: 'Kurta Pin',
    description: 'Decorative kurta pins joined by delicate chains, with sparkling circular motifs for festive styling.',
    category: 'uncategorised',
    priceInPaise: 99900,
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
