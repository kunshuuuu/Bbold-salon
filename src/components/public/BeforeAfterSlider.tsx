import React, { useRef, useState } from 'react';
import { MoveHorizontal } from 'lucide-react';
import { Illustration } from '../visual/IllustrationKit';
import { SampleTag } from '../common/SampleTag';

interface BeforeAfterSliderProps {
  beforeUrl?: string | null;
  afterUrl?: string | null;
  title?: string | null;
  caption?: string | null;
  category?: string | null;
  detailNote?: string | null;
  isSample?: boolean;
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeUrl,
  afterUrl,
  title,
  caption,
  category,
  detailNote,
  isSample,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(52); // 0..100
  const [dragging, setDragging] = useState(false);

  const hasRealAfterPhoto =
    Boolean(afterUrl) && afterUrl !== 'ILLUSTRATION_AFTER';
  const hasRealBeforePhoto =
    Boolean(beforeUrl) && beforeUrl !== 'ILLUSTRATION_BEFORE';

  const updateFromClientX = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, Math.round(pct))));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    updateFromClientX(e.clientX);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setPosition((p) => Math.max(0, p - 5));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setPosition((p) => Math.min(100, p + 5));
    }
  };

  return (
    <div className={`relative select-none ${className}`}>
      <div
        ref={containerRef}
        data-cursor="drag"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden border border-[#15110F]/15 bg-[#E9DDD0] cursor-ew-resize touch-pan-y"
      >
        {/* AFTER Layer (Full width base) */}
        <div className="absolute inset-0 w-full h-full bg-[#F2C9C0]/45 flex items-center justify-center">
          {hasRealAfterPhoto ? (
            <img
              src={afterUrl!}
              alt={caption ? `After — ${caption}` : 'After transformation'}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#F2C9C0]/55 via-[#F5F0E8] to-[#E9DDD0]">
              <Illustration name="profile-long-waves" className="w-40 h-40" />
              <span className="mt-3 font-display font-bold text-lg text-[#15110F]">
                Finished Salon Look
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#15110F]/65 mt-1">
                Gloss, tone &amp; precision finish
              </span>
            </div>
          )}
          <span className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-[#15110F]/85 text-[#F5F0E8] font-mono text-[11px] uppercase tracking-wider">
            After
          </span>
        </div>

        {/* BEFORE Layer (Clipped to `position`%) */}
        <div
          className="absolute inset-0 h-full overflow-hidden bg-[#E9DDD0]"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          {hasRealBeforePhoto ? (
            <img
              src={beforeUrl!}
              alt={caption ? `Before — ${caption}` : 'Before transformation'}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#E9DDD0]">
              <Illustration name="comb-and-scissors" className="w-40 h-40 opacity-85" />
              <span className="mt-3 font-display font-bold text-lg text-[#15110F]">
                Before Consultation
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#15110F]/65 mt-1">
                Pre-service natural canvas
              </span>
            </div>
          )}
          <span className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-[#F5F0E8]/90 text-[#15110F] border border-[#15110F]/15 font-mono text-[11px] uppercase tracking-wider">
            Before
          </span>
        </div>

        {/* Vertical Divider Line + Accessible Handle */}
        <div
          style={{ left: `${position}%` }}
          className="absolute top-0 bottom-0 -translate-x-1/2 w-0.5 bg-[#FFFFFF] shadow-[0_0_12px_rgba(21,17,15,0.45)] z-20 pointer-events-none"
        />

        <div
          role="slider"
          tabIndex={0}
          aria-label="Comparison slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={position}
          onKeyDown={handleKeyDown}
          style={{ left: `${position}%` }}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-[#C4262E] text-[#F5F0E8] border-2 border-[#FFFFFF] shadow-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#15110F]"
        >
          <MoveHorizontal size={18} />
        </div>
      </div>

      {/* Caption & Details Card */}
      {(title || caption || category || detailNote || isSample) && (
        <div className="mt-3 p-4 rounded-2xl bg-[#F5F0E8] border-2 border-[#15110F] shadow-[3px_3px_0px_#15110F] space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {category && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#E8A317] border border-[#15110F] font-mono text-[10px] font-bold uppercase tracking-wider text-[#15110F]">
                  {category}
                </span>
              )}
              {detailNote && (
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#C4262E]">
                  {detailNote}
                </span>
              )}
            </div>
            <SampleTag isSample={isSample} />
          </div>
          {title && (
            <h3 className="font-display font-bold text-base sm:text-lg text-[#15110F]">
              {title}
            </h3>
          )}
          <p className="text-xs sm:text-sm text-[#15110F]/80 leading-relaxed">
            {caption || 'Drag slider or use Left/Right keys to compare'}
          </p>
        </div>
      )}
    </div>
  );
};
