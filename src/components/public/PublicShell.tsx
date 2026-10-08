import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Lenis from 'lenis';
import {
  Menu,
  X,
  Calendar,
  MapPin,
  Phone,
  Clock,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { useSiteData } from '../../context/SiteDataContext';
import { ROOM_SWATCHES, SITE_CONFIG, WEEKDAY_NAMES } from '../../config/site';
import type { RoomId } from '../../types/database';
import {
  Preloader,
  CustomCursor,
  MagneticButton,
  SwatchScrollProgress,
  usePrefersReducedMotion,
} from './GlobalEffects';

export function getRouteDefaultRoom(pathname: string): RoomId {
  if (pathname.startsWith('/bridal')) return 'makeup';
  if (pathname.startsWith('/academy')) return 'academy';
  if (pathname.startsWith('/services')) return 'hair';
  if (pathname.startsWith('/gallery')) return 'nails';
  if (pathname.startsWith('/about') || pathname.startsWith('/contact')) return 'skin';
  return 'hair';
}

export const PublicShell: React.FC = () => {
  const location = useLocation();
  const reducedMotion = usePrefersReducedMotion();
  const { siteTexts, salonSettings, businessHours } = useSiteData();

  const [activeRoom, setActiveRoom] = useState<RoomId>(() =>
    getRouteDefaultRoom(location.pathname)
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [routeWiping, setRouteWiping] = useState(false);

  // Sync room colour on route change & trigger subtle route wipe
  useEffect(() => {
    const nextRoom = getRouteDefaultRoom(location.pathname);
    setActiveRoom(nextRoom);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    if (!reducedMotion) {
      setRouteWiping(true);
      const t = window.setTimeout(() => setRouteWiping(false), 450);
      return () => window.clearTimeout(t);
    }
  }, [location.pathname, reducedMotion]);

  // Apply CSS custom properties for active room
  useEffect(() => {
    const swatch = ROOM_SWATCHES[activeRoom] || ROOM_SWATCHES.hair;
    document.documentElement.style.setProperty('--room', swatch.hex);
    document.documentElement.style.setProperty('--room-ink', swatch.inkHex);
  }, [activeRoom]);

  // Initialize Lenis smooth scroll on public pages (disabled in reduced-motion)
  useEffect(() => {
    if (reducedMotion) return;
    const lenis = new Lenis({
      lerp: 0.09,
      smoothWheel: true,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };
    rafId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [reducedMotion]);

  // Header compaction on scroll
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 48);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on Esc
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const todayDow = new Date().getDay();
  const todayHours = businessHours.find((h) => h.weekday === todayDow);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/services', label: 'Services' },
    { to: '/bridal', label: 'Bridal' },
    { to: '/academy', label: 'Academy' },
    { to: '/gallery', label: 'Gallery' },
    { to: '/team', label: 'Team' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <div
      data-room={activeRoom}
      className="min-h-screen bg-transparent text-[#15110F] flex flex-col relative selection:bg-[#C4262E] selection:text-[#F5F0E8]"
    >
      {/* Skip-to-content link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[999] focus:px-4 focus:py-2 focus:bg-[#15110F] focus:text-[#F5F0E8] focus:rounded-lg font-mono text-xs uppercase tracking-wider"
      >
        Skip to content
      </a>

      {/* Session Preloader & Fine-Pointer Custom Cursor */}
      <Preloader />
      <CustomCursor activeRoom={activeRoom} />
      <SwatchScrollProgress />

      {/* Subtle Route Paint-Stroke Wipe */}
      {routeWiping && !reducedMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[400] origin-top animate-[pulse_0.45s_ease-out]"
          style={{
            backgroundColor: ROOM_SWATCHES[activeRoom]?.hex || '#C4262E',
            opacity: 0.12,
          }}
        />
      )}

      {/* Sticky Editorial Header */}
      <header
        className={`sticky top-0 z-[100] transition-all duration-300 border-b-[2.5px] border-[#15110F] bg-[#F5F0E8] no-print ${
          scrolled
            ? 'h-16 shadow-[0_4px_24px_-12px_rgba(21,17,15,0.18)]'
            : 'h-20'
        }`}
      >
        <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-8 flex items-center justify-between gap-4">
          {/* Left: Brand Wordmark + Tag */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus:outline-none relative py-1"
            aria-label="Bbold Salon & Academy Home"
          >
            <span className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#15110F] group-hover:text-[#C4262E] transition-colors relative">
              Bbold
              <span
                aria-hidden="true"
                className="absolute -bottom-0.5 left-0 right-0 h-[3px] bg-[#15110F] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out"
              />
            </span>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-[0.14em] bg-[#E8A317] text-[#15110F] border-2 border-[#15110F]">
              Salon · Academy
            </span>
          </Link>

          {/* Center: Desktop Navigation Links (Larger, Extra Bold, Black Left-to-Right Hover Underline) */}
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-6 xl:gap-7"
          >
            {navLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `group/nav relative py-1.5 text-[17px] xl:text-[18px] font-black tracking-tight transition-colors ${
                    isActive
                      ? 'text-[#C4262E]'
                      : 'text-[#15110F] hover:text-[#15110F]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{item.label}</span>
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-[#15110F] origin-left transition-transform duration-300 ease-out ${
                        isActive
                          ? 'scale-x-100'
                          : 'scale-x-0 group-hover/nav:scale-x-100'
                      }`}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right: Room Dot Indicator + Book CTA + Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
            {/* Subtle Room Swatch Switcher Pill on Desktop */}
            <div
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E9DDD0]/70 border border-[#15110F]/10"
              title="Active salon station palette"
            >
              {(['hair', 'makeup', 'nails', 'skin'] as RoomId[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setActiveRoom(r)}
                  aria-label={`Switch theme accent to ${ROOM_SWATCHES[r].label}`}
                  className={`w-3 h-3 rounded-full transition-transform ${
                    activeRoom === r ? 'scale-125 ring-1 ring-[#15110F]' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: ROOM_SWATCHES[r].hex }}
                />
              ))}
            </div>

            <MagneticButton cursorLabel="book" className="hidden sm:inline-block">
              <Link
                to="/book"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C4262E] text-[#F5F0E8] font-medium text-sm shadow-sm hover:bg-[#15110F] transition-colors"
              >
                <Calendar size={15} />
                <span>Book Appointment</span>
              </Link>
            </MagneticButton>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-full border border-[#15110F]/20 bg-[#E9DDD0]/60 text-[#15110F]"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Full-Screen Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="fixed inset-0 z-[150] bg-[#15110F] text-[#F5F0E8] flex flex-col justify-between p-6 sm:p-10 overflow-y-auto lg:hidden"
        >
          <div className="flex items-center justify-between border-b border-[#F5F0E8]/15 pb-4">
            <div>
              <span className="font-display text-3xl font-extrabold tracking-tight text-[#F5F0E8]">
                Bbold
              </span>
              <span className="ml-2 font-mono text-[11px] uppercase tracking-widest text-[#F2C9C0]">
                Salon &amp; Academy
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="w-11 h-11 rounded-full border border-[#F5F0E8]/25 flex items-center justify-center text-[#F5F0E8]"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="my-auto py-8 flex flex-col gap-3">
            {[
              { to: '/', label: 'Home', num: '00' },
              { to: '/services', label: 'Services Menu', num: '01' },
              { to: '/bridal', label: 'Bridal Studio', num: '02' },
              { to: '/academy', label: 'Bbold Academy', num: '03' },
              { to: '/gallery', label: 'Lookbook & Gallery', num: '04' },
              { to: '/team', label: 'Stylists & Team', num: '05' },
              { to: '/testimonials', label: 'Client Reviews', num: '06' },
              { to: '/about', label: 'Our Story', num: '07' },
              { to: '/contact', label: 'Contact & Hours', num: '08' },
              { to: '/faq', label: 'FAQ', num: '09' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className="group flex items-baseline gap-4 py-1.5 border-b border-[#F5F0E8]/10"
              >
                <span className="font-mono text-xs text-[#C4262E]">{item.num}</span>
                <span className="font-display text-3xl sm:text-4xl font-bold tracking-tight group-hover:text-[#F2C9C0] transition-colors">
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-[#F5F0E8]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs font-mono text-[#F5F0E8]/70 space-y-1">
              <div>
                Mumbai ·{' '}
                {todayHours && todayHours.is_open
                  ? `Open Today (${todayHours.start_time.slice(0, 5)} – ${todayHours.end_time.slice(0, 5)})`
                  : 'Closed Today'}
              </div>
              {salonSettings.salon_phone && <div>Tel: {salonSettings.salon_phone}</div>}
            </div>
            <Link
              to="/book"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#C4262E] text-[#F5F0E8] font-semibold text-sm"
            >
              <Calendar size={16} />
              <span>Book Appointment →</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Outlet */}
      <main id="main-content" className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{
              duration: reducedMotion ? 0 : 0.38,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <Outlet context={{ activeRoom, setActiveRoom }} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Editorial Footer */}
      <footer className="bg-[#15110F] text-[#F5F0E8] pt-16 pb-24 lg:pb-12 border-t-[3px] border-[#15110F] no-print">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-14 border-b border-[#F5F0E8]/15">
            {/* Col 1..4: Brand & Tagline */}
            <div className="lg:col-span-4 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F0E8]/10 text-[#F2C9C0] font-mono text-xs uppercase tracking-widest">
                <span>Salon · Academy · Mumbai</span>
              </div>
              <p className="text-sm text-[#F5F0E8]/80 max-w-sm leading-relaxed">
                {siteTexts.footer?.final_line ||
                  'Hair, Makeup, Nails, Skin & Professional Beauty Academy in Mumbai.'}
              </p>
              <div className="pt-2">
                <Link
                  to="/book"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C4262E] text-[#F5F0E8] text-xs font-mono uppercase tracking-wider font-semibold hover:bg-[#F5F0E8] hover:text-[#15110F] transition-colors"
                >
                  <span>Reserve Your Chair</span>
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>

            {/* Col 5..6: Explore Links */}
            <div className="lg:col-span-2 space-y-3">
              <div className="font-mono text-xs uppercase tracking-widest text-[#F2C9C0]">
                Explore
              </div>
              <ul className="space-y-2 text-sm text-[#F5F0E8]/80">
                <li>
                  <Link to="/services" className="hover:text-white transition-colors">
                    Services &amp; Price Menu
                  </Link>
                </li>
                <li>
                  <Link to="/bridal" className="hover:text-white transition-colors">
                    Bridal Studio
                  </Link>
                </li>
                <li>
                  <Link to="/academy" className="hover:text-white transition-colors">
                    Bbold Academy
                  </Link>
                </li>
                <li>
                  <Link to="/gallery" className="hover:text-white transition-colors">
                    Lookbook &amp; Gallery
                  </Link>
                </li>
                <li>
                  <Link to="/team" className="hover:text-white transition-colors">
                    Meet the Team
                  </Link>
                </li>
                <li>
                  <Link to="/testimonials" className="hover:text-white transition-colors">
                    Client Voices
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 7..8: Information */}
            <div className="lg:col-span-2 space-y-3">
              <div className="font-mono text-xs uppercase tracking-widest text-[#F2C9C0]">
                Salon Info
              </div>
              <ul className="space-y-2 text-sm text-[#F5F0E8]/80">
                <li>
                  <Link to="/about" className="hover:text-white transition-colors">
                    About &amp; Hygiene
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white transition-colors">
                    Contact &amp; Directions
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="hover:text-white transition-colors">
                    Frequently Asked Questions
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-white transition-colors">
                    Cancellation &amp; Terms
                  </Link>
                </li>
                <li>
                  <Link
                    to="/admin"
                    className="hover:text-white transition-colors font-mono text-xs text-[#F5F0E8]/50"
                  >
                    Staff / Admin Portal
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 9..12: Live Location & Hours */}
            <div className="lg:col-span-4 space-y-3">
              <div className="font-mono text-xs uppercase tracking-widest text-[#F2C9C0]">
                Visit &amp; Hours
              </div>
              <div className="text-sm text-[#F5F0E8]/80 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <MapPin size={16} className="text-[#C4262E] shrink-0 mt-0.5" />
                  <span>
                    {salonSettings.salon_address || SITE_CONFIG.todoAddress}
                  </span>
                </div>

                {salonSettings.salon_phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone size={16} className="text-[#C4262E] shrink-0" />
                    <a
                      href={`tel:${salonSettings.salon_phone}`}
                      className="hover:text-white underline underline-offset-4 font-mono"
                    >
                      {salonSettings.salon_phone}
                    </a>
                  </div>
                )}

                <div className="flex items-start gap-2.5">
                  <Clock size={16} className="text-[#C4262E] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-[#F5F0E8]">
                      Today ({WEEKDAY_NAMES[todayDow]}):{' '}
                      {todayHours && todayHours.is_open ? (
                        <span className="text-[#9AAA94]">
                          {todayHours.start_time.slice(0, 5)} – {todayHours.end_time.slice(0, 5)}
                        </span>
                      ) : (
                        <span className="text-[#F2C9C0]">Closed</span>
                      )}
                    </div>
                    <div className="text-xs text-[#F5F0E8]/60 mt-0.5">
                      Tue–Sun 10:00 AM – 8:00 PM · Monday Closed
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Oversized Display Wordmark */}
          <div className="py-8 border-b border-[#F5F0E8]/10 overflow-hidden select-none">
            <div className="font-display font-extrabold text-[15vw] leading-[0.82] tracking-[-0.04em] text-[#F5F0E8]/[0.07] text-center">
              BBOLD MUMBAI
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#F5F0E8]/60">
            <div>
              © {new Date().getFullYear()} {salonSettings.salon_name || 'Bbold Salon & Academy'}. All
              rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <a
                href={SITE_CONFIG.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Instagram ({SITE_CONFIG.instagramHandle}) ↗
              </a>
              <a
                href={SITE_CONFIG.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                WhatsApp ↗
              </a>
              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Booking Bar (< 1024px) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[95] bg-[#15110F]/95 backdrop-blur-md border-t border-[#F5F0E8]/15 px-4 py-3 flex items-center justify-between gap-3 no-print">
        <div className="text-xs text-[#F5F0E8]">
          <div className="font-display font-bold text-sm">Bbold Salon &amp; Academy</div>
          <div className="font-mono text-[11px] text-[#F2C9C0]">
            Real-time chair availability
          </div>
        </div>
        <Link
          to="/book"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C4262E] text-[#F5F0E8] font-semibold text-xs font-mono uppercase tracking-wider shrink-0"
        >
          <Calendar size={14} />
          <span>Book Appointment →</span>
        </Link>
      </div>
    </div>
  );
};
