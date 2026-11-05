import { useRef, useState } from 'react';
import ImageSlot from '@/shared/ui/ImageSlot';
import { CloseIcon } from '@/shared/ui/icons';
import { useDialog } from '@/shared/hooks/useDialog';
import type { Product } from '../data/products';

function Lightbox({ image, onClose }: { image: Product['images'][number]; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);
  const [imageSrc, setImageSrc] = useState(image.src);
  useDialog(true, onClose, panelRef);

  return (
    <div
      className="on-navy fixed inset-0 z-50 flex flex-col bg-brand-primary/95"
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged product image"
      onClick={onClose}
    >
      <div ref={panelRef} tabIndex={-1} className="flex h-full flex-col focus:outline-none">
        <div className="flex items-center justify-between px-4 py-3 text-surface-primary">
          <span className="type-caption">{zoomed ? 'Click image to fit screen' : 'Click image to zoom'}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-[2px] hover:bg-surface-primary/10"
            aria-label="Close enlarged image"
          >
            <CloseIcon size={24} />
          </button>
        </div>
        <div className={`flex min-h-0 flex-1 ${zoomed ? 'overflow-auto' : 'items-center justify-center'}`}>
          <img
            src={imageSrc}
            onError={() => {
              if (image.fallbackSrc) setImageSrc(image.fallbackSrc);
            }}
            alt={image.alt}
            width={image.width}
            height={image.height}
            onClick={(event) => {
              event.stopPropagation();
              setZoomed((value) => !value);
            }}
            className={
              zoomed
                ? 'm-auto h-auto max-w-none cursor-zoom-out'
                : 'max-h-full max-w-full cursor-zoom-in object-contain'
            }
            style={zoomed ? { width: 'max(160%, 900px)' } : undefined}
          />
        </div>
      </div>
    </div>
  );
}

export default function ProductGallery({ product }: { product: Product }) {
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const images = product.images;
  const current = images[index];
  const touchStartX = useRef<number | null>(null);

  const step = (delta: number) => setIndex((i) => (i + delta + images.length) % images.length);
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null || images.length < 2) return;
    const dx = event.changedTouches[0].clientX - start;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  };

  if (!current) {
    return (
      <ImageSlot
        alt={`${product.name} – photograph coming soon`}
        width={4}
        height={5}
        ratio="4 / 5"
        className="border border-border"
      />
    );
  }

  return (
    <div>
      <div
        className="relative"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0].clientX;
        }}
        onTouchEnd={onTouchEnd}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') step(1);
          if (event.key === 'ArrowLeft') step(-1);
        }}
      >
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group relative block w-full cursor-zoom-in border border-border"
        aria-label={`Enlarge image ${index + 1} of ${images.length}: ${current.alt}`}
      >
        <ImageSlot
          src={current.src}
          fallbackSrc={current.fallbackSrc}
          alt={current.alt}
          width={current.width}
          height={current.height}
          ratio="1 / 1"
          fit="contain"
          priority
          sizes="(min-width: 1024px) 600px, 100vw"
        />
        <span className="type-caption absolute bottom-3 right-3 rounded-[2px] bg-surface-primary/90 px-2 py-1 text-text-primary">
          Enlarge
        </span>
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[2px] bg-surface-primary/90 text-text-primary hover:bg-surface-primary"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next image"
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[2px] bg-surface-primary/90 text-text-primary hover:bg-surface-primary"
          >
            <span aria-hidden="true">›</span>
          </button>
        </>
      )}
      </div>

      {images.length > 1 && (
        <ul className="mt-3 grid grid-cols-6 gap-2 sm:gap-3" aria-label="Product images">
          {images.map((image, i) => (
            <li key={image.src}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === index}
                className={`block w-full rounded-[2px] overflow-hidden border-2 transition-all duration-200 ${i === index ? 'border-brand-primary shadow-sm' : 'border-border/60 hover:border-accent-silver'}`}
              >
                <ImageSlot
                  src={image.src}
                  fallbackSrc={image.fallbackSrc}
                  alt=""
                  width={image.width}
                  height={image.height}
                  ratio="1 / 1"
                  fit="contain"
                  sizes="96px"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen && <Lightbox image={current} onClose={() => setIsOpen(false)} />}
    </div>
  );
}
