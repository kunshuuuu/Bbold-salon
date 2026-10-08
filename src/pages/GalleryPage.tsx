import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  Calendar,
  SplitSquareHorizontal,
} from 'lucide-react';
import { getPublicGalleryItems } from '../lib/content';
import { Img } from '../components/visual/Img';
import { SampleTag } from '../components/common/SampleTag';
import { BeforeAfterSlider } from '../components/public/BeforeAfterSlider';
import { DieCutSticker } from '../components/public/GlobalEffects';
import type { GalleryItem } from '../types/database';

const GALLERY_CATS = ['All', 'Hair', 'Hair Colour', 'Makeup', 'Bridal', 'Nails', 'Skin'] as const;

export const GalleryPage: React.FC = () => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [beforeAfterOnly, setBeforeAfterOnly] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadGallery = () => {
      getPublicGalleryItems().then((rows) => {
        if (!mounted) return;
        setItems(rows);
        setLoading(false);
      });
    };
    loadGallery();
    window.addEventListener('bbold-sample-toggle', loadGallery);
    return () => {
      mounted = false;
      window.removeEventListener('bbold-sample-toggle', loadGallery);
    };
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (
        activeCategory !== 'All' &&
        (item.category || '').toLowerCase() !== activeCategory.toLowerCase()
      ) {
        return false;
      }
      if (beforeAfterOnly && !item.before_image_url) {
        return false;
      }
      return true;
    });
  }, [items, activeCategory, beforeAfterOnly]);

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIdx(null);
      } else if (e.key === 'ArrowRight') {
        setLightboxIdx((prev) =>
          prev === null ? null : (prev + 1) % filtered.length
        );
      } else if (e.key === 'ArrowLeft') {
        setLightboxIdx((prev) =>
          prev === null ? null : (prev - 1 + filtered.length) % filtered.length
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIdx, filtered.length]);

  const currentLightboxItem =
    lightboxIdx !== null && filtered[lightboxIdx] ? filtered[lightboxIdx] : null;

  return (
    <div className="py-12 lg:py-20 max-w-[1440px] mx-auto px-4 sm:px-8 space-y-12">
      <Helmet>
        <title>Lookbook &amp; Transformations Gallery — Bbold Salon &amp; Academy Mumbai</title>
        <meta
          name="description"
          content="Browse hair colour, balayage, bridal makeup, nail art, skin facials, and before-and-after transformations from Bbold Salon & Academy in Mumbai."
        />
      </Helmet>

      {/* Header */}
      <div className="space-y-3 pb-8 border-b-[2.5px] border-[#15110F] flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8A317] border-2 border-[#15110F] font-mono text-xs font-bold uppercase tracking-widest text-[#15110F]">
              <Sparkles size={12} />
              <span>Salon &amp; Academy Lookbook</span>
            </div>
            <DieCutSticker variant="nail-polish" rotate={-4} />
            <DieCutSticker variant="lipstick" rotate={5} />
          </div>
          <h1 className="font-display font-extrabold text-h1 text-[#15110F]">
            Lookbook &amp; Transformations
          </h1>
          <p className="text-base text-[#15110F]/80 max-w-2xl">
            Filter by station or toggle Before &amp; After comparisons. Click any look to inspect
            details or book a similar style.
          </p>
        </div>
        <DieCutSticker variant="stamp" rotate={-6} />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b-[2.5px] border-[#15110F]">
        <div className="flex flex-wrap items-center gap-2">
          {GALLERY_CATS.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setActiveCategory(cat);
                  setLightboxIdx(null);
                }}
                className={`px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider transition-colors ${
                  active
                    ? 'bg-[#C4262E] text-[#F5F0E8] font-semibold'
                    : 'bg-[#E9DDD0]/70 text-[#15110F] hover:bg-[#E9DDD0]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setBeforeAfterOnly((prev) => !prev);
            setLightboxIdx(null);
          }}
          aria-pressed={beforeAfterOnly}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider border transition-colors ${
            beforeAfterOnly
              ? 'bg-[#15110F] text-[#F5F0E8] border-[#15110F]'
              : 'bg-[#F5F0E8] text-[#15110F] border-[#15110F]/20 hover:bg-[#E9DDD0]'
          }`}
        >
          <SplitSquareHorizontal size={14} />
          <span>Before &amp; After only</span>
        </button>
      </div>

      {/* Asymmetric 12-Col Editorial Grid */}
      {loading ? (
        <div className="py-16 text-center font-mono text-xs uppercase tracking-widest text-[#15110F]/60">
          Loading gallery...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[#E9DDD0] rounded-3xl border border-[#15110F]/10">
          <p className="font-display text-xl font-bold text-[#15110F]">
            No gallery items match this filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('All');
              setBeforeAfterOnly(false);
            }}
            className="px-4 py-2 rounded-full bg-[#15110F] text-[#F5F0E8] font-mono text-xs uppercase tracking-wider"
          >
            Show All Looks
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {filtered.map((item, idx) => {
            const colSpan =
              idx % 5 === 0
                ? 'md:col-span-7'
                : idx % 5 === 1
                ? 'md:col-span-5'
                : 'md:col-span-4';

            return (
              <div
                key={item.id}
                onClick={() => setLightboxIdx(idx)}
                data-cursor="view"
                className={`${colSpan} group cursor-pointer rounded-3xl bg-[#E9DDD0] border border-[#15110F]/15 p-3.5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all`}
              >
                <div className="relative">
                  <Img
                    src={item.image_url === 'ILLUSTRATION_AFTER' ? null : item.image_url}
                    alt={item.caption || 'Bbold salon look'}
                    aspect={idx % 5 === 0 ? '16/10' : '4/5'}
                    mask={idx % 3 === 0 ? 'arch' : 'rounded'}
                    hoverZoom
                    illustrationFallback={
                      item.category === 'Makeup'
                        ? 'lipstick-and-mirror'
                        : item.category === 'Bridal'
                        ? 'bridal-veil-and-flowers'
                        : item.category === 'Nails'
                        ? 'hand-with-nails'
                        : item.category === 'Skin'
                        ? 'facial-jar-and-leaf'
                        : 'hair-dryer'
                    }
                  />
                  {item.before_image_url && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#15110F]/85 text-[#F5F0E8] font-mono text-[10px] uppercase tracking-wider">
                      Before / After
                    </span>
                  )}
                </div>

                <div className="mt-3 px-1 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#C4262E]">
                      {item.category || 'Salon'}
                    </span>
                    <h2 className="font-display font-bold text-base text-[#15110F] line-clamp-1">
                      {item.caption || 'Styled at Bbold Salon & Academy'}
                    </h2>
                  </div>
                  <SampleTag isSample={item.is_sample} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {currentLightboxItem && lightboxIdx !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gallery Lightbox"
          className="fixed inset-0 z-[300] bg-[#15110F]/95 text-[#F5F0E8] flex items-center justify-center p-4 sm:p-8 overflow-y-auto"
        >
          <button
            type="button"
            onClick={() => setLightboxIdx(null)}
            aria-label="Close lightbox"
            className="fixed top-5 right-5 z-20 w-11 h-11 rounded-full bg-[#F5F0E8]/15 hover:bg-[#C4262E] text-[#F5F0E8] flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>

          <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto">
            <div className="lg:col-span-7">
              {currentLightboxItem.before_image_url ? (
                <BeforeAfterSlider
                  beforeUrl={currentLightboxItem.before_image_url}
                  afterUrl={currentLightboxItem.image_url}
                  caption={currentLightboxItem.caption}
                  category={currentLightboxItem.category}
                  isSample={currentLightboxItem.is_sample}
                />
              ) : (
                <Img
                  src={
                    currentLightboxItem.image_url === 'ILLUSTRATION_AFTER'
                      ? null
                      : currentLightboxItem.image_url
                  }
                  alt={currentLightboxItem.caption || 'Gallery look'}
                  aspect="4/5"
                  mask="rounded"
                  illustrationFallback="hair-dryer"
                  className="w-full"
                />
              )}
            </div>

            <div className="lg:col-span-5 space-y-5">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#C4262E] text-[#F5F0E8] font-mono text-xs uppercase tracking-wider">
                  {currentLightboxItem.category || 'Salon Look'}
                </span>
                <SampleTag isSample={currentLightboxItem.is_sample} />
              </div>

              <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F0E8]">
                {currentLightboxItem.caption || 'Styled at Bbold Mumbai'}
              </h3>

              <p className="text-sm text-[#F5F0E8]/75">
                Want a tailored version of this look? Bring this reference into your consultation
                or book directly online.
              </p>

              <div className="pt-2">
                <Link
                  to="/book"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#C4262E] text-[#F5F0E8] font-semibold text-sm hover:bg-[#F5F0E8] hover:text-[#15110F] transition-colors"
                >
                  <Calendar size={16} />
                  <span>Book a similar look →</span>
                </Link>
              </div>

              <div className="pt-6 border-t border-[#F5F0E8]/15 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIdx(
                      (lightboxIdx - 1 + filtered.length) % filtered.length
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#F5F0E8]/25 text-xs font-mono uppercase tracking-wider hover:bg-[#F5F0E8]/10"
                >
                  <ChevronLeft size={15} />
                  <span>Prev</span>
                </button>
                <span className="font-mono text-xs text-[#F5F0E8]/60">
                  {lightboxIdx + 1} / {filtered.length}
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxIdx((lightboxIdx + 1) % filtered.length)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#F5F0E8]/25 text-xs font-mono uppercase tracking-wider hover:bg-[#F5F0E8]/10"
                >
                  <span>Next</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
