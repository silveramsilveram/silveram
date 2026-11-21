/**
 * Store policies. Plain data, so each policy is edited in one place.
 *
 * Every policy is a DRAFT until the owner has filled the `[OWNER INPUT REQUIRED: ...]` markers and a
 * lawyer has reviewed the text (`[LEGAL REVIEW REQUIRED: ...]`). Markers are shown to the reader in a
 * highlighted style and the page lists how many are open, so nothing unresolved is published quietly.
 * Set `draft: false` on a policy only when its markers are gone and it has been approved.
 *
 * Do not add a fact here that the business has not confirmed (see docs/SILVERAM_BUSINESS_INFORMATION_CHECKLIST.md).
 */
import { SITE } from '@/shared/config/site';
import type { PolicyId } from '@/shared/routing/router';

export type { PolicyId };

export interface PolicySection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}

export interface Policy {
  id: PolicyId;
  title: string;
  /** One sentence for the page's meta description and the top of the page. */
  summary: string;
  /** Drafts show a banner, stay out of search engines and may hold unresolved markers. */
  draft: boolean;
  sections: PolicySection[];
}

/** One consistent date for every policy. Change it whenever any policy text changes. */
export const POLICIES_LAST_UPDATED = '21 November 2026';

const need = (what: string) => `[OWNER INPUT REQUIRED: ${what}]`;
const review = (what: string) => `[LEGAL REVIEW REQUIRED: ${what}]`;

const support = SITE.contactEmail ? `${SITE.contactEmail}` : need('support e-mail address');
const phone = SITE.contactPhone;
const address = [...SITE.address.lines, SITE.address.locality, SITE.address.region, SITE.address.postalCode].join(', ');

export const POLICIES: Record<PolicyId, Policy> = {
  shipping: {
    id: 'shipping',
    title: 'Shipping & Delivery Policy',
    summary: 'Where Silveram delivers, how long it takes, what it costs and what happens if a delivery goes wrong.',
    draft: true,
    sections: [
      {
        heading: 'Where we deliver',
        paragraphs: [
          `Silveram delivers to addresses in India. ${need('confirm whether every PIN code is served, and list any that are not')}`,
          'Checkout takes an Indian delivery address with a state and PIN code. If we cannot deliver to your address, we will tell you before the order goes ahead.',
        ],
      },
      {
        heading: 'Processing and dispatch',
        paragraphs: [
          `Order processing time: ${need('how many days to prepare an order')}`,
          `Dispatch: ${need('when an order is handed to the courier, and on which days')}`,
        ],
      },
      {
        heading: 'Delivery time',
        paragraphs: [
          `Estimated delivery time: ${need('days by region, if known')}`,
          'A delivery time is an estimate, not a guarantee. If it is going to take longer, tell us and we will check.',
        ],
      },
      {
        heading: 'Shipping charges',
        paragraphs: [
          'The total you pay is shown in your bag and again on the payment page before you place the order.',
          `Delivery charges: ${need('state whether delivery is free or charged, the amount, and any free-delivery condition')}`,
        ],
      },
      {
        heading: 'Tracking',
        paragraphs: [
          'You can look up an order any time with your order reference and the e-mail you used at checkout, on the Track your order page. If you have an account, signing in shows all your orders.',
          `Delivery partner: ${need('name of the courier, if you want it stated')}`,
        ],
      },
      {
        heading: 'If the address or phone number is wrong, or nobody receives the parcel',
        paragraphs: [
          'We may call you on the number you gave to confirm a cash-on-delivery order. If the address or phone number is wrong, or the parcel is refused or not accepted, we may cancel the order.',
          `Delivery attempts and parcels returned to us: ${need('how many attempts are made, and what happens when a parcel comes back')}`,
        ],
      },
      {
        heading: 'Delays and damage in transit',
        paragraphs: [
          'Couriers can be delayed by weather, strikes or other events outside our control. A delay does not take away any right you have under the law.',
          'If a parcel looks damaged when it arrives, or an item is missing, contact us as soon as you can with your order reference and clear photographs. See the Return & Refund Policy for how we handle it.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [`Questions about delivery: ${support}${phone ? `, or ${phone} (WhatsApp)` : ''}.`],
      },
    ],
  },

  returns: {
    id: 'returns',
    title: 'Return & Refund Policy',
    summary:
      'Silveram does not refund for a change of mind. This page explains that clearly, and what we do when something is wrong with your order.',
    draft: true,
    sections: [
      {
        heading: 'In short',
        items: [
          'We do not offer refunds or returns for a change of mind.',
          'If your item is defective, damaged, not as described or wrong, tell us. We will look into it and resolve it in the way the law provides.',
          'Nothing on this page takes away a right or remedy you have under Indian law.',
        ],
      },
      {
        heading: 'What we do not refund',
        paragraphs: ['We do not offer refunds, returns or exchanges because:'],
        items: [
          'you changed your mind or no longer want the item',
          'you prefer another design, colour or size',
          'you chose the wrong design',
          'you found the item cheaper elsewhere',
          'any other ordinary preference or personal reason',
        ],
      },
      {
        heading: 'Your legal rights are not affected',
        paragraphs: [
          'Our position on change of mind does not limit any right or remedy you have under applicable law, including consumer protection law. If an item is defective or deficient, not genuine, differs significantly from what was advertised or agreed, or is delivered late in a situation where the law gives you a remedy, you can still complain and we will deal with it.',
          'We assess each complaint on its facts. The remedy may be a repair, a replacement, a price adjustment or a refund, whichever the law makes available in your case. We do not promise a particular remedy in advance.',
          review('lawyer to confirm this wording and the remedies against the Consumer Protection Act, 2019 and the E-Commerce Rules, 2020'),
        ],
      },
      {
        heading: 'Damaged, wrong or faulty items: how to tell us',
        items: [
          `Contact us at ${support}${phone ? ` or on WhatsApp at ${phone}` : ''} with your order reference.`,
          'Tell us what is wrong. Photographs of the item, the packaging and the label help us check what happened, and we may ask for them. If you cannot provide them, still contact us; we will not refuse to look into a complaint only because a photograph is missing.',
          `Time to report: ${need('is there a reporting window? If yes, how many days; keep it reasonable and not shorter than the law allows')}`,
          'We will investigate, and we may ask you to keep the item and its packaging until we have decided.',
        ],
      },
      {
        heading: 'If a refund is due',
        paragraphs: [
          'If a refund is due, either under a legal remedy or because we have agreed to it, it will be paid by the method that fits the order: back to the original payment method for a prepaid order. For a cash-on-delivery order, we will agree the method with you.',
          `Refund time: ${need('how many days after approval')} ${review('confirm the period against applicable law and RBI rules')}`,
        ],
      },
      {
        heading: 'Late delivery',
        paragraphs: ['If your order is very late, contact us. We will check what happened and what remedy applies.'],
      },
      {
        heading: 'If you are not satisfied',
        paragraphs: ['You can use our Grievance Redressal process. We acknowledge a complaint within 48 hours and aim to resolve it within one month.'],
      },
    ],
  },

  cancellation: {
    id: 'cancellation',
    title: 'Cancellation Policy',
    summary: 'When and how an order can be cancelled.',
    draft: true,
    sections: [
      {
        heading: 'Asking us to cancel',
        paragraphs: [
          `To ask for a cancellation, contact us as soon as possible at ${support}${phone ? ` or on WhatsApp at ${phone}` : ''}. Give your order reference and the e-mail used at checkout.`,
          'There is no cancel button on the website yet. We cancel orders for you.',
        ],
      },
      {
        heading: 'When an order can be cancelled',
        paragraphs: [
          `Before dispatch: ${need('confirm that an order can be cancelled until it is handed to the courier')}`,
          `After dispatch: ${need('confirm what happens once the parcel is on its way')}`,
          'Our order system can cancel a cash-on-delivery order only while it has not been fulfilled, and not after it is delivered.',
        ],
      },
      {
        heading: 'Cancellation charges',
        paragraphs: [
          `${need('confirm whether any charge applies to a cancellation')} ${review('the E-Commerce Rules do not allow a cancellation charge after you confirm a purchase unless the business pays the same charge when it cancels')}`,
        ],
      },
      {
        heading: 'Cash on delivery orders',
        paragraphs: ['You pay nothing at checkout for a cash-on-delivery order, so there is no money to return if it is cancelled before delivery.'],
      },
      {
        heading: 'Prepaid orders',
        paragraphs: [
          'Online payment is not available at the moment. If it is switched on and you cancel a paid order that qualifies, the money goes back to the original payment method.',
          `Refund time: ${need('how many days')}`,
        ],
      },
      {
        heading: 'Confirmation',
        paragraphs: [`We will confirm a cancellation to you: ${need('by e-mail, WhatsApp, or both')}`],
      },
      {
        heading: 'When we cancel',
        paragraphs: [
          'We may cancel an order that we cannot confirm or deliver, for example when the address or phone number is wrong or the parcel is refused, or an item is unavailable. We will tell you if we do.',
        ],
      },
    ],
  },

  grievance: {
    id: 'grievance',
    title: 'Grievance Redressal',
    summary: 'How to complain to Silveram, who handles it, and how quickly we respond.',
    draft: true,
    sections: [
      {
        heading: 'Grievance Officer',
        items: [
          `Name: ${need('Grievance Officer full name')}`,
          `Designation: ${need('designation')}`,
          `E-mail: ${need('official grievance e-mail')}`,
          `Phone: ${need('contact number, if the officer takes calls')}`,
          `Address: ${SITE.legalName}, ${address}`,
        ],
      },
      {
        heading: 'How to make a complaint',
        items: [
          'Write to the Grievance Officer by e-mail, or contact customer support.',
          'Give your name, order reference, the e-mail or phone number used on the order, and what the problem is.',
          'Attach photographs or other proof if you have them.',
        ],
      },
      {
        heading: 'What happens next',
        items: [
          'We acknowledge your complaint within 48 hours of receiving it.',
          'We resolve it within one month of the date we received it.',
          `Complaint reference: ${need('how a complaint reference is given and quoted, so you can follow its status')}`,
          'We tell you the outcome and the reason for it.',
        ],
      },
      {
        heading: 'Customer support',
        paragraphs: [
          `For everyday questions, use customer support: ${support}${phone ? `, ${phone}` : ''}. Support hours: ${need('days and hours')}.`,
        ],
      },
      {
        heading: 'If you are still not satisfied',
        paragraphs: [
          'You can approach the National Consumer Helpline or your consumer commission under the Consumer Protection Act, 2019.',
          review('lawyer to confirm the escalation details and any contact numbers to include'),
        ],
      },
    ],
  },

  contact: {
    id: 'contact',
    title: 'Contact Us',
    summary: 'Silveram’s business details and how to reach us.',
    draft: true,
    sections: [
      {
        heading: 'Business details',
        items: [
          `Trading name: ${SITE.name}`,
          `Business name: ${SITE.legalName} ${need('confirm the exact registered spelling and the business structure')}`,
          `Address: ${address}`,
          `Website: ${SITE.url.replace(/^https?:\/\//, '')}`,
        ],
      },
      {
        heading: 'Customer support',
        items: [
          `E-mail: ${support}`,
          phone ? `Phone and WhatsApp: ${phone}` : `Phone: ${need('support phone number')}`,
          `Instagram: ${SITE.instagramHandle}`,
          `Support hours: ${need('days and hours')}`,
        ],
        paragraphs: ['WhatsApp is for questions. Orders are placed on this website only.'],
      },
      {
        heading: 'Visit the shop',
        paragraphs: [`${SITE.legalName}, ${address}. Opening hours: ${need('shop opening hours')}`],
      },
      {
        heading: 'Complaints',
        paragraphs: ['For a complaint, see Grievance Redressal. It names the Grievance Officer and explains the steps.'],
      },
    ],
  },

  hallmarking: {
    id: 'hallmarking',
    title: 'Silver Purity & Hallmarking',
    summary: 'What silver purity, BIS hallmarking and a HUID mean, and what to check before you buy.',
    draft: true,
    sections: [
      {
        heading: 'What we tell you about each piece',
        paragraphs: [
          'We show a product’s material, purity, weight, hallmark or HUID on its page only after we have checked it for that piece. If a product page does not show a detail, we have not confirmed it, and you should not assume it.',
          'Do not assume that every Silveram product is hallmarked. A product page states it when it is.',
          need('product by product: material, purity, weight, hallmark status and HUID, so each product page can show only what is true'),
        ],
      },
      {
        heading: 'Purity (fineness)',
        paragraphs: [
          'Purity, or fineness, is how much pure silver an article contains. It is usually written as parts per thousand. For example, 925 means 925 parts of pure silver in every 1,000 parts. A higher number means more pure silver. Plated, oxidised, gold-tone or enamelled finishes can sit on top of the base metal.',
        ],
      },
      {
        heading: 'BIS hallmark and HUID',
        paragraphs: [
          'The Bureau of Indian Standards (BIS) runs the hallmarking scheme. According to BIS, a hallmark carries the BIS mark, the purity or fineness, and a Hallmark Unique ID (HUID), a code that identifies the individual article.',
          'As far as we have been able to confirm, hallmarking of silver jewellery in India is voluntary, and a HUID is required on silver articles that are hallmarked under the BIS scheme. ' +
            review('confirm the current BIS rules for silver, their effective dates and the standard number against official BIS documents before publishing'),
        ],
      },
      {
        heading: 'How to check a hallmark',
        items: [
          'Look for the BIS mark, the purity figure and the HUID on the article or its tag.',
          'Verify the HUID in the BIS Care app, using its HUID verification feature.',
          'You can also have an article tested at a BIS-recognised hallmarking centre.',
        ],
      },
      {
        heading: 'Before you buy',
        items: [
          'Read the product page for any stated material, purity, weight and hallmark.',
          'If a detail you care about is missing, ask us before you order.',
          'Keep your order record. It shows what was described when you bought.',
        ],
        paragraphs: [`Questions: ${support}${phone ? `, ${phone}` : ''}.`],
      },
    ],
  },

  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    summary: 'What personal information Silveram collects, why, who it is shared with, and how you can control it.',
    draft: true,
    sections: [
      {
        heading: 'Who we are',
        paragraphs: [
          `${SITE.legalName} (${SITE.name}), ${address}. Contact: ${support}${phone ? `, ${phone}` : ''}.`,
          review('the Digital Personal Data Protection Act, 2023 and the 2025 Rules come into force in stages, with most notice and consent duties from around May 2027; a lawyer should check this text against the notified provisions'),
        ],
      },
      {
        heading: 'What we collect',
        items: [
          'Your name, e-mail address, mobile number (and an alternate number if you give one).',
          'Your delivery address, landmark, city, state and PIN code.',
          'Your orders, what you bought, order status and payment status.',
          'If you create an account: your e-mail address and the one-time codes used to sign you in. We do not use passwords.',
          'Messages you send us, for example on WhatsApp or by e-mail.',
          'If you join the newsletter: your e-mail address and your consent.',
        ],
      },
      {
        heading: 'Why we use it',
        items: [
          'To take, confirm, deliver and track your order, and to contact you about it.',
          'To run your account and keep you signed in.',
          'To answer your questions and complaints.',
          'To send marketing messages, only if you agreed. You can say no and still shop.',
          'To keep records the law requires, and to keep the website secure.',
        ],
      },
      {
        heading: 'Payments',
        paragraphs: [
          'Cash on delivery is the available payment method. We do not collect card or UPI details for it.',
          'If online payment is switched on, payments are processed by our payment provider, Cashfree Payments. Card and UPI details go to the provider, not to our own servers.',
        ],
      },
      {
        heading: 'Who we share it with',
        paragraphs: ['We share only what a service needs to do its job:'],
        items: [
          'Appwrite, which stores account and order data for the website.',
          'Mailjet, which sends order, sign-in and newsletter e-mails.',
          'Cloudinary, which delivers product and site images. It does not receive your personal details.',
          'Cashfree Payments, only if online payment is enabled.',
          `Delivery partner: ${need('courier name and what details are shared with it (name, address, phone)')}`,
          'WhatsApp, if you choose to message us there.',
          'Authorities, where the law requires it.',
          'We do not sell your personal information.',
        ],
      },
      {
        heading: 'Cookies and what is stored in your browser',
        paragraphs: [
          'After you verify your e-mail, we set a session cookie so you stay signed in. It is an HTTP-only cookie, so the website’s scripts cannot read it. Your bag is kept in your browser’s storage on your device until you place an order.',
          'At the time of writing, the website does not use analytics or advertising trackers. If that changes, we will update this page first.',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: [need('retention period for order records, account data, support messages and newsletter data')],
      },
      {
        heading: 'How we protect it',
        paragraphs: [
          'Sign-in uses one-time e-mail codes and a protected session cookie. The session token is not given to your browser’s scripts. Access to order and account data is limited to the people who need it to run the store.',
          need('any further safeguards you can honestly state, for example access controls on admin tools'),
        ],
      },
      {
        heading: 'Your rights and how to use them',
        paragraphs: ['You can ask us to:'],
        items: [
          'tell you what personal information we hold about you',
          'correct information that is wrong or out of date',
          'delete your information, unless we must keep it by law',
          'stop sending you marketing messages, or withdraw a consent you gave. Withdrawing consent does not undo what we did before, and does not stop us handling an order you placed',
        ],
      },
      {
        heading: 'Contact for privacy requests',
        paragraphs: [
          `Write to ${support}, or to the Grievance Officer. ${need('a dedicated privacy contact, if you set one up. Do not name a Data Protection Officer unless one has been appointed')}`,
          `We will answer within ${need('number of days')}.`,
        ],
      },
      {
        heading: 'Children',
        paragraphs: [need('can anyone under 18 buy? If not, say so; if a parent or guardian may, say how')],
      },
      {
        heading: 'If something goes wrong',
        paragraphs: ['If a data breach affects your personal information, we will tell you and the authorities as the law requires.'],
      },
      {
        heading: 'Changes to this policy',
        paragraphs: [`We will change this page when our practices change. The date at the top shows the last update (${POLICIES_LAST_UPDATED}).`],
      },
    ],
  },

  terms: {
    id: 'terms',
    title: 'Terms & Conditions',
    summary: 'The terms for using the Silveram website and buying from Silveram.',
    draft: true,
    sections: [
      {
        heading: 'About these terms',
        paragraphs: [
          `This website is run by ${SITE.legalName} (${SITE.name}), ${address}. By using it or buying from it you agree to these terms, together with our other policies. ${need('confirm the business structure')}`,
          'Nothing here takes away a right you have under Indian consumer protection law.',
          review('lawyer to review the whole of these terms'),
        ],
      },
      {
        heading: 'Using the website',
        items: [
          'Use the website lawfully and for your own shopping.',
          'Do not copy, scrape or misuse the site, its photographs or its text, and do not try to interfere with it or get into parts you are not meant to.',
          'The photographs, text and design belong to Silveram or are used with permission.',
        ],
      },
      {
        heading: 'Who can buy',
        paragraphs: [need('minimum age and whether a parent or guardian may order for a minor')],
      },
      {
        heading: 'Your account',
        paragraphs: [
          'You can buy as a guest or with an account. Accounts use one-time e-mail codes. Keep your e-mail account secure, and tell us if you think someone else has used your account.',
        ],
      },
      {
        heading: 'Products and photographs',
        paragraphs: [
          'Product photographs show the design. Colour can look different on different screens. Material, purity, weight, dimensions and hallmark are confirmed for a product only when its page says so. See Silver Purity & Hallmarking.',
        ],
      },
      {
        heading: 'Prices and taxes',
        paragraphs: [
          'Prices are in Indian rupees (₹).',
          `Taxes: ${need('state whether prices include GST and all other taxes, and whether GST invoices are issued')}`,
          `Delivery charges: ${need('state the position, so it matches the Shipping & Delivery Policy')}`,
          'The total you pay is shown before you place the order.',
        ],
      },
      {
        heading: 'Placing an order',
        paragraphs: [
          'You place an order on this website by pressing the place-order button on the payment page. WhatsApp is for questions and cannot be used to place an order.',
          'An order is accepted when we confirm it to you. We may call you to confirm a cash-on-delivery order. We may decline or cancel an order we cannot confirm or deliver, for example if an item is unavailable, a price was shown wrongly, or the address or phone number is wrong.',
        ],
      },
      {
        heading: 'Payment',
        paragraphs: [
          'Cash on delivery is the available payment method: you pay in cash to the delivery partner when the parcel arrives. UPI and debit/credit card payments are not available yet.',
        ],
      },
      {
        heading: 'Cancellation, delivery, returns and refunds',
        paragraphs: [
          'These are set out in the Cancellation Policy, the Shipping & Delivery Policy and the Return & Refund Policy. In short, we do not refund for a change of mind; this does not affect your legal rights where an item is defective, not as described, damaged or wrong.',
        ],
      },
      {
        heading: 'Product care',
        paragraphs: [need('care instructions for silver, if you want to give them; otherwise leave this out')],
      },
      {
        heading: 'Our responsibility',
        paragraphs: [
          'We do what the law requires of us. Nothing in these terms limits our liability where the law does not allow it to be limited, or removes your statutory rights and remedies.',
          review('lawyer to decide any further limit on liability, if any'),
        ],
      },
      {
        heading: 'Law and disputes',
        paragraphs: [
          'These terms are governed by the laws of India.',
          `Courts and forum: ${need('which courts, based on the verified business location')} ${review('confirm; this must not stop you using a consumer commission you are entitled to use')}`,
          'If you have a complaint, please use Grievance Redressal first.',
        ],
      },
      {
        heading: 'Changes to these terms',
        paragraphs: [`We may update these terms. The date at the top shows the last update (${POLICIES_LAST_UPDATED}). An order is governed by the terms shown when you placed it.`],
      },
    ],
  },
};

/** Footer and "other policies" order. */
export const POLICY_ORDER: readonly PolicyId[] = [
  'shipping',
  'returns',
  'cancellation',
  'grievance',
  'hallmarking',
  'privacy',
  'terms',
  'contact',
];

/** Text of an unresolved marker, e.g. "[OWNER INPUT REQUIRED: ...]". */
export const MARKER = /(\[(?:OWNER INPUT REQUIRED|LEGAL REVIEW REQUIRED): [^\]]*\])/g;

export function countMarkers(policy: Policy): number {
  const text = [policy.summary, ...policy.sections.flatMap((s) => [...(s.paragraphs ?? []), ...(s.items ?? [])])].join('\n');
  return text.match(MARKER)?.length ?? 0;
}
