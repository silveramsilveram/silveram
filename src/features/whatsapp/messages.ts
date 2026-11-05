import { formatINR } from '@/shared/lib/money';

interface MessageProduct {
  sku: string;
  name: string;
  price: number | null;
}

const priceText = (price: number | null) => (price === null ? 'To be confirmed' : formatINR(price));

export function buildProductMessage(product: MessageProduct): string {
  return [
    'Hello Silveram,',
    '',
    'I have a question about:',
    '',
    `Product: ${product.name}`,
    `SKU: ${product.sku}`,
    `Price: ${priceText(product.price)}`,
    '',
    'Could you please share more information?',
  ].join('\n');
}

export function buildGeneralMessage(): string {
  return 'Hello Silveram,\n\nI would like to know more about your silver collection.';
}
