import React from 'react';
import { isSampleContentEnabled } from '../../lib/content';

interface SampleTagProps {
  isSample?: boolean;
  className?: string;
}

/**
 * Small mono "SAMPLE" tag displayed on sample rows when VITE_SHOW_SAMPLE_CONTENT is active.
 */
export const SampleTag: React.FC<SampleTagProps> = ({ isSample, className = '' }) => {
  if (!isSample || !isSampleContentEnabled()) return null;

  return (
    <span
      title="Sample row from seed.sql — edit or remove in Admin before launch"
      className={`inline-flex items-center px-1.5 py-0.5 font-mono text-[10px] leading-none uppercase tracking-[0.1em] border border-[#15110F]/25 bg-[#E9DDD0]/80 text-[#15110F] rounded select-none whitespace-nowrap shrink-0 ${className}`}
    >
      SAMPLE
    </span>
  );
};
