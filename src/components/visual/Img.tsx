import React, { useState } from 'react';
import { IMAGE_SLOTS, type ImageSlotId } from '../../config/images';
import { useSiteData } from '../../context/SiteDataContext';
import { Illustration } from './IllustrationKit';
import type { IllustrationKey, ImageMask } from '../../types/database';

export interface ImgProps {
  slot?: ImageSlotId;
  src?: string | null;
  alt?: string;
  mask?: ImageMask;
  aspect?: string;
  width?: number;
  height?: number;
  illustrationFallback?: IllustrationKey;
  hoverZoom?: boolean;
  duotone?: boolean;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
}

const MASK_CLASSES: Record<ImageMask, string> = {
  capsule: 'mask-capsule',
  arch: 'mask-arch',
  oval: 'mask-oval',
  circle: 'mask-circle',
  rounded: 'mask-rounded',
  none: 'rounded-none',
};

/**
 * <Img slot="..."> resolves:
 * 1) site_images database row (or explicit src prop)
 * 2) static config URL in src/config/images.ts
 * 3) hand-drawn inline SVG <Illustration> fallback
 *
 * Supports masks (capsule, arch, oval, circle, rounded), blur-up transition,
 * fixed aspect ratio (zero layout shift), hover zoom 1.04, optional duotone overlay,
 * eager loading for LCP images and lazy elsewhere, width/height and real alt text.
 */
export const Img: React.FC<ImgProps> = ({
  slot,
  src,
  alt,
  mask,
  aspect,
  width,
  height,
  illustrationFallback,
  hoverZoom = true,
  duotone = false,
  priority = false,
  className = '',
  imgClassName = '',
}) => {
  const { siteImages } = useSiteData();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const slotConfig = slot ? IMAGE_SLOTS[slot] : undefined;
  const dbRow = slot ? siteImages[slot] : undefined;

  const resolvedUrl =
    src !== undefined
      ? src
      : dbRow?.image_url || slotConfig?.staticUrl || null;

  const resolvedAlt =
    alt ||
    dbRow?.alt ||
    slotConfig?.defaultAlt ||
    'Bbold Salon & Academy studio visual';

  const resolvedMask: ImageMask = mask || slotConfig?.mask || 'rounded';
  const resolvedAspect = aspect || slotConfig?.aspect || '4/5';
  const resolvedWidth = width || slotConfig?.width || 800;
  const resolvedHeight = height || slotConfig?.height || 1000;
  const resolvedIllustration: IllustrationKey =
    illustrationFallback || slotConfig?.illustration || 'comb-and-scissors';

  const showPhoto = Boolean(resolvedUrl) && !hasError;

  return (
    <div
      style={{ aspectRatio: resolvedAspect }}
      className={`relative overflow-hidden bg-[#E9DDD0]/75 border border-[#15110F]/10 select-none group ${MASK_CLASSES[resolvedMask]} ${className}`}
    >
      {showPhoto ? (
        <>
          {/* Blur-up placeholder layer */}
          <div
            aria-hidden="true"
            className={`absolute inset-0 bg-[#E9DDD0] transition-opacity duration-500 ${
              isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          />
          <img
            src={resolvedUrl!}
            alt={resolvedAlt}
            width={resolvedWidth}
            height={resolvedHeight}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding={priority ? 'sync' : 'async'}
            referrerPolicy="no-referrer"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`w-full h-full object-cover transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              hoverZoom ? 'group-hover:scale-[1.04]' : ''
            } ${
              isLoaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-md scale-[1.02]'
            } ${imgClassName}`}
          />
        </>
      ) : (
        <div
          role="img"
          aria-label={resolvedAlt}
          className={`w-full h-full flex items-center justify-center p-6 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            hoverZoom ? 'group-hover:scale-[1.04]' : ''
          }`}
        >
          <Illustration name={resolvedIllustration} className="w-full h-full max-w-[88%] max-h-[88%]" />
        </div>
      )}

      {duotone && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-20"
          style={{ backgroundColor: 'var(--room, #C4262E)' }}
        />
      )}
    </div>
  );
};
