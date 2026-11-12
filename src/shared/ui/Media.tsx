import { useEffect, useRef, useState } from 'react';
import { useDecorativeMotionPaused, usePrefersReducedMotion } from '@/shared/lib/motion';
import ImageSlot from './ImageSlot';
import { PauseIcon, PlayIcon } from './icons';

/**
 * One component for product and editorial media, so a photograph can later become a film without
 * rebuilding the section around it.
 *
 *  - `kind="image"` (default): the existing ImageSlot (fixed ratio, Cloudinary srcset, fallback, placeholder).
 *  - `kind="video"`: a muted, silent, looping film that plays only while visible, never with sound,
 *    never when the visitor prefers reduced motion or has paused decorative motion, and never on
 *    "data saver". The first frame (`poster`) is always shown first; a visible control plays or pauses.
 *    If the film is missing or fails to load, the poster (or the neutral placeholder) is shown.
 *
 * Both render at their native size: callers must not request widths above the source dimensions.
 */
interface MediaBase {
  alt: string;
  width: number;
  height: number;
  ratio?: string;
  focal?: { x: number; y: number };
  className?: string;
  radius?: 'none' | 'media';
  tone?: 'light' | 'dark';
}

export interface ImageMediaProps extends MediaBase {
  kind?: 'image';
  src?: string;
  fallbackSrc?: string;
  srcSet?: string;
  sizes?: string;
  fit?: 'cover' | 'contain';
  priority?: boolean;
  imgClassName?: string;
  placeholderLabel?: string;
}

export interface VideoMediaProps extends MediaBase {
  kind: 'video';
  src?: string;
  /** First-frame still: shown before play, under reduced motion, and if the film cannot load. */
  poster?: string;
  /** Photograph shown if the film and its poster cannot load (for example the product photograph). */
  fallbackSrc?: string;
  /** `inView` plays while on screen; `never` waits for the visitor to press play. */
  autoplay?: 'inView' | 'never';
  loop?: boolean;
  priority?: boolean;
}

export type MediaProps = ImageMediaProps | VideoMediaProps;

function saveDataOn(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(connection?.saveData);
}

function VideoMedia({
  src,
  poster,
  fallbackSrc,
  alt,
  width,
  height,
  ratio,
  focal,
  autoplay = 'inView',
  loop = true,
  className = '',
  radius = 'none',
  tone = 'light',
}: VideoMediaProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [userChoice, setUserChoice] = useState<'play' | 'pause' | null>(null);
  const reduced = usePrefersReducedMotion();
  const [globalPaused] = useDecorativeMotionPaused();

  const wantsAuto = autoplay === 'inView' && !reduced && !globalPaused && !saveDataOn() && userChoice !== 'pause';
  const shouldPlay = userChoice === 'play' || wantsAuto;

  // Play only while the film is on screen and allowed to move; pause as soon as it leaves.
  useEffect(() => {
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!video || !frame || failed) return;
    if (!shouldPlay) {
      video.pause();
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      void video.play().catch(() => undefined);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, [shouldPlay, failed]);

  if (!src || failed) {
    return (
      <ImageSlot
        src={poster}
        fallbackSrc={fallbackSrc}
        alt={alt}
        width={width}
        height={height}
        ratio={ratio}
        focal={focal}
        radius={radius}
        tone={tone}
        className={className}
        placeholderLabel="Film coming soon"
      />
    );
  }

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) setUserChoice('play');
    else setUserChoice('pause');
  };

  return (
    <div
      ref={frameRef}
      className={`relative overflow-hidden ${radius === 'media' ? 'media-frame' : ''} ${tone === 'dark' ? 'bg-brand-primary' : 'bg-surface-secondary'} ${className}`}
      style={{ aspectRatio: ratio ?? `${width} / ${height}` }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        width={width}
        height={height}
        muted
        playsInline
        loop={loop}
        preload="none"
        disablePictureInPicture
        aria-label={alt}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setFailed(true)}
        style={focal ? { objectPosition: `${focal.x}% ${focal.y}%` } : undefined}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause film: ${alt}` : `Play film: ${alt}`}
        className="btn-round absolute bottom-3 right-3 bg-surface-primary/90 text-brand-primary"
      >
        {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
      </button>
    </div>
  );
}

export default function Media(props: MediaProps) {
  if (props.kind === 'video') return <VideoMedia {...props} />;
  const { kind: _kind, ...image } = props;
  return <ImageSlot {...image} />;
}
