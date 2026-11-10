/**
 * Editable storefront copy. Only statements that are true of the site as built
 * (or deliberately neutral) belong here — no invented policies, claims or metrics.
 */
export const NAV_LINKS = [
  { label: 'Shop', href: '#/shop' },
  { label: 'Our story', href: '#story' },
  { label: 'Gifting', href: '#gifting' },
  { label: 'Contact', href: '#contact' },
] as const;

export const ANNOUNCEMENT = 'Cash on delivery across India';

import { productImageUrl } from '@/shared/lib/cloudinary';

interface Img {
  src: string;
  fallbackSrc: string;
  width: number;
  height: number;
  alt: string;
}

export const HERO = {
  heading: 'Small keepsakes. Lasting meaning.',
  description:
    'A devotional frame, patterned bangles and a peacock-inspired ring, thoughtfully chosen for meaningful occasions.',
  /** The hero photograph is the first Peacock Ring image in products.ts. */
  productId: 'product-3',
};

export const COLLECTION = {
  heading: 'Three pieces. Endless meaning.',
  description: 'A carefully curated selection, each piece chosen for gifting, festivals and everyday celebration.',
};

export const STORY = {
  heading: 'Gifts that carry a blessing.',
  description:
    'In India, a gift is rarely just an object. It marks Diwali and Dhanteras, a wedding or a housewarming, and it says “may good fortune stay with you”. Silveram brings together pieces made for those moments: devotional décor for the home, traditional bangles for festive dressing and an artistic ring for special occasions.',
  image: {
    src: productImageUrl('SV-003', 'peacock-ring-02', 1400, '/images/products/peacock-ring-02.webp'),
    fallbackSrc: '/images/products/peacock-ring-02.webp',
    width: 1374,
    height: 1145,
    alt: 'Peacock-inspired statement ring with colourful detailing on a marble surface',
  } as Img,
};

export const CRAFTSMANSHIP = {
  heading: 'Look closely.',
  description:
    'Fine detail is what makes a piece worth keeping. The frame carries an embossed relief of Lakshmi and Ganesha with a carved arch and pillars. The kada’s surfaces are cut with varied textures that catch the light. The ring pairs a sculpted peacock with enamel-like colour and set stones.',
  points: [
    { id: 'relief', title: 'Embossed devotional relief', text: 'Silver Frame: Lakshmi, Ganesha and the Shubh Labh inscription.' },
    { id: 'texture', title: 'Patterned surfaces', text: 'Silver Kada: geometric and textured patterns across the bangles.' },
    { id: 'colour', title: 'Colour and detail', text: 'Peacock Ring: feather-inspired shapes and colourful accents.' },
  ],
  image: {
    src: productImageUrl('SV-001', 'silver-frame-06', 1400, '/images/products/silver-frame-06.webp'),
    fallbackSrc: '/images/products/silver-frame-06.webp',
    width: 508,
    height: 508,
    alt: 'Close-up of the embossed Lakshmi and Ganesha relief on the Silver Frame',
  } as Img,
};

export const GIFTING = {
  heading: 'A gift beyond occasions.',
  description:
    'For festivals, weddings, anniversaries and housewarmings. The Silver Frame brings devotional detail to a home-temple shelf. Ask us about gift presentation for the piece you have in mind.',
  image: {
    src: productImageUrl('SV-001', 'silver-frame-03', 1400, '/images/products/silver-frame-03.webp'),
    fallbackSrc: '/images/products/silver-frame-03.webp',
    width: 508,
    height: 508,
    alt: 'Silver Frame presented in a navy gift box with a gold ribbon',
  } as Img,
};

/** “Why choose Silveram”: only promises the site actually keeps. */
export const TRUST_ITEMS = [
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
] as const;

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

/** Answers below stay neutral until the store supplies verified policies. */
export const FAQS: FaqItem[] = [
  {
    id: 'faq-material',
    question: 'What material is each product made from?',
    answer:
      'Each product page lists its material and purity once verified details are added. If a detail is not shown, please ask us on WhatsApp before you buy.',
  },
  {
    id: 'faq-purity',
    question: 'How can I verify silver purity?',
    answer:
      'Ask us for the purity details of the piece you are considering. You can also have any silver item tested by an independent jeweller or assay centre.',
  },
  {
    id: 'faq-order',
    question: 'How do I place an order?',
    answer:
      'Add pieces to your bag, enter your delivery details and choose cash on delivery. You can check out as a guest or with an account, and we email your order confirmation. You pay when the parcel arrives. WhatsApp is only for questions, not for placing orders.',
  },
  {
    id: 'faq-payment',
    question: 'Which payment methods do you accept?',
    answer: 'Cash on delivery is available now: pay in cash when your order arrives. UPI and debit/credit card payments are coming soon.',
  },
  {
    id: 'faq-gifting',
    question: 'Do you offer gift packaging?',
    answer: 'Please ask us on WhatsApp about gift packaging for the piece you are interested in.',
  },
  {
    id: 'faq-delivery',
    question: 'What are the delivery timelines?',
    answer:
      'Delivery timelines depend on your location. Delivery timelines and charges are shown before you pay. Message us on WhatsApp if you have a question.',
  },
  {
    id: 'faq-returns',
    question: 'What is the return or exchange policy?',
    answer:
      'Our return and exchange policy is being finalised. Please message us on WhatsApp if you need the terms before ordering.',
  },
  {
    id: 'faq-contact',
    question: 'How can I contact the store?',
    answer: 'The quickest way is WhatsApp on +91 77669 11777, or message us on Instagram @silveram__. Our address and contact details are at the bottom of this page.',
  },
  {
    id: 'faq-visit',
    question: 'Can I visit the store?',
    answer:
      'Yes. Silveram is at Pani Tanki, Main Rd, beside Bank of Baroda, beside Meena Bazar Bridge, Rajendra Nagar, Motihari, Bihar 845401. Use “Get directions” in the footer to open Google Maps.',
  },
];
