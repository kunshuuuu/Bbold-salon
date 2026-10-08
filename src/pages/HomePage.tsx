import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Printer,
  Sparkles,
  Star,
} from 'lucide-react';
import {
  getPublicServices,
  getPublicStylists,
  getPublicCourses,
  getPublicTestimonials,
  getPublicGalleryItems,
} from '../lib/content';
import { formatINR } from '../config/site';
import { useSiteData } from '../context/SiteDataContext';
import { Img } from '../components/visual/Img';
import { Illustration } from '../components/visual/IllustrationKit';
import { SampleTag } from '../components/common/SampleTag';
import {
  MagneticButton,
  MarqueeBand,
  CutLine,
  DieCutSticker,
  CountUpNumber,
} from '../components/public/GlobalEffects';
import { BeforeAfterSlider } from '../components/public/BeforeAfterSlider';
import type {
  Course,
  GalleryItem,
  ImageMask,
  RoomId,
  Service,
  Stylist,
  Testimonial,
} from '../types/database';
import type { ImageSlotId } from '../config/images';

interface OutletRoomContext {
  activeRoom: RoomId;
  setActiveRoom: (room: RoomId) => void;
}

const HERO_CARDS: {
  id: RoomId;
  slot: ImageSlotId;
  label: string;
  tag: string;
  mask: ImageMask;
  rotate: number;
}[] = [
  {
    id: 'hair',
    slot: 'hero_hair',
    label: 'Hair Studio',
    tag: 'Cut · Balayage · Keratin',
    mask: 'arch',
    rotate: -4,
  },
  {
    id: 'makeup',
    slot: 'hero_makeup',
    label: 'Makeup & Bridal',
    tag: 'Party · HD · Airbrush',
    mask: 'rounded',
    rotate: 3,
  },
  {
    id: 'nails',
    slot: 'hero_nails',
    label: 'Nail Bar',
    tag: 'Gel · Extensions · Art',
    mask: 'circle',
    rotate: -2,
  },
  {
    id: 'skin',
    slot: 'hero_skin',
    label: 'Skin & Facials',
    tag: 'Clean-Up · Glow · Peel',
    mask: 'oval',
    rotate: 4,
  },
];

const SIX_STATIONS: {
  num: string;
  title: string;
  categoryKey: string;
  room: RoomId;
  slot: ImageSlotId;
  description: string;
  linkTo: string;
  linkLabel: string;
}[] = [
  {
    num: '01',
    title: 'Hair Salon',
    categoryKey: 'Hair',
    room: 'hair',
    slot: 'cat_hair',
    description:
      'Precision cuts, dimensional balayage, root touch-ups, keratin smoothing, and restorative hair spas.',
    linkTo: '/services?category=Hair',
    linkLabel: 'Explore Hair Menu →',
  },
  {
    num: '02',
    title: "Men's Grooming",
    categoryKey: "Men's Grooming",
    room: 'hair',
    slot: 'cat_men',
    description:
      'Sharp haircut & styling, beard trim and hot-towel shave, express detan, and grey blending.',
    linkTo: '/services?category=Men',
    linkLabel: "Explore Men's Menu →",
  },
  {
    num: '03',
    title: 'Nail Studio',
    categoryKey: 'Nails',
    room: 'nails',
    slot: 'cat_nails',
    description:
      'Gel polish manicures, soft-gel & acrylic extensions, custom nail art, and spa pedicures.',
    linkTo: '/services?category=Nails',
    linkLabel: 'Explore Nail Studio →',
  },
  {
    num: '04',
    title: 'Makeup & Bridal',
    categoryKey: 'Makeup',
    room: 'makeup',
    slot: 'cat_makeup',
    description:
      'Cocktail & party glam, pre-bridal trials, HD & airbrush bridal styling, and saree draping.',
    linkTo: '/bridal',
    linkLabel: 'Explore Bridal Studio →',
  },
  {
    num: '05',
    title: 'Skin & Facials',
    categoryKey: 'Skin',
    room: 'skin',
    slot: 'cat_skin',
    description:
      'Classic clean-ups, brightening & hydrating facials, chemical peels, waxing, and threading.',
    linkTo: '/services?category=Skin',
    linkLabel: 'Explore Skin Menu →',
  },
  {
    num: '06',
    title: 'Bbold Academy',
    categoryKey: 'Academy',
    room: 'academy',
    slot: 'academy_hero',
    description:
      'Hands-on professional courses in hairdressing, bridal makeup, nail extensions, and cosmetology.',
    linkTo: '/academy',
    linkLabel: 'Explore Courses →',
  },
];

export const HomePage: React.FC = () => {
  const { setActiveRoom } = useOutletContext<OutletRoomContext>();
  const { siteTexts, salonSettings, businessHours } = useSiteData();

  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  const [focusedHeroCard, setFocusedHeroCard] = useState<RoomId>('hair');
  const [menuCategory, setMenuCategory] = useState<string>('Hair');
  const [hoveredService, setHoveredService] = useState<Service | null>(null);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const stationsTrackRef = useRef<HTMLDivElement | null>(null);

  const scrollStations = (direction: 'left' | 'right') => {
    const track = stationsTrackRef.current;
    if (!track) return;
    const step = Math.min(680, Math.round(track.clientWidth * 0.82));
    track.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getPublicServices(),
      getPublicStylists(),
      getPublicCourses(),
      getPublicTestimonials(),
      getPublicGalleryItems(),
    ]).then(([srv, sty, crs, tst, gal]) => {
      if (!mounted) return;
      setServices(srv);
      setStylists(sty);
      setCourses(crs);
      setTestimonials(tst);
      setGallery(gal);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const marqueePhrases = useMemo(() => {
    return siteTexts.marquee?.phrases || [];
  }, [siteTexts]);

  const availabilityPillText = useMemo(() => {
    const now = new Date();
    const dow = now.getDay();
    const todayRule = businessHours.find((b) => b.weekday === dow);
    if (todayRule && todayRule.is_open) {
      return `Open today · Closes ${todayRule.end_time.slice(0, 5)} · Book online`;
    }
    return 'Online booking open · Reserve your chair';
  }, [businessHours]);

  // Menu teaser services for selected category (up to 6, prioritizing featured)
  const teaserServices = useMemo(() => {
    const filtered = services.filter((s) =>
      s.category.toLowerCase().includes(menuCategory.toLowerCase())
    );
    const sorted = [...filtered].sort((a, b) => {
      if (Boolean(b.is_featured) !== Boolean(a.is_featured)) {
        return b.is_featured ? 1 : -1;
      }
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
    return sorted.slice(0, 6);
  }, [services, menuCategory]);

  // First Before/After item in gallery
  const beforeAfterItem = useMemo(() => {
    return gallery.find((g) => Boolean(g.before_image_url)) || gallery[0] || null;
  }, [gallery]);

  // 3 lookbook teaser items
  const lookbookTeaser = useMemo(() => {
    return gallery.slice(0, 3);
  }, [gallery]);

  // JSON-LD HairSalon structured data (omitting unconfirmed/TODO fields)
  const jsonLd = useMemo(() => {
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'HairSalon',
      name: salonSettings.salon_name || 'Bbold Salon & Academy',
      description:
        'Beauty and styling salon in Mumbai offering hair, makeup, nails, and skin services, plus a professional training academy.',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Mumbai',
        addressRegion: 'MH',
        addressCountry: 'IN',
        ...(salonSettings.salon_address &&
        !salonSettings.salon_address.startsWith('TODO')
          ? { streetAddress: salonSettings.salon_address }
          : {}),
      },
    };
    if (salonSettings.salon_phone) schema.telephone = salonSettings.salon_phone;
    if (
      salonSettings.salon_email &&
      !salonSettings.salon_email.startsWith('TODO')
    ) {
      schema.email = salonSettings.salon_email;
    }
    return JSON.stringify(schema);
  }, [salonSettings]);

  const activeTestimonial =
    testimonials.length > 0 ? testimonials[quoteIdx % testimonials.length] : null;

  return (
    <div>
      <Helmet>
        <title>Bbold Salon &amp; Academy — Hair, Makeup, Nails, Skin &amp; Academy in Mumbai</title>
        <meta
          name="description"
          content="Beauty and styling salon in Mumbai offering hair, makeup, nails, and skin services, plus a professional training academy. Real-time online appointment booking."
        />
        <script type="application/ld+json">{jsonLd}</script>
      </Helmet>

      {/* =====================================================================
          SECTION 1: HERO (Big Dual-Color Red & Black Title with Shadows, Black Border & Left-to-Right Hover Underline)
         ===================================================================== */}
      <section className="relative min-h-[90vh] flex items-center py-12 lg:py-20 overflow-hidden border-b-[2.5px] border-[#15110F]">
        <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left 7 Columns */}
          <div className="lg:col-span-7 space-y-6 relative z-10">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E8A317] border-2 border-[#15110F] shadow-[3px_3px_0px_#15110F] font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#15110F]">
                <Sparkles size={13} className="text-[#C4262E]" />
                <span>Salon · Academy · Mumbai</span>
              </div>
              <DieCutSticker variant="scissors" rotate={-4} />
              <DieCutSticker variant="blowdryer" rotate={5} />
            </div>

            {/* Big Hero Title Card with Visible Black Border, Red & Black Dual-Color Text, Shadows & Left-to-Right Hover Underlines */}
            <div className="group/title relative p-5 sm:p-7 rounded-3xl bg-[#F5F0E8] border-[3px] border-[#15110F] shadow-[6px_6px_0px_#15110F] cursor-pointer transition-transform duration-300 hover:-translate-y-0.5">
              <div className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#15110F] mb-2 flex items-center justify-between">
                <span>BBOLD SALON &amp; ACADEMY · MUMBAI</span>
                <span className="px-2 py-0.5 rounded bg-[#C4262E] text-[#F5F0E8] border border-[#15110F]">
                  4 STATIONS + ACADEMY
                </span>
              </div>

              <h1 className="font-display font-black text-[clamp(2.8rem,6.2vw,5.4rem)] leading-[1.02] tracking-[-0.035em] space-y-2">
                {/* Line 1: Black + Red with Black Stroke & Shadow + Left-to-Right Hover Underline */}
                <span className="block relative w-fit">
                  <span className="text-[#15110F] drop-shadow-[3px_3px_0px_#E8A317]">
                    BOLD{' '}
                  </span>
                  <span className="text-[#C4262E] [-webkit-text-stroke:1.5px_#15110F] drop-shadow-[4px_4px_0px_#15110F]">
                    HAIR &amp; GLAM.
                  </span>
                  <span
                    aria-hidden="true"
                    className="block h-[5px] bg-[#15110F] rounded-full origin-left scale-x-0 group-hover/title:scale-x-100 transition-transform duration-500 ease-out mt-1"
                  />
                </span>

                {/* Line 2: Red + Black with Black Stroke & Shadow + Left-to-Right Hover Underline */}
                <span className="block relative w-fit">
                  <span className="text-[#C4262E] [-webkit-text-stroke:1.5px_#15110F] drop-shadow-[4px_4px_0px_#15110F]">
                    SHARP{' '}
                  </span>
                  <span className="text-[#15110F] drop-shadow-[3px_3px_0px_#F2C9C0]">
                    SKIN &amp; NAILS.
                  </span>
                  <span
                    aria-hidden="true"
                    className="block h-[5px] bg-[#C4262E] border border-[#15110F] rounded-full origin-left scale-x-0 group-hover/title:scale-x-100 transition-transform duration-500 delay-75 ease-out mt-1"
                  />
                </span>

                {/* Line 3: Black + Red Subtitle Banner */}
                <span className="block relative w-fit text-[clamp(1.6rem,3.4vw,2.75rem)] pt-1">
                  <span className="text-[#15110F] drop-shadow-[2px_2px_0px_#E9DDD0]">
                    {siteTexts.hero?.line1 || 'Look like you'}{' '}
                  </span>
                  <span className="italic text-[#C4262E] [-webkit-text-stroke:1px_#15110F] drop-shadow-[3px_3px_0px_#15110F]">
                    {siteTexts.hero?.line2 || 'meant it.'}
                  </span>
                  <span
                    aria-hidden="true"
                    className="block h-[4px] bg-[#15110F] rounded-full origin-left scale-x-0 group-hover/title:scale-x-100 transition-transform duration-500 delay-150 ease-out mt-1"
                  />
                </span>
              </h1>
            </div>

            <p className="text-base sm:text-lg text-[#15110F]/90 font-medium max-w-[56ch] leading-relaxed">
              {siteTexts.hero?.subheadline ||
                'Four dedicated stations for hair, makeup, nails, and skin—plus a hands-on training academy in Mumbai.'}
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <MagneticButton cursorLabel="book">
                <Link
                  to="/book"
                  className="inline-flex items-center gap-3 px-7 py-4 rounded-full bg-[#C4262E] text-[#F5F0E8] border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F] font-display font-bold text-base hover:bg-[#15110F] transition-colors"
                >
                  <span>{siteTexts.hero?.primary_cta || 'Reserve your appointment'} →</span>
                </Link>
              </MagneticButton>

              <Link
                to="/services"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-full border-2 border-[#15110F] bg-[#F5F0E8] hover:bg-[#E8A317] text-sm font-bold text-[#15110F] shadow-[3px_3px_0px_#15110F] transition-colors"
              >
                <span>{siteTexts.hero?.secondary_cta || 'See services'}</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            {/* Live Availability Pill */}
            <div className="pt-2 flex items-center gap-2.5 text-xs font-mono font-bold text-[#15110F]">
              <span className="w-3 h-3 rounded-full bg-[#2E6F40] border border-[#15110F] animate-pulse" />
              <span>{availabilityPillText}</span>
            </div>
          </div>

          {/* Right 5 Columns: Interactive 4-Card Stack + Spinning Circular Stamp Sticker */}
          <div className="lg:col-span-5 relative">
            {/* Top-right floating sticker */}
            <div className="hidden sm:block absolute -top-6 -right-4 z-30">
              <DieCutSticker variant="nail-polish" rotate={8} />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-5 relative">
              {HERO_CARDS.map((card) => {
                const isFocused = focusedHeroCard === card.id;
                return (
                  <div
                    key={card.id}
                    onMouseEnter={() => {
                      setFocusedHeroCard(card.id);
                      setActiveRoom(card.id);
                    }}
                    onClick={() => {
                      setFocusedHeroCard(card.id);
                      setActiveRoom(card.id);
                    }}
                    style={{
                      transform: isFocused
                        ? 'scale(1.03) translateY(-4px)'
                        : `rotate(${card.rotate}deg)`,
                      zIndex: isFocused ? 20 : 10,
                    }}
                    className="group cursor-pointer transition-all duration-300 bg-[#E9DDD0] p-2.5 rounded-3xl border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F] hover:shadow-[6px_6px_0px_#15110F]"
                  >
                    <Img
                      slot={card.slot}
                      mask={card.mask}
                      aspect="4/5"
                      priority
                      hoverZoom
                      className="w-full"
                    />
                    <div className="mt-2.5 px-1 flex items-center justify-between gap-1">
                      <div>
                        <div className="font-display font-bold text-sm text-[#15110F]">
                          {card.label}
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-wider text-[#15110F]/75">
                          {card.tag}
                        </div>
                      </div>
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-[#15110F]"
                        style={{
                          backgroundColor:
                            card.id === 'hair'
                              ? '#C4262E'
                              : card.id === 'makeup'
                              ? '#F2C9C0'
                              : card.id === 'nails'
                              ? '#E8A317'
                              : '#9AAA94',
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Bottom-left circular stamp sticker with continuously looping circular text */}
              <div className="hidden sm:block absolute -bottom-8 -left-8 z-30">
                <DieCutSticker variant="stamp" rotate={-8} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: SINGLE YELLOW MARQUEE STRIP (Right-to-Left Infinite Loop)
         ===================================================================== */}
      <MarqueeBand phrases={marqueePhrases} />

      {/* =====================================================================
          SECTION 3: INTRO / PHILOSOPHY (12-column asymmetric + live DB counts)
         ===================================================================== */}
      <section className="py-20 lg:py-28 border-b-[2.5px] border-[#15110F]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Columns 1..5: Arch image + overlapping circle detail */}
            <div className="lg:col-span-5 relative">
              <div className="w-4/5">
                <Img
                  slot="intro_main"
                  mask="arch"
                  aspect="4/5"
                  hoverZoom
                  className="border-2 border-[#15110F] shadow-[5px_5px_0px_#15110F]"
                />
              </div>
              <div className="w-44 sm:w-52 absolute -bottom-6 right-2 sm:right-4 p-2 rounded-full bg-[#F5F0E8] border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F]">
                <Img slot="intro_detail" mask="circle" aspect="1/1" />
              </div>
              <div className="absolute -top-5 right-8 z-20">
                <DieCutSticker variant="comb" rotate={6} />
              </div>
            </div>

            {/* Columns 7..12: Label, Headline, 2 Paragraphs, Live DB Counts */}
            <div className="lg:col-span-6 lg:col-start-7 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#C4262E]">
                  01 / Welcome to Bbold
                </div>
                <DieCutSticker variant="sparkle-badge" rotate={-3} />
              </div>

              <h2 className="font-display font-extrabold text-h1 text-[#15110F]">
                A neighbourhood studio built for bold everyday craft.
              </h2>

              <p className="text-base text-[#15110F]/85 leading-relaxed">
                At Bbold Salon &amp; Academy, every appointment begins with a conversation about your
                hair texture, skin tone, and daily routine — never a rushed template.
              </p>

              <p className="text-base text-[#15110F]/85 leading-relaxed">
                Alongside our styling floor in Mumbai, our training academy equips aspiring artists
                with practical salon-ready skills.
              </p>

              {/* Live Count-Up Metrics from DB rows */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-y-2 border-[#15110F] py-5">
                <div>
                  <div className="font-display text-3xl sm:text-4xl font-extrabold text-[#C4262E]">
                    <CountUpNumber value={services.length || 55} />
                  </div>
                  <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#15110F]/80 mt-1">
                    Salon Services
                  </div>
                </div>
                <div>
                  <div className="font-display text-3xl sm:text-4xl font-extrabold text-[#15110F]">
                    <CountUpNumber value={stylists.length || 4} />
                  </div>
                  <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#15110F]/80 mt-1">
                    Specialist Stylists
                  </div>
                </div>
                <div>
                  <div className="font-display text-3xl sm:text-4xl font-extrabold text-[#E8A317] [-webkit-text-stroke:1px_#15110F]">
                    <CountUpNumber value={courses.length || 5} />
                  </div>
                  <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#15110F]/80 mt-1">
                    Academy Courses
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 font-display font-bold text-base text-[#15110F] hover:text-[#C4262E] transition-colors"
                >
                  <span>Read our full story &amp; studio philosophy →</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 4: SIX-STATION SHOWCASE (Button-Controlled Track, No Scrollbar)
         ===================================================================== */}
      <section className="py-16 lg:py-24 bg-[#E9DDD0]/65 border-b-[2.5px] border-[#15110F]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#C4262E]">
              02 / Six Stations Under One Roof
            </div>
            <h2 className="font-display font-extrabold text-h1 text-[#15110F] mt-2">
              Pick Your Chair or Classroom
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DieCutSticker variant="crown" rotate={-4} />
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => scrollStations('left')}
                aria-label="Scroll stations left"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#F5F0E8] hover:bg-[#E8A317] text-[#15110F] border-2 border-[#15110F] shadow-[3px_3px_0px_#15110F] active:translate-y-0.5 font-mono text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
              >
                <ChevronLeft size={18} />
                <span>Prev</span>
              </button>
              <button
                type="button"
                onClick={() => scrollStations('right')}
                aria-label="Scroll stations right"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#C4262E] hover:bg-[#15110F] text-[#F5F0E8] border-2 border-[#15110F] shadow-[3px_3px_0px_#15110F] active:translate-y-0.5 font-mono text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
              >
                <span>Next</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal snap track without any scrollbar slider */}
        <div
          ref={stationsTrackRef}
          className="no-scrollbar flex gap-6 overflow-x-auto snap-x snap-mandatory px-4 sm:px-8 pb-2 max-w-[1440px] mx-auto scroll-smooth"
        >
          {SIX_STATIONS.map((st) => {
            const catServices = services
              .filter((s) =>
                s.category.toLowerCase().includes(st.categoryKey.toLowerCase())
              )
              .slice(0, 4);

            return (
              <article
                key={st.num}
                onMouseEnter={() => setActiveRoom(st.room)}
                className="snap-start shrink-0 w-[85vw] sm:w-[70vw] max-w-[720px] rounded-3xl bg-[#F5F0E8] border-2 border-[#15110F] p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center shadow-[5px_5px_0px_#15110F]"
              >
                <div className="md:col-span-5">
                  <Img
                    slot={st.slot}
                    mask="arch"
                    aspect="4/5"
                    hoverZoom
                    className="w-full border-2 border-[#15110F]"
                  />
                </div>

                <div className="md:col-span-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[#E8A317] text-[#15110F] border border-[#15110F]">
                      Station {st.num}
                    </span>
                    <DieCutSticker
                      variant={
                        st.room === 'nails'
                          ? 'nail-polish'
                          : st.room === 'makeup'
                          ? 'lipstick'
                          : st.room === 'skin'
                          ? 'flower'
                          : st.room === 'academy'
                          ? 'academy-star'
                          : 'scissors'
                      }
                      rotate={3}
                      className="scale-90"
                    />
                  </div>

                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#15110F]">
                    {st.title}
                  </h3>

                  <p className="text-sm text-[#15110F]/80 leading-relaxed">{st.description}</p>

                  {/* Sample services + starting price pulled from DB */}
                  {catServices.length > 0 ? (
                    <ul className="space-y-1.5 pt-2 border-t-2 border-[#15110F] text-xs">
                      {catServices.map((srv) => (
                        <li
                          key={srv.id}
                          className="flex items-center justify-between gap-2 text-[#15110F]"
                        >
                          <span className="truncate font-semibold">{srv.name}</span>
                          <span className="font-mono font-bold text-[#C4262E] shrink-0">
                            from {formatINR(srv.price)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="pt-2 border-t-2 border-[#15110F] text-xs font-mono text-[#15110F]">
                      {courses.slice(0, 3).map((c) => (
                        <div key={c.id} className="flex justify-between py-0.5 font-semibold">
                          <span className="truncate">{c.name}</span>
                          <span className="text-[#C4262E]">{c.duration_text || 'Pro Course'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2">
                    <Link
                      to={st.linkTo}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#15110F] text-[#F5F0E8] hover:bg-[#C4262E] text-xs font-mono uppercase tracking-wider font-bold transition-colors"
                    >
                      <span>{st.linkLabel}</span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          SECTION 5: INTERACTIVE SERVICE MENU TEASER
         ===================================================================== */}
      <section className="py-20 lg:py-28 border-b-[2.5px] border-[#15110F]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#C4262E]">
                  03 / Service Menu &amp; Transparent Pricing
                </span>
                <DieCutSticker variant="lipstick" rotate={-3} />
              </div>
              <h2 className="font-display font-extrabold text-h1 text-[#15110F]">
                The Salon Menu
              </h2>
            </div>

            {/* Category Tabs */}
            <div
              role="tablist"
              aria-label="Service categories"
              className="flex flex-wrap gap-2"
            >
              {(['Hair', 'Men', 'Nails', 'Makeup', 'Skin'] as const).map((cat) => {
                const active = menuCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setMenuCategory(cat)}
                    className={`px-5 py-2.5 rounded-full font-mono text-xs uppercase tracking-wider border-2 border-[#15110F] transition-all ${
                      active
                        ? 'bg-[#C4262E] text-[#F5F0E8] font-bold shadow-[3px_3px_0px_#15110F]'
                        : 'bg-[#E9DDD0] text-[#15110F] font-semibold hover:bg-[#E8A317]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2-Column Editorial Menu List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {teaserServices.map((srv) => (
                <Link
                  key={srv.id}
                  to={`/book?service=${srv.id}`}
                  data-cursor="book"
                  onMouseEnter={() => setHoveredService(srv)}
                  className="group p-5 rounded-2xl bg-[#E9DDD0]/55 hover:bg-[#E9DDD0] border-2 border-[#15110F] shadow-[3px_3px_0px_#15110F] transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-bold text-lg text-[#15110F] group-hover:text-[#C4262E] transition-colors">
                          {srv.name}
                        </h3>
                        <SampleTag isSample={srv.is_sample} />
                      </div>
                      {srv.description && (
                        <p className="text-xs text-[#15110F]/75 mt-1 line-clamp-2">
                          {srv.description}
                        </p>
                      )}
                    </div>
                    <ArrowUpRight
                      size={18}
                      className="text-[#15110F] group-hover:text-[#C4262E] shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </div>

                  <div className="pt-3 border-t-2 border-dashed border-[#15110F]/30 flex items-center justify-between text-xs font-mono">
                    <span className="inline-flex items-center gap-1 text-[#15110F] font-medium">
                      <Clock size={12} />
                      {srv.duration_minutes} min
                    </span>
                    <span className="font-bold text-[#C4262E]">
                      from {formatINR(srv.price)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Right 4 Columns: Floating Service Preview Card */}
            <div className="lg:col-span-4 p-6 rounded-3xl bg-[#E9DDD0] border-2 border-[#15110F] shadow-[5px_5px_0px_#15110F] space-y-4 sticky top-24">
              <div className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#C4262E]">
                Selected Service Spotlight
              </div>
              {hoveredService || teaserServices[0] ? (
                (() => {
                  const target = hoveredService || teaserServices[0];
                  return (
                    <>
                      <div className="h-40 rounded-2xl bg-[#F5F0E8] border-2 border-[#15110F] flex items-center justify-center p-4">
                        <Illustration
                          name={
                            target.category.includes('Nail')
                              ? 'nail-polish-bottles'
                              : target.category.includes('Makeup') ||
                                target.category.includes('Bridal')
                              ? 'lipstick-and-mirror'
                              : target.category.includes('Skin')
                              ? 'facial-jar-and-leaf'
                              : 'comb-and-scissors'
                          }
                          className="w-28 h-28"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-display font-bold text-xl text-[#15110F]">
                          {target.name}
                        </h4>
                        <SampleTag isSample={target.is_sample} />
                      </div>
                      <p className="text-sm text-[#15110F]/80">
                        {target.description ||
                          'Includes thorough consultation, premium salon products, and aftercare guidance.'}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t-2 border-[#15110F] font-mono text-xs font-bold">
                        <span>Duration: {target.duration_minutes} mins</span>
                        <span className="text-[#C4262E]">
                          from {formatINR(target.price)}
                        </span>
                      </div>
                      <Link
                        to={`/book?service=${target.id}`}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#C4262E] text-[#F5F0E8] border-2 border-[#15110F] font-bold text-xs font-mono uppercase tracking-wider hover:bg-[#15110F] transition-colors"
                      >
                        <span>Book This Service →</span>
                      </Link>
                    </>
                  );
                })()
              ) : (
                <p className="text-sm text-[#15110F]/70">
                  Select a category tab to preview available services.
                </p>
              )}
            </div>
          </div>

          {/* Bottom links */}
          <div className="mt-10 pt-6 border-t-2 border-[#15110F] flex flex-wrap items-center justify-between gap-4">
            <Link
              to="/services"
              className="inline-flex items-center gap-2 font-display font-bold text-lg text-[#15110F] hover:text-[#C4262E] transition-colors"
            >
              <span>View complete menu ({services.length || 55} services) →</span>
            </Link>

            <Link
              to="/services"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#15110F] bg-[#E8A317] text-xs font-mono font-bold uppercase tracking-wider text-[#15110F] shadow-[2px_2px_0px_#15110F]"
            >
              <Printer size={14} />
              <span>Printable Price Menu</span>
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 6: BEFORE & AFTER DRAG COMPARISON + LOOKBOOK TEASER
         ===================================================================== */}
      <section className="py-20 lg:py-28 bg-[#E9DDD0]/55 border-b-[2.5px] border-[#15110F]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#C4262E]">
                  04 / Real Transformations
                </span>
                <DieCutSticker variant="mirror" rotate={4} />
              </div>
              <h2 className="font-display font-extrabold text-h1 text-[#15110F]">
                Before &amp; After Lookbook
              </h2>
            </div>
            <Link
              to="/gallery"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#15110F] text-[#F5F0E8] font-mono text-xs uppercase tracking-wider font-bold hover:bg-[#C4262E]"
            >
              <span>Open full gallery →</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left 6 Columns: Interactive Drag Slider */}
            <div className="lg:col-span-6">
              <BeforeAfterSlider
                beforeUrl={beforeAfterItem?.before_image_url}
                afterUrl={beforeAfterItem?.image_url}
                caption={
                  beforeAfterItem?.caption ||
                  'Dimensional colour & cut transformation — drag handle to compare'
                }
                category={beforeAfterItem?.category || 'Hair'}
                isSample={beforeAfterItem?.is_sample}
              />
            </div>

            {/* Right 6 Columns: 3 Asymmetric Masonry Lookbook Items */}
            <div className="lg:col-span-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {lookbookTeaser.map((item, idx) => (
                  <Link
                    key={item.id}
                    to="/gallery"
                    data-cursor="view"
                    className={`group block p-3 rounded-3xl bg-[#F5F0E8] border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F] hover:shadow-[6px_6px_0px_#15110F] transition-all ${
                      idx === 0 ? 'sm:col-span-2' : ''
                    }`}
                  >
                    <Img
                      src={item.image_url === 'ILLUSTRATION_AFTER' ? null : item.image_url}
                      alt={item.caption || 'Bbold salon look'}
                      aspect={idx === 0 ? '16/9' : '4/5'}
                      mask="rounded"
                      hoverZoom
                      illustrationFallback={
                        item.category === 'Makeup'
                          ? 'lipstick-and-mirror'
                          : item.category === 'Nails'
                          ? 'hand-with-nails'
                          : 'hair-dryer'
                      }
                    />
                    <div className="mt-3 px-1 flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#C4262E]">
                          {item.category || 'Salon'}
                        </span>
                        <p className="font-display font-bold text-sm text-[#15110F] line-clamp-1">
                          {item.caption || 'Styled at Bbold Mumbai'}
                        </p>
                      </div>
                      <SampleTag isSample={item.is_sample} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 7: MEET THE STYLISTS TEASER
         ===================================================================== */}
      <section className="py-20 lg:py-28 border-b-[2.5px] border-[#15110F]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#C4262E]">
                  05 / The Artists Behind the Chair
                </span>
                <DieCutSticker variant="scissors" rotate={-5} />
              </div>
              <h2 className="font-display font-extrabold text-h1 text-[#15110F]">
                Meet the Stylists
              </h2>
            </div>
            <Link
              to="/team"
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-bold text-[#C4262E] hover:text-[#15110F]"
            >
              <span>Meet the whole team →</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stylists.slice(0, 4).map((sty) => {
              const firstName = sty.name.split(' ')[0];
              return (
                <div
                  key={sty.id}
                  className="group rounded-3xl bg-[#E9DDD0]/60 border-2 border-[#15110F] p-5 flex flex-col justify-between transition-all hover:-translate-y-1 shadow-[4px_4px_0px_#15110F]"
                >
                  <div>
                    <Link to={`/team/${sty.id}`} className="block">
                      <Img
                        src={sty.photo_url}
                        alt={sty.name}
                        mask="arch"
                        aspect="3/4"
                        illustrationFallback="profile-bob"
                        hoverZoom
                        className="w-full border-2 border-[#15110F]"
                      />
                    </Link>

                    <div className="mt-4 flex items-start justify-between gap-2">
                      <div>
                        <Link
                          to={`/team/${sty.id}`}
                          className="font-display font-bold text-xl text-[#15110F] group-hover:text-[#C4262E] transition-colors"
                        >
                          {sty.name}
                        </Link>
                        <div className="font-mono text-xs font-semibold text-[#15110F]/75 mt-0.5">
                          {sty.title || 'Senior Stylist'}
                        </div>
                      </div>
                      <SampleTag isSample={sty.is_sample} />
                    </div>

                    {sty.specialties && sty.specialties.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {sty.specialties.map((sp) => (
                          <span
                            key={sp}
                            className="px-2.5 py-0.5 rounded-full bg-[#F5F0E8] border border-[#15110F] font-mono text-[10px] font-bold uppercase tracking-wider text-[#15110F]"
                          >
                            {sp}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t-2 border-[#15110F] flex items-center justify-between">
                    <Link
                      to={`/book?stylist=${sty.id}`}
                      className="font-mono text-xs uppercase tracking-wider font-bold text-[#C4262E] hover:text-[#15110F]"
                    >
                      Book with {firstName} →
                    </Link>
                    <Link
                      to={`/team/${sty.id}`}
                      className="text-xs font-semibold text-[#15110F]/75 hover:text-[#15110F]"
                    >
                      Profile
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 8: ACADEMY SPOTLIGHT BANNER (Full-bleed --ink #15110F)
         ===================================================================== */}
      <section className="py-20 lg:py-28 bg-[#15110F] text-[#F5F0E8] border-b-[2.5px] border-[#15110F]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E8A317]/20 border border-[#E8A317] text-[#E8A317] font-mono text-xs font-bold uppercase tracking-widest">
                <span>Bbold Training Academy</span>
              </div>
              <DieCutSticker variant="academy-star" rotate={4} />
            </div>

            <h2 className="font-display font-extrabold text-h1 text-[#F5F0E8]">
              Learn the craft from working salon educators.
            </h2>

            <p className="text-base text-[#F5F0E8]/85 leading-relaxed max-w-xl">
              Practical courses in hairdressing, bridal makeup, nail extensions, skin aesthetics,
              and full cosmetology in Mumbai.
            </p>

            <div className="pt-2">
              <Link
                to="/academy"
                className="inline-flex items-center gap-3 px-7 py-4 rounded-full bg-[#E8A317] text-[#15110F] border-2 border-[#FFFFFF] font-display font-bold text-sm hover:bg-[#F5F0E8] transition-colors"
              >
                <span>Explore Academy &amp; Enquire →</span>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            {courses.slice(0, 3).map((course, idx) => (
              <div
                key={course.id}
                className="p-5 sm:p-6 rounded-2xl bg-[#F5F0E8]/[0.08] border-2 border-[#F5F0E8]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#E8A317] transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-[#E8A317]">
                      0{idx + 1}
                    </span>
                    <h3 className="font-display font-bold text-lg text-[#F5F0E8]">
                      {course.name}
                    </h3>
                    <SampleTag isSample={course.is_sample} />
                  </div>
                  <p className="text-xs text-[#F5F0E8]/75 line-clamp-2">
                    {course.description?.split('\n')[0]}
                  </p>
                </div>

                <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0 font-mono text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-[#E8A317] text-[#15110F] font-bold">
                    {course.duration_text || 'Flexible Batch'}
                  </span>
                  <span className="text-[#F5F0E8] font-bold">
                    {course.fee ? formatINR(course.fee) : 'Fee on enquiry'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 9: CLIENT VOICES (Testimonials Editorial Quote Carousel)
         ===================================================================== */}
      <section className="py-20 lg:py-28 border-b-[2.5px] border-[#15110F]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#C4262E]">
                  06 / Client Voices
                </span>
                <DieCutSticker variant="flower" rotate={-4} />
              </div>
              <h2 className="font-display font-extrabold text-h1 text-[#15110F]">
                Words From the Chair
              </h2>
            </div>
            <Link
              to="/testimonials"
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-bold text-[#C4262E] hover:text-[#15110F]"
            >
              <span>Read all reviews →</span>
            </Link>
          </div>

          {activeTestimonial ? (
            <div className="relative rounded-3xl bg-[#E9DDD0]/65 border-2 border-[#15110F] shadow-[6px_6px_0px_#15110F] p-8 sm:p-14 overflow-hidden">
              {/* Giant decorative quotation mark */}
              <div
                aria-hidden="true"
                className="font-display font-extrabold text-[140px] leading-none text-[#F2C9C0] select-none absolute -top-4 left-6 opacity-70"
              >
                “
              </div>

              <div className="relative z-10 max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-1 text-[#E8A317]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={18} fill="currentColor" stroke="#15110F" />
                  ))}
                  <SampleTag isSample={activeTestimonial.is_sample} className="ml-2" />
                </div>

                <blockquote className="font-display font-bold text-xl sm:text-3xl text-[#15110F] leading-snug">
                  “{activeTestimonial.quote}”
                </blockquote>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t-2 border-[#15110F]">
                  <div>
                    <div className="font-display font-bold text-lg text-[#15110F]">
                      {activeTestimonial.name}
                    </div>
                    {activeTestimonial.service_label && (
                      <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#C4262E]">
                        Service: {activeTestimonial.service_label}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setQuoteIdx(
                          (prev) => (prev - 1 + testimonials.length) % testimonials.length
                        )
                      }
                      aria-label="Previous testimonial"
                      className="w-11 h-11 rounded-full border-2 border-[#15110F] bg-[#F5F0E8] hover:bg-[#15110F] hover:text-[#F5F0E8] flex items-center justify-center transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="font-mono text-xs font-bold px-2">
                      {(quoteIdx % testimonials.length) + 1} / {testimonials.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuoteIdx((prev) => (prev + 1) % testimonials.length)}
                      aria-label="Next testimonial"
                      className="w-11 h-11 rounded-full border-2 border-[#15110F] bg-[#F5F0E8] hover:bg-[#15110F] hover:text-[#F5F0E8] flex items-center justify-center transition-colors"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* =====================================================================
          SECTION 10: PRE-FOOTER BOOKING POSTER (Full-width --crimson #C4262E)
         ===================================================================== */}
      <section className="py-20 lg:py-28 bg-[#C4262E] text-[#F5F0E8] relative overflow-hidden border-b-[2.5px] border-[#15110F]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 text-center space-y-6 relative z-10">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="inline-block px-4 py-1.5 rounded-full bg-[#E8A317] text-[#15110F] border-2 border-[#15110F] font-mono text-xs font-bold uppercase tracking-widest shadow-[3px_3px_0px_#15110F]">
              Walk-Ins Welcome · Prior Booking Recommended
            </div>
            <DieCutSticker variant="stamp" rotate={6} />
          </div>

          <h2 className="font-display font-black text-hero text-[#F5F0E8] [-webkit-text-stroke:1.5px_#15110F] drop-shadow-[4px_4px_0px_#15110F] max-w-4xl mx-auto">
            Ready for your boldest look?
          </h2>
          <p className="text-base sm:text-lg text-[#F5F0E8] font-medium max-w-xl mx-auto">
            Pick your service, choose your stylist, and lock in your slot in under 60 seconds.
          </p>
          <div className="pt-4">
            <MagneticButton cursorLabel="book">
              <Link
                to="/book"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#F5F0E8] text-[#15110F] border-2 border-[#15110F] font-display font-bold text-base shadow-[5px_5px_0px_#15110F] hover:bg-[#E8A317] transition-colors"
              >
                <span>Reserve Your Chair →</span>
              </Link>
            </MagneticButton>
          </div>
        </div>
      </section>
    </div>
  );
};
