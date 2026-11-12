/**
 * Editable storefront copy. Only statements that are true of the site as built
 * (or deliberately neutral) belong here — no invented policies, claims or metrics.
 *
 * Product facts (names, prices, descriptions, photographs) are never repeated here: sections read them from
 * `products.ts`, so a price or photograph is edited in exactly one place.
 */

/** Primary navigation (desktop bar and mobile menu). */
export const NAV_LINKS = [
  { label: 'Shop', href: '/shop' },
  { label: 'Our story', href: '/#story' },
  { label: 'Gifting', href: '/#gifting' },
  { label: 'Contact', href: '/#contact' },
] as const;

/** Extra links that live in the mobile menu only. */
export const MENU_EXTRA_LINKS = [{ label: 'Track your order', href: '/track' }] as const;

export const ANNOUNCEMENT = 'Cash on delivery across India';

/**
 * Announcement ticker. Every line is a fact the site already states elsewhere (checkout, footer, FAQ).
 * Do not add offers, discounts or delivery times here until the store has confirmed them.
 */
export const ANNOUNCEMENT_ITEMS = [
  ANNOUNCEMENT,
  'Visit the store in Motihari, Bihar',
  'Questions about a piece? Message us on WhatsApp',
] as const;

export const HERO = {
  heading: 'Small keepsakes. Lasting meaning.',
  description:
    'A devotional frame, patterned bangles and a peacock-inspired ring, thoughtfully chosen for meaningful occasions.',
  image: {
    name: 'silveram-fullbleed-hero',
    alt: 'Two silver rings arranged on a dark blue surface.',
    width: 5760,
    height: 3840,
    focal: { x: 50, y: 50 },
  },
};

/* ----------------------------------------------------------------------------------------------
 * Homepage scenes (Milestone 4). Order on the page: hero, featured, promise, lineup, promises,
 * look closely, occasions, gifting, rail, visit, FAQ, footer.
 * -------------------------------------------------------------------------------------------- */

/** Featured carousel: which photograph of each product to show. Add a `film` to a product to play it here. */
export const FEATURED = {
  label: 'Featured piece',
  slides: [
    { productId: 'product-1', imageIndex: 0 },
    { productId: 'product-2', imageIndex: 0 },
    { productId: 'product-3', imageIndex: 1 },
  ],
};

/** Editorial promise (the "Our story" anchor). The second line is the italic accent. */
export const PROMISE = {
  lines: ['A gift is never just an object.'],
  accent: 'It says “may good fortune stay with you”.',
  description:
    'In India, a gift is rarely just an object. It marks Diwali and Dhanteras, a wedding or a housewarming, and it says “may good fortune stay with you”. Silveram brings together pieces made for those moments: devotional décor for the home, traditional bangles for festive dressing and an artistic ring for special occasions.',
  cta: { label: 'Explore the pieces', href: '/#collection' },
};

export const LINEUP = {
  heading: 'Three pieces. Endless meaning.',
  description: 'A carefully curated selection, each piece chosen for gifting, festivals and everyday celebration.',
};

/** “Silveram is always”: only promises the site actually keeps. */
export const PROMISES = {
  heading: 'Silveram is always',
  items: [
    {
      id: 'selected',
      title: 'Thoughtfully selected',
      description: 'A small, considered collection rather than an endless catalogue.',
    },
    {
      id: 'transparency',
      title: 'Honest product details',
      description: 'We show only what we have verified. If a detail is missing, ask us before you buy.',
    },
    {
      id: 'assistance',
      title: 'Personal assistance',
      description: 'Questions about a piece? Chat with us on WhatsApp or visit the store in Motihari.',
    },
    {
      id: 'delivery',
      title: 'Clear communication',
      description: 'Delivery timelines and charges are confirmed with you before an order is placed.',
    },
  ],
} as const;

/** “Look closely”: what each photograph shows. Each tab pairs a detail with the photograph it describes. */
export const CRAFTSMANSHIP = {
  heading: 'Look closely.',
  description:
    'Fine detail is what makes a piece worth keeping. The frame carries an embossed relief of Lakshmi and Ganesha with a carved arch and pillars. The kada’s surfaces are cut with varied textures that catch the light. The ring pairs a sculpted peacock with enamel-like colour and set stones.',
  points: [
    {
      id: 'relief',
      label: 'Silver Frame',
      title: 'Embossed devotional relief',
      text: 'Silver Frame: Lakshmi, Ganesha and the Shubh Labh inscription.',
      productId: 'product-1',
      imageIndex: 4,
    },
    {
      id: 'texture',
      label: 'Silver Kada',
      title: 'Patterned surfaces',
      text: 'Silver Kada: geometric and textured patterns across the bangles.',
      productId: 'product-2',
      imageIndex: 0,
    },
    {
      id: 'colour',
      label: 'Peacock Ring',
      title: 'Colour and detail',
      text: 'Peacock Ring: feather-inspired shapes and colourful accents.',
      productId: 'product-3',
      imageIndex: 1,
    },
  ],
} as const;

/**
 * “Find the right piece for the moment”. Each phrase is quoted from the product's own description in products.ts,
 * so the suggestion never says more than the product copy does.
 */
export const OCCASIONS = {
  heading: 'Find the right piece for the moment.',
  ticker: ['Festivals', 'Weddings', 'Anniversaries', 'Housewarmings', 'Diwali and Dhanteras'],
  options: [
    { id: 'temple', label: 'A home temple', productId: 'product-1', quote: 'a thoughtful addition to your home temple', imageIndex: 3 },
    { id: 'festive', label: 'Festive days', productId: 'product-2', quote: 'suitable for festive occasions', imageIndex: 0 },
    { id: 'everyday', label: 'Everyday styling', productId: 'product-2', quote: 'everyday ethnic styling', imageIndex: 0 },
    { id: 'special', label: 'Special occasions', productId: 'product-3', quote: 'an elegant centrepiece for special occasions', imageIndex: 1 },
  ],
} as const;

export const GIFTING = {
  heading: 'A gift beyond occasions.',
  description:
    'For festivals, weddings, anniversaries and housewarmings. The Silver Frame brings devotional detail to a home-temple shelf. Ask us about gift presentation for the piece you have in mind.',
  /** Photograph per product for the three gift tiles. */
  tiles: [
    { productId: 'product-1', imageIndex: 1 },
    { productId: 'product-2', imageIndex: 0 },
    { productId: 'product-3', imageIndex: 1 },
  ],
};

export const RAIL = {
  heading: 'From the collection.',
  description: 'More photographs of each piece. New pictures and films appear here as they are added.',
};

/** The shop in Motihari. Hours are not published here because the store has not supplied them. */
export const VISIT = {
  statement: 'Come and see the pieces in person.',
  description: 'Silveram is a shop in Motihari, Bihar, as well as online. Ask about any piece in the collection, or visit us.',
  /** Add a Cloudinary site photograph here later (siteImageUrl('editorial', name)); the layout already reserves the slot. */
  image: null as { src: string; fallbackSrc?: string; width: number; height: number; alt: string } | null,
};

export type FaqCategory = 'The pieces' | 'Ordering' | 'Delivery and returns' | 'Visit and contact';

export const FAQ_CATEGORIES: readonly FaqCategory[] = ['The pieces', 'Ordering', 'Delivery and returns', 'Visit and contact'];

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
}

/** Answers below stay neutral until the store supplies verified policies. */
export const FAQS: FaqItem[] = [
  {
    id: 'faq-material',
    category: 'The pieces',
    question: 'What material is each product made from?',
    answer:
      'Each product page lists its material and purity once verified details are added. If a detail is not shown, please ask us on WhatsApp before you buy.',
  },
  {
    id: 'faq-purity',
    category: 'The pieces',
    question: 'How can I verify silver purity?',
    answer:
      'Ask us for the purity details of the piece you are considering. You can also have any silver item tested by an independent jeweller or assay centre.',
  },
  {
    id: 'faq-gifting',
    category: 'The pieces',
    question: 'Do you offer gift packaging?',
    answer: 'Please ask us on WhatsApp about gift packaging for the piece you are interested in.',
  },
  {
    id: 'faq-order',
    category: 'Ordering',
    question: 'How do I place an order?',
    answer:
      'Add pieces to your bag, enter your delivery details and choose cash on delivery. You can check out as a guest or with an account, and we email your order confirmation. You pay when the parcel arrives. WhatsApp is only for questions, not for placing orders.',
  },
  {
    id: 'faq-payment',
    category: 'Ordering',
    question: 'Which payment methods do you accept?',
    answer: 'Cash on delivery is available now: pay in cash when your order arrives. UPI and debit/credit card payments are coming soon.',
  },
  {
    id: 'faq-delivery',
    category: 'Delivery and returns',
    question: 'What are the delivery timelines?',
    answer:
      'Delivery timelines depend on your location. Delivery timelines and charges are shown before you pay. Message us on WhatsApp if you have a question.',
  },
  {
    id: 'faq-returns',
    category: 'Delivery and returns',
    question: 'What is the return or exchange policy?',
    answer:
      'Our return and exchange policy is being finalised. Please message us on WhatsApp if you need the terms before ordering.',
  },
  {
    id: 'faq-contact',
    category: 'Visit and contact',
    question: 'How can I contact the store?',
    answer: 'The quickest way is WhatsApp on +91 77669 11777, or message us on Instagram @silveram__. Our address and contact details are at the bottom of this page.',
  },
  {
    id: 'faq-visit',
    category: 'Visit and contact',
    question: 'Can I visit the store?',
    answer:
      'Yes. Silveram is at Pani Tanki, Main Rd, beside Bank of Baroda, beside Meena Bazar Bridge, Rajendra Nagar, Motihari, Bihar 845401. Use “Get directions” in the footer to open Google Maps.',
  },
];
