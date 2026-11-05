/**
 * Store policies — edit the `paragraphs` once each policy is finalised.
 * Nothing here is a business commitment until you replace the pending text.
 */
export type PolicyId = 'shipping' | 'returns' | 'privacy' | 'terms';

export interface Policy {
  id: PolicyId;
  title: string;
  /** Drafts are visible for review but must not be presented as approved policy. */
  draft: boolean;
  paragraphs: string[];
}

export const POLICIES: Record<PolicyId, Policy> = {
  shipping: {
    id: 'shipping',
    title: 'Shipping Policy',
    draft: true,
    paragraphs: [
      'Before an order is accepted, Silveram will confirm whether delivery is available to your PIN code, the applicable shipping charges, and the estimated delivery timeline.',
      'Do not assume that shipping is free or included in a displayed product price unless the final order total says so. Delivery estimates can depend on the destination and carrier.',
      'If a parcel appears damaged or an item is missing, keep the packaging and contact Silveram using the support details shown on the website. Include your order reference and clear photographs where possible.',
      'This draft does not state delivery charges, coverage, or dispatch timelines because those details have not been supplied by the store.',
    ],
  },
  returns: {
    id: 'returns',
    title: 'Return & Exchange Policy',
    draft: true,
    paragraphs: [
      'Please confirm the return or exchange eligibility, time window, item condition requirements, and any shipping costs with Silveram before placing an order.',
      'If an item arrives damaged or differs from the order, contact Silveram promptly using the support details shown on the website. Keep the product and its packaging, and share your order reference and photographs so the store can review the issue.',
      'This draft does not promise a return window, refund method, or exchange outcome. The store must approve and publish those terms before accepting orders.',
    ],
  },
  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    draft: true,
    paragraphs: [
      'The shopping bag is stored in this browser. If you send an enquiry through WhatsApp, the message and any contact details you include are shared with Silveram and processed by WhatsApp.',
      'If checkout is enabled and you place an order, Silveram processes your name, verified email address, phone number, delivery address, order items, and payment status to manage the order. The current storefront keeps the bag in browser storage and does not send it to the API until checkout is submitted.',
      'The service uses MongoDB to store account, session, product, and order records; Mailjet may process verification and service emails; Cloudinary stores product images. Razorpay may process payments only if online payment is enabled. These providers receive information needed for their service.',
      'The site uses an HTTP-only session cookie after email verification. The browser does not receive the raw session token from the API.',
      'Marketing messages are separate from service messages and require consent. Newsletter sign-up is available only when enabled; Mailjet manages subscriptions and its unsubscribe controls.',
      'The store has not provided a retention schedule or a privacy contact. This draft must be reviewed and completed with the business contact, applicable retention periods, and customer-request process before publication.',
    ],
  },
  terms: {
    id: 'terms',
    title: 'Terms & Conditions',
    draft: true,
    paragraphs: [
      'Product descriptions and photographs are provided to help you understand the designs. Material, purity, weight, dimensions, sizes, stock, and other specifications should be treated as confirmed only when they are explicitly stated for that product.',
      'Displayed prices are in Indian rupees. Shipping charges, taxes, delivery availability, and any other applicable amount must be shown or confirmed before an order is accepted.',
      'A WhatsApp enquiry is not an order. An order is accepted only when Silveram confirms it through the applicable ordering process.',
      'Online checkout is currently disabled in this project. Do not treat this draft as a promise that an online payment or COD order can be placed.',
      'This draft requires review and completion with the seller’s legal identity, contact details, tax treatment, and final commercial terms before publication.',
    ],
  },
};
