import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  getPublicServices,
  getPublicStylists,
  getPublicCourses,
  getPublicTestimonials,
  getPublicGalleryItems,
  getPublicFaqs,
  setSampleContentDevOverride,
} from '../lib/content';
import { isSupabaseConfigured } from '../lib/supabase';
import { useSiteData } from '../context/SiteDataContext';
import {
  SITE_CONFIG,
  ROOM_SWATCHES,
  formatINR,
  buildWhatsAppUrl,
} from '../config/site';
import { IMAGE_SLOT_LIST } from '../config/images';
import { ALL_ILLUSTRATION_KEYS, Illustration } from '../components/visual/IllustrationKit';
import { Img } from '../components/visual/Img';
import { SampleTag } from '../components/common/SampleTag';
import type {
  RoomId,
  Service,
  Stylist,
  Course,
  Testimonial,
  GalleryItem,
  FaqItem,
} from '../types/database';

export const PhaseOnePreview: React.FC<{ pageLabel?: string }> = ({ pageLabel }) => {
  const location = useLocation();
  const { sampleEnabled, salonSettings, siteTexts } = useSiteData();
  const [activeRoom, setActiveRoom] = useState<RoomId>('hair');

  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingData(true);
      const [s, st, c, t, g, f] = await Promise.all([
        getPublicServices(),
        getPublicStylists(),
        getPublicCourses(),
        getPublicTestimonials(),
        getPublicGalleryItems(),
        getPublicFaqs(),
      ]);
      if (mounted) {
        setServices(s);
        setStylists(st);
        setCourses(c);
        setTestimonials(t);
        setGallery(g);
        setFaqs(f);
        setLoadingData(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [sampleEnabled]);

  const categories = Array.from(new Set(services.map((s) => s.category)));
  const supabaseReady = isSupabaseConfigured();

  return (
    <div data-room={activeRoom} className="min-h-screen bg-[#F5F0E8] text-[#15110F]">
      <Helmet>
        <title>
          {pageLabel
            ? `${pageLabel} — ${SITE_CONFIG.brandName}`
            : `${SITE_CONFIG.brandName} — Hair, Makeup, Nails, Skin & Academy in Mumbai`}
        </title>
      </Helmet>

      {/* Top Bar Contract: 3 zones (Brand wordmark | Nav links | Primary action) */}
      <header className="sticky top-0 z-[100] h-[72px] bg-[#F5F0E8]/95 border-b border-[#15110F]/10 px-6 md:px-12 flex items-center justify-between">
        <Link
          to="/"
          className="font-display font-extrabold text-2xl tracking-tight text-[#15110F]"
        >
          {SITE_CONFIG.shortBrandName}
        </Link>

        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#15110F]/80">
          <Link to="/services" className="hover:text-[#15110F] hover:underline underline-offset-4">
            Services
          </Link>
          <Link to="/team" className="hover:text-[#15110F] hover:underline underline-offset-4">
            Team
          </Link>
          <Link to="/bridal" className="hover:text-[#15110F] hover:underline underline-offset-4">
            Bridal
          </Link>
          <Link to="/gallery" className="hover:text-[#15110F] hover:underline underline-offset-4">
            Gallery
          </Link>
          <Link to="/academy" className="hover:text-[#15110F] hover:underline underline-offset-4">
            Academy
          </Link>
          <Link to="/about" className="hover:text-[#15110F] hover:underline underline-offset-4">
            About
          </Link>
          <Link to="/contact" className="hover:text-[#15110F] hover:underline underline-offset-4">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/book"
            className="px-5 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap"
            style={{
              backgroundColor: 'var(--room)',
              color: 'var(--room-ink)',
            }}
          >
            Reserve your appointment
          </Link>
        </div>
      </header>

      {/* Route Banner if visiting a placeholder route in Phase 1 */}
      {pageLabel && (
        <div className="bg-[#E9DDD0] border-b border-[#15110F]/10 px-6 md:px-12 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm">
            <span className="font-mono uppercase text-xs tracking-wider mr-2">
              Route Registered ({location.pathname})
            </span>
            <span>
              <strong>{pageLabel}</strong> is scaffolded and wired to{' '}
              <code className="font-mono text-xs">src/lib/content.ts</code>. Full page layout builds
              in its scheduled phase.
            </span>
          </div>
          <Link
            to="/"
            className="text-xs font-mono uppercase tracking-wider underline underline-offset-4"
          >
            Back to Phase 1 System Overview
          </Link>
        </div>
      )}

      {/* Hero / Phase 1 System Verification Header */}
      <section className="section-pad px-6 md:px-12 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8">
            <p className="text-mono-label text-[#15110F]/70 mb-4">
              01 / 08 · Phase 1 Architecture & Visual System Ready · {SITE_CONFIG.city}
            </p>
            <h1 className="text-hero-h1 mb-6">
              {siteTexts.hero.line1}{' '}
              <span className="text-outline-ink">{siteTexts.hero.line2}</span>
            </h1>
            <p className="text-lg max-w-[58ch] text-[#15110F]/85 mb-8">
              {siteTexts.hero.subheadline}
            </p>

            {/* Room Station Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-mono-label mr-2 text-[#15110F]/60">Active Station Room:</span>
              {(['hair', 'makeup', 'nails', 'skin', 'academy'] as RoomId[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setActiveRoom(r)}
                  className={`px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all cursor-pointer border ${
                    activeRoom === r
                      ? 'border-[#15110F] shadow-editorial font-semibold'
                      : 'border-[#15110F]/20 bg-[#E9DDD0]/50 hover:border-[#15110F]/50'
                  }`}
                  style={
                    activeRoom === r
                      ? { backgroundColor: ROOM_SWATCHES[r].hex, color: ROOM_SWATCHES[r].inkHex }
                      : undefined
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Hero Capsule Slots Preview */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-4">
            <Img slot="hero_hair" priority />
            <Img slot="hero_makeup" className="mt-6" />
          </div>
        </div>
      </section>

      {/* Live Content & Sample System Verification Panel */}
      <section className="section-pad bg-[#E9DDD0] px-6 md:px-12 border-y border-[#15110F]/10">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-mono-label text-[#15110F]/70 mb-2">
                01. Content & Sample System (src/lib/content.ts)
              </p>
              <h2 className="text-section-h2">
                Database & <span className="text-outline-ink">Sample Engine</span>
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setSampleContentDevOverride(!sampleEnabled)}
                className="px-4 py-2.5 rounded-full bg-[#15110F] text-[#F5F0E8] font-mono text-xs uppercase tracking-wider cursor-pointer hover:opacity-90 transition-opacity"
              >
                {sampleEnabled
                  ? 'Turn OFF Sample Content (Test Empty State)'
                  : 'Turn ON Sample Content'}
              </button>
              <a
                href={buildWhatsAppUrl('Hi Bbold Salon & Academy, I would like to reserve a visit.')}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-full border border-[#15110F]/30 text-xs font-mono uppercase tracking-wider hover:bg-[#15110F] hover:text-[#F5F0E8] transition-colors"
              >
                WhatsApp ({SITE_CONFIG.defaultPhoneDisplay})
              </a>
            </div>
          </div>

          {/* Live Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            <div className="p-5 rounded-[28px] bg-[#F5F0E8] border border-[#15110F]/10">
              <div className="font-mono text-3xl font-semibold">{services.length}</div>
              <div className="text-xs text-[#15110F]/70 mt-1">
                Active Services · {categories.length} Categories
              </div>
            </div>
            <div className="p-5 rounded-[28px] bg-[#F5F0E8] border border-[#15110F]/10">
              <div className="font-mono text-3xl font-semibold">{stylists.length}</div>
              <div className="text-xs text-[#15110F]/70 mt-1">Active Stylists</div>
            </div>
            <div className="p-5 rounded-[28px] bg-[#F5F0E8] border border-[#15110F]/10">
              <div className="font-mono text-3xl font-semibold">{courses.length}</div>
              <div className="text-xs text-[#15110F]/70 mt-1">Academy Courses</div>
            </div>
            <div className="p-5 rounded-[28px] bg-[#F5F0E8] border border-[#15110F]/10">
              <div className="font-mono text-3xl font-semibold">{testimonials.length}</div>
              <div className="text-xs text-[#15110F]/70 mt-1">Client Testimonials</div>
            </div>
            <div className="p-5 rounded-[28px] bg-[#F5F0E8] border border-[#15110F]/10">
              <div className="font-mono text-3xl font-semibold">{gallery.length}</div>
              <div className="text-xs text-[#15110F]/70 mt-1">Gallery & Before/After</div>
            </div>
            <div className="p-5 rounded-[28px] bg-[#F5F0E8] border border-[#15110F]/10">
              <div className="font-mono text-3xl font-semibold">{faqs.length}</div>
              <div className="text-xs text-[#15110F]/70 mt-1">FAQ Entries</div>
            </div>
          </div>

          {/* Connection & Salon Settings Summary */}
          <div className="p-6 rounded-[28px] bg-[#F5F0E8] border border-[#15110F]/10 flex flex-wrap items-center justify-between gap-4 mb-10">
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-semibold">Supabase Connection:</span>{' '}
                {supabaseReady ? (
                  <span className="font-mono text-xs text-[#1E7B4F]">
                    Connected via VITE_SUPABASE_URL
                  </span>
                ) : (
                  <span className="font-mono text-xs text-[#B7791F]">
                    Using local seed fallback until .env is configured & SQL scripts are run
                  </span>
                )}
              </div>
              <div className="text-[#15110F]/75">
                <span>Salon Name: {salonSettings.salon_name}</span>
                <span className="mx-2">·</span>
                <span>Address: {salonSettings.salon_address}</span>
                <span className="mx-2">·</span>
                <span className="font-mono text-xs">
                  Slot interval: {salonSettings.slot_interval_minutes}m · Notice:{' '}
                  {salonSettings.booking_notice_hours}h
                </span>
              </div>
            </div>
          </div>

          {/* Sample Stylists, Courses & Testimonials Preview (Always showing SAMPLE tag when is_sample=true) */}
          {loadingData ? (
            <p className="font-mono text-sm">Loading content from src/lib/content.ts...</p>
          ) : services.length === 0 && stylists.length === 0 ? (
            <div className="p-10 rounded-[28px] bg-[#F5F0E8] border border-[#15110F]/15 text-center">
              <p className="font-display text-2xl font-bold mb-2">
                Sample content is currently hidden
              </p>
              <p className="text-sm text-[#15110F]/75 mb-4">
                When VITE_SHOW_SAMPLE_CONTENT is false, all rows with is_sample = true are excluded
                from public reads and /book.
              </p>
              <button
                type="button"
                onClick={() => setSampleContentDevOverride(true)}
                className="px-5 py-2.5 rounded-full bg-[#C4262E] text-white text-sm font-medium cursor-pointer"
              >
                Re-enable Sample Content
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sample Stylist Card */}
              {stylists[0] && (
                <div className="p-6 rounded-[28px] bg-[#F5F0E8] border border-[#15110F]/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="text-mono-label text-[#15110F]/60">Stylist Card</span>
                      <SampleTag isSample={stylists[0].is_sample} />
                    </div>
                    <h3 className="font-display text-2xl font-bold">{stylists[0].name}</h3>
                    <p className="text-sm text-[#15110F]/70 mb-3">{stylists[0].title}</p>
                    <p className="text-sm text-[#15110F]/85 mb-4">{stylists[0].bio}</p>
                  </div>
                  <div className="text-xs font-mono text-[#15110F]/70">
                    {stylists[0].specialties.join(' · ')}
                  </div>
                </div>
              )}

              {/* Sample Course Card */}
              {courses[0] && (
                <div className="p-6 rounded-[28px] bg-[#F5F0E8] border border-[#15110F]/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="text-mono-label text-[#15110F]/60">Academy Course Card</span>
                      <SampleTag isSample={courses[0].is_sample} />
                    </div>
                    <h3 className="font-display text-2xl font-bold">{courses[0].name}</h3>
                    <p className="font-mono text-sm text-[#C4262E] mt-1 mb-3">
                      {courses[0].duration_text} · {formatINR(courses[0].fee)}
                    </p>
                    <p className="text-sm text-[#15110F]/85 whitespace-pre-line line-clamp-4">
                      {courses[0].description}
                    </p>
                  </div>
                </div>
              )}

              {/* Sample Testimonial Card */}
              {testimonials[0] && (
                <div className="p-6 rounded-[28px] bg-[#F5F0E8] border border-[#15110F]/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="text-mono-label text-[#15110F]/60">Testimonial Card</span>
                      <SampleTag isSample={testimonials[0].is_sample} />
                    </div>
                    <p className="font-display text-xl leading-snug mb-4">
                      “{testimonials[0].quote}”
                    </p>
                  </div>
                  <div className="font-mono text-xs text-[#15110F]/75">
                    {testimonials[0].name} · {testimonials[0].service_label}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* All 14 Hand-Drawn Illustrations Showcase */}
      <section className="section-pad px-6 md:px-12 max-w-[1440px] mx-auto">
        <div className="mb-10">
          <p className="text-mono-label text-[#15110F]/70 mb-2">
            02. Hand-Drawn SVG Illustration Kit (14 / 14 Artworks)
          </p>
          <h2 className="text-section-h2">
            1.5px Ink & Crimson <span className="text-outline-crimson">Line Language</span>
          </h2>
          <p className="text-sm text-[#15110F]/75 mt-2 max-w-[60ch]">
            Every illustration draws itself on entering view (1200ms inout, max 3 animating at
            once) and serves as the automatic fallback for image slots until salon photography is
            uploaded in the Admin Dashboard.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-5">
          {ALL_ILLUSTRATION_KEYS.map((key) => (
            <div
              key={key}
              className="p-4 rounded-[28px] bg-[#E9DDD0]/60 border border-[#15110F]/10 flex flex-col items-center"
            >
              <div className="w-full aspect-[4/5] flex items-center justify-center">
                <Illustration name={key} />
              </div>
              <span className="font-mono text-[11px] text-[#15110F]/80 mt-2 text-center">
                {key}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Image Slot System (<Img slot="...">) */}
      <section className="section-pad bg-[#15110F] text-[#F5F0E8] px-6 md:px-12">
        <div className="max-w-[1440px] mx-auto">
          <p className="text-mono-label text-[#F2C9C0] mb-2">
            03. Slot-Based Image System (src/config/images.ts · {IMAGE_SLOT_LIST.length} Slots)
          </p>
          <h2 className="text-section-h2 mb-8">
            Masks, Aspect Lock & <span className="text-outline-paper">Live Overrides</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <Img slot="station_1" />
              <p className="font-mono text-xs mt-3 text-[#F5F0E8]/80">
                slot=&quot;station_1&quot; · arch (3:4)
              </p>
            </div>
            <div>
              <Img slot="intro_detail" />
              <p className="font-mono text-xs mt-3 text-[#F5F0E8]/80">
                slot=&quot;intro_detail&quot; · circle (1:1)
              </p>
            </div>
            <div>
              <Img slot="bridal_hero" />
              <p className="font-mono text-xs mt-3 text-[#F5F0E8]/80">
                slot=&quot;bridal_hero&quot; · arch (3:4)
              </p>
            </div>
            <div>
              <Img slot="cat_nails" />
              <p className="font-mono text-xs mt-3 text-[#F5F0E8]/80">
                slot=&quot;cat_nails&quot; · rounded (4:5)
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
