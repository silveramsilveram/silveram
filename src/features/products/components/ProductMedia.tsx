import { nativeWidths, productVideoPosterUrl, productVideoUrl, responsiveSrcSet } from '@/shared/lib/cloudinary';
import Media from '@/shared/ui/Media';
import type { Product } from '../data/products';

interface ProductMediaProps {
  product: Product;
  /** Which photograph to show (falls back to the first). */
  imageIndex?: number;
  /** `native` (default) keeps the photograph's own aspect ratio; pass a CSS ratio such as "4 / 5" to crop to the focal point. */
  ratio?: string;
  focal?: { x: number; y: number };
  sizes?: string;
  priority?: boolean;
  radius?: 'none' | 'media';
  className?: string;
  imgClassName?: string;
  /** Prefer the product's film when it has one. Turn off where a still is wanted (tiles, thumbnails). */
  allowFilm?: boolean;
}

/**
 * One place that knows how to show a product: its photograph at native size with responsive Cloudinary
 * sources, or its film (silent, in view only, with the photograph as the fallback) once a film is added to
 * the product in products.ts. Sections never build image URLs themselves.
 */
export default function ProductMedia({
  product,
  imageIndex = 0,
  ratio,
  focal,
  sizes,
  priority,
  radius = 'media',
  className,
  imgClassName,
  allowFilm = true,
}: ProductMediaProps) {
  const image = product.images[imageIndex] ?? product.images[0];
  const film = allowFilm ? product.film : undefined;
  const filmSrc = film ? productVideoUrl(product.sku, film.name, Math.min(1280, film.width)) : '';

  if (film && filmSrc) {
    return (
      <Media
        kind="video"
        src={filmSrc}
        poster={productVideoPosterUrl(product.sku, film.name, Math.min(1280, film.width))}
        fallbackSrc={image?.fallbackSrc ?? image?.src}
        alt={film.alt}
        width={film.width}
        height={film.height}
        ratio={ratio}
        focal={focal}
        radius={radius}
        tone="dark"
        priority={priority}
        className={className}
      />
    );
  }

  return (
    <Media
      src={image?.src}
      fallbackSrc={image?.fallbackSrc}
      srcSet={image ? responsiveSrcSet(image.src, nativeWidths(image.width)) : undefined}
      alt={image?.alt ?? `${product.name}, photograph coming soon`}
      width={image?.width ?? 1}
      height={image?.height ?? 1}
      ratio={ratio}
      focal={focal}
      sizes={sizes}
      priority={priority}
      radius={radius}
      className={className}
      imgClassName={imgClassName}
      placeholderLabel="Photograph coming soon"
    />
  );
}
