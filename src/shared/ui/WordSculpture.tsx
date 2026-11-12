interface WordSculptureProps {
  /** The brand word, set once as large display type. Decorative: the real name is in the page text. */
  text?: string;
  className?: string;
}

/**
 * Oversized wordmark that scales with its container (container query units), so the word always spans
 * the full width from a 360px phone to a 1440px desktop. Purely decorative, hence aria-hidden.
 */
export default function WordSculpture({ text = 'Silveram', className = '' }: WordSculptureProps) {
  return (
    <div className={`word-sculpture ${className}`.trim()} aria-hidden="true">
      <span className="word-sculpture__text uppercase">{text}</span>
    </div>
  );
}
