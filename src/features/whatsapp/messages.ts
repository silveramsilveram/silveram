import { formatINR } from '@/shared/lib/money';

interface MessageProduct {
  sku: string;
  name: string;
  price: number | null;
}

interface MessageLine extends MessageProduct {
  quantity: number;
}

const priceText = (price: number | null) => (price === null ? 'To be confirmed' : formatINR(price));

export function buildProductMessage(product: MessageProduct): string {
  return [
    'Hello Silveram,',
    '',
    'I am interested in:',
    '',
    `Product: ${product.name}`,
    `SKU: ${product.sku}`,
    `Price: ${priceText(product.price)}`,
    '',
    'Could you please share more information and ordering details?',
  ].join('\n');
}

export function buildCartMessage(lines: MessageLine[]): string {
  const rows = lines.map(
    (line, index) =>
      `${index + 1}. ${line.name}\n   SKU: ${line.sku}\n   Quantity: ${line.quantity}\n   Price: ${priceText(line.price)}` +
      (line.price === null ? '' : `\n   Amount: ${formatINR(line.price * line.quantity)}`),
  );
  const allPriced = lines.every((line) => line.price !== null);
  const total = allPriced
    ? formatINR(lines.reduce((sum, line) => sum + (line.price as number) * line.quantity, 0))
    : 'To be confirmed';

  return [
    'Hello Silveram,',
    '',
    'I would like to enquire about the following items:',
    '',
    ...rows,
    '',
    `Total: ${total}`,
    '',
    'Could you please confirm availability, delivery details and how to place the order?',
  ].join('\n');
}

export function buildGeneralMessage(): string {
  return 'Hello Silveram,\n\nI would like to know more about your silver collection.';
}
