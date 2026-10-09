import React from 'react';
import { useSiteData } from '../../context/SiteDataContext';

interface BrandLogoProps {
  /** 'dark' renders #15110F logo for light backgrounds (header, drawer, booking); 'light' renders #FBF7F2 logo for dark backgrounds (footer, preloader, admin sidebar) */
  variant?: 'dark' | 'light';
  /** Height utility class for the logo image */
  sizeClass?: string;
  className?: string;
  /** Optional badge/subtitle next to the logo (e.g., "Booking Desk", "Admin") */
  badge?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'dark',
  sizeClass = 'h-11 sm:h-12',
  className = '',
  badge,
}) => {
  const { siteImages } = useSiteData();
  const customLogoUrl = siteImages?.['brand_logo']?.url;

  const src = customLogoUrl
    ? customLogoUrl
    : variant === 'light'
      ? '/bbold-logo-light.png'
      : '/bbold-logo.png';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <img
        src={src}
        alt="BBOLD Salon & Academy"
        className={`${sizeClass} w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03]`}
        loading="eager"
        decoding="async"
      />
      {badge && (
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border ${
            variant === 'light'
              ? 'border-[#FBF7F2]/25 text-[#FBF7F2]/80 bg-[#FBF7F2]/10'
              : 'border-[#15110F]/20 text-[#15110F]/75 bg-[#15110F]/5'
          }`}
        >
          {badge}
        </span>
      )}
    </div>
  );
};
