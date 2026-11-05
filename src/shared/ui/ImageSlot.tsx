import { useEffect, useState } from 'react';

interface ImageSlotProps {
  src?: string;
  fallbackSrc?: string;
  alt: string;
  width: number;
  height: number;
  /** CSS aspect-ratio of the frame (e.g. "4 / 5"); defaults to width / height. Image is cropped to fit. */
  ratio?: string;
  /** Eager + high priority for above-the-fold images. */
  priority?: boolean;
  sizes?: string;
  /** "cover" crops to fill the frame; "contain" shows the whole photograph on a stone mat. */
  fit?: 'cover' | 'contain';
  className?: string;
  imgClassName?: string;
  /** Text on the placeholder panel (when there is no image or it fails to load). */
  placeholderLabel?: string;
  /** Visual tone of the placeholder panel. */
  tone?: 'light' | 'dark';
}

/**
 * Image with a fixed aspect ratio (no layout shift) and a refined placeholder
 * panel. Passing no `src` (or a broken one) shows the placeholder, so pages stay
 * well-composed before real photography is added.
 */
export default function ImageSlot({
  src,
  fallbackSrc,
  alt,
  width,
  height,
  ratio,
  priority = false,
  sizes,
  fit = 'cover',
  className = '',
  imgClassName = '',
  placeholderLabel = 'Photograph coming soon',
  tone = 'light',
}: ImageSlotProps) {
  const [sourceFailed, setSourceFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const imageSrc = sourceFailed || !src ? fallbackSrc : src;
  const showImage = Boolean(imageSrc) && !fallbackFailed;
  const dark = tone === 'dark';

  useEffect(() => {
    setSourceFailed(false);
    setFallbackFailed(false);
  }, [src, fallbackSrc]);

  return (
    <div
      className={`relative overflow-hidden ${dark ? 'bg-brand-primary' : 'bg-surface-secondary'} ${className}`}
      style={{ aspectRatio: ratio ?? `${width} / ${height}` }}
    >
      {showImage ? (
        <img
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onError={() => {
            if (!sourceFailed && src && fallbackSrc) {
              setSourceFailed(true);
            } else {
              setFallbackFailed(true);
            }
          }}
          className={`absolute inset-0 h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} ${imgClassName}`}
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className={`absolute inset-0 flex flex-col items-center justify-center gap-4 ${dark ? 'silver-light' : ''}`}
        >
          <svg viewBox="0 0 120 120" className="h-1/3 max-h-28 w-1/3 max-w-28" fill="none" aria-hidden="true">
            <circle cx="60" cy="60" r="44" stroke="var(--color-accent-silver)" strokeWidth="1" />
            <circle cx="60" cy="60" r="30" stroke="var(--color-accent-silver)" strokeWidth="1" opacity="0.7" />
            <circle cx="60" cy="60" r="16" stroke="var(--color-accent-silver)" strokeWidth="1" opacity="0.5" />
          </svg>
          <span className={`type-eyebrow px-4 text-center ${dark ? 'text-accent-silver' : 'text-text-muted'}`}>
            {placeholderLabel}
          </span>
        </div>
      )}
    </div>
  );
}
