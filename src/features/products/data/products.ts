/**
 * THE product catalogue for the storefront — the one file to edit.
 *
 * Store catalogue includes the original collection and the latest supplied products.
 * Name, price, copy and photographs are supplied by the store. Silver purity,
 * hallmarking, weight, dimensions and stock are NOT supplied, so none are shown.
 *
 * Rules:
 *  - `price` is in rupees (whole number). `null` means "price on request" and
 *    the product cannot be added to the bag until a price is set.
 *  - Optional fields (material, purity, weight …) are only rendered when set.
 *    Never enter a value you have not verified.
 *  - `images` use Cloudinary when configured and a bundled local fallback otherwise.
 *    With no images the UI shows a neutral "photograph coming soon" panel.
 *  - Set `isPlaceholder: false` once the record holds real information.
 *  - Keep `id` identical to the Appwrite document ID of the matching server record
 *    (server/src/scripts/seed-catalog.js) so cart items match orders.
 */

import { productImageUrl } from '@/shared/lib/cloudinary';

export interface ProductImage {
  src: string;
  fallbackSrc?: string;
  width: number;
  height: number;
  alt: string;
}

/** An optional product film, uploaded to Cloudinary as a video under `<root>/<env>/products/<sku>/<name>`. */
export interface ProductFilm {
  /** File name (public ID tail) of the film. */
  name: string;
  alt: string;
  /** Native pixel size of the original film; it is never shown larger than this. */
  width: number;
  height: number;
}

export interface Product {
  id: string;
  sku: string;
  slug: string;
  name: string;
  isPlaceholder: boolean;
  /** Must match PRODUCT_CATEGORIES in server/src/database/schema.js. */
  category: 'frame' | 'bangle' | 'ring' | 'necklace' | 'uncategorised';
  /** Short label used on category tiles and breadcrumbs. */
  categoryLabel: string;
  /** Rupees, whole number. null = not yet priced. */
  price: number | null;
  shortDescription?: string;
  description?: string;
  images: ProductImage[];
  /** Optional film. When set (and Cloudinary is configured) sections that show this product can play it. */
  film?: ProductFilm;
  material?: string;
  /** e.g. the purity marking you have verified. */
  purity?: string;
  weight?: string;
  dimensions?: string;
  /** Available sizes / variants, if any. */
  sizes?: string[];
  care?: string[];
  deliveryInfo?: string;
  returnInfo?: string;
}


export const PRODUCTS: Product[] = [
  {
    id: 'product-1',
    sku: 'SV-001',
    slug: 'silver-frame',
    name: 'Silver Frame',
    isPlaceholder: false,
    category: 'frame',
    categoryLabel: 'Devotional frames',
    price: 999,
    shortDescription:
      'A devotional frame featuring Goddess Lakshmi and Lord Ganesha, designed for meaningful gifting and home décor.',
    description:
      'A timeless expression of devotion, featuring detailed representations of Goddess Lakshmi and Lord Ganesha. Its decorative artwork and transparent stand make it a thoughtful addition to your home temple. A meaningful gift for festivals, celebrations and auspicious occasions.',
    images: [
      { src: productImageUrl('SV-001', 'silver-frame-01', 1400, '/images/products/silver-frame-01.webp'), fallbackSrc: '/images/products/silver-frame-01.webp', width: 504, height: 508, alt: 'Lakshmi and Ganesha frame on ivory satin beside orange marigolds and rose petals' },
      { src: productImageUrl('SV-001', 'silver-frame-02', 1400, '/images/products/silver-frame-02.webp'), fallbackSrc: '/images/products/silver-frame-02.webp', width: 508, height: 508, alt: 'Lakshmi and Ganesha frame presented in a navy gift box with a gold ribbon' },
      { src: productImageUrl('SV-001', 'silver-frame-03', 1400, '/images/products/silver-frame-03.webp'), fallbackSrc: '/images/products/silver-frame-03.webp', width: 508, height: 508, alt: 'Lakshmi and Ganesha frame with transparent stand on a plain white background' },
      { src: productImageUrl('SV-001', 'silver-frame-04', 1400, '/images/products/silver-frame-04.webp'), fallbackSrc: '/images/products/silver-frame-04.webp', width: 504, height: 508, alt: 'Lakshmi and Ganesha frame on a wooden altar shelf with a lit diya and flowers' },
      { src: productImageUrl('SV-001', 'silver-frame-05', 1400, '/images/products/silver-frame-05.webp'), fallbackSrc: '/images/products/silver-frame-05.webp', width: 508, height: 508, alt: 'Close-up of the Lakshmi and Ganesha relief with the Shubh Labh inscription' },
      { src: productImageUrl('SV-001', 'silver-frame-06', 1400, '/images/products/silver-frame-06.webp'), fallbackSrc: '/images/products/silver-frame-06.webp', width: 508, height: 508, alt: 'Lakshmi and Ganesha frame on a stand, set against royal blue velvet' },
    ],
  },
  {
    id: 'product-2',
    sku: 'SV-002',
    slug: 'silver-kada',
    name: 'Silver Kada',
    isPlaceholder: false,
    category: 'bangle',
    categoryLabel: 'Kada & bangles',
    price: 1,
    shortDescription:
      'Intricately patterned traditional bangles that bring timeless elegance to festive and everyday styling.',
    description:
      'Celebrate traditional artistry with an elegant collection of intricately patterned bangles. Beautifully detailed surfaces create a distinctive play of light and texture, making them suitable for festive occasions and everyday ethnic styling. A graceful addition to your jewellery collection.',
    images: [
      { src: productImageUrl('SV-002', 'silver-kada-01', 1400, '/images/products/silver-kada-01.webp'), fallbackSrc: '/images/products/silver-kada-01.webp', width: 920, height: 768, alt: 'Stack of intricately patterned bangles on a cream display stand' },
    ],
  },
  {
    id: 'product-3',
    sku: 'SV-003',
    slug: 'peacock-ring',
    name: 'Peacock Ring',
    isPlaceholder: false,
    category: 'ring',
    categoryLabel: 'Statement rings',
    price: 12999,
    shortDescription:
      'An artistic peacock-inspired statement ring featuring vibrant colours and intricate decorative detailing.',
    description:
      'Inspired by the timeless beauty of the Indian peacock, this statement ring pairs vibrant colour with feather-inspired detailing. Its striking silhouette creates an elegant centrepiece for special occasions. A distinctive jewellery piece for those who appreciate artistic design.',
    images: [
      { src: productImageUrl('SV-003', 'peacock-ring-01', 1400, '/images/products/peacock-ring-01.webp'), fallbackSrc: '/images/products/peacock-ring-01.webp', width: 920, height: 768, alt: 'Peacock-inspired statement ring with blue and green feather detailing, side view' },
      { src: productImageUrl('SV-003', 'peacock-ring-02', 1400, '/images/products/peacock-ring-02.webp'), fallbackSrc: '/images/products/peacock-ring-02.webp', width: 920, height: 768, alt: 'Peacock-inspired statement ring seen from above, showing the fanned feather detail' },
    ],
  },
  {
    id: 'product-4',
    sku: 'SV-004',
    slug: 'chapka',
    name: 'Chapka',
    isPlaceholder: false,
    category: 'uncategorised',
    categoryLabel: 'Hair jewellery',
    price: 11999,
    shortDescription: 'A traditional chapka with pearl strands, colourful beads and ornate gold tone detailing.',
    description: 'A traditional chapka with pearl strands, colourful beads and ornate gold tone detailing.',
    images: [
      { src: productImageUrl('SV-004', 'chapka-01', 1400, '/images/products/chapka-01.jpeg'), fallbackSrc: '/images/products/chapka-01.jpeg', width: 1024, height: 1536, alt: 'Chapka with pearl strands and red and green bead detailing on burgundy velvet' },
    ],
  },
  {
    id: 'product-5',
    sku: 'SV-005',
    slug: 'shiv-locket',
    name: 'Shiv Locket',
    isPlaceholder: false,
    category: 'necklace',
    categoryLabel: 'Devotional lockets',
    price: 4999,
    shortDescription: 'A round Shiv locket featuring a detailed portrait, trishul and decorative relief.',
    description: 'A round Shiv locket featuring a detailed portrait, trishul and decorative relief.',
    images: [
      { src: productImageUrl('SV-005', 'shiv-locket-01', 1400, '/images/products/shiv-locket-01.jpeg'), fallbackSrc: '/images/products/shiv-locket-01.jpeg', width: 1536, height: 1024, alt: 'Round Shiv locket with a trishul and detailed relief on a stone display' },
    ],
  },
  {
    id: 'product-6',
    sku: 'SV-006',
    slug: 'adipurush-locket',
    name: 'Adipurush Locket',
    isPlaceholder: false,
    category: 'necklace',
    categoryLabel: 'Devotional lockets',
    price: 4999,
    shortDescription: 'An Adipurush locket with a sculpted face, flowing hair and intricate devotional detailing.',
    description: 'An Adipurush locket with a sculpted face, flowing hair and intricate devotional detailing.',
    images: [
      { src: productImageUrl('SV-006', 'adipurush-locket-01', 1400, '/images/products/adipurush-locket-01.jpeg'), fallbackSrc: '/images/products/adipurush-locket-01.jpeg', width: 1536, height: 1024, alt: 'Adipurush locket with a sculpted face and crescent detail on a stone display' },
    ],
  },
  {
    id: 'product-7',
    sku: 'SV-007',
    slug: 'kurta-pin',
    name: 'Kurta Pin',
    isPlaceholder: false,
    category: 'uncategorised',
    categoryLabel: 'Kurta accessories',
    price: 999,
    shortDescription: 'Decorative kurta pins joined by delicate chains, with sparkling circular motifs for festive styling.',
    description: 'Decorative kurta pins joined by delicate chains, with sparkling circular motifs for festive styling.',
    images: [
      { src: productImageUrl('SV-007', 'kurta-pin-01', 1400, '/images/products/kurta-pin-01.jpeg'), fallbackSrc: '/images/products/kurta-pin-01.jpeg', width: 1536, height: 1024, alt: 'Decorative kurta pins connected by chains on a cream presentation cushion' },
    ],
  },
];

export const getProductBySlug = (slug: string): Product | undefined =>
  PRODUCTS.find((product) => product.slug === slug);

export const getProductById = (id: string): Product | undefined =>
  PRODUCTS.find((product) => product.id === id);

export const productPath = (product: Pick<Product, 'slug'>): string => `/product/${product.slug}`;
