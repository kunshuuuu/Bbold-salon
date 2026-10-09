import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar, Clock, Sparkles } from 'lucide-react';
import { getPublicServices, getPublicGalleryItems } from '../lib/content';
import { formatINR } from '../config/site';
import { Img } from '../components/visual/Img';
import { SampleTag } from '../components/common/SampleTag';
import { EnquiryFormCard } from '../components/public/EnquiryFormCard';
import { CutLine, DieCutSticker, StickerDrop } from '../components/public/GlobalEffects';
import type { GalleryItem, Service } from '../types/database';

const BRIDAL_TIMELINE = [
  {
    step: '01',
    title: 'Consultation & Trial',
    description:
      'We map your outfits, jewellery, lighting, and skin type — testing foundation finishes and hair structure ahead of time.',
  },
  {
    step: '02',
    title: 'Skin & Hair Prep Plan',
    description:
      'Custom pre-bridal schedule of hydrating facials, hair spas, colour glossing, and nail extensions timed to your events.',
  },
  {
    step: '03',
    title: 'Event Day Styling',
    description:
      'Calm, punctual bridal makeup, hairstyling, and saree/lehenga draping at our Mumbai studio or your venue.',
  },
  {
    step: '04',
    title: 'Touch-Up Kit & Transition',
    description:
      'Long-wear setting, lash & pin check, plus a curated touch-up kit so your look stays camera-ready until the final dance.',
  },
];

export const BridalPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([getPublicServices(), getPublicGalleryItems()]).then(([srv, gal]) => {
      if (!mounted) return;
      setServices(srv);
      setGallery(gal);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const bridalPackages = useMemo(() => {
    return services.filter(
      (s) =>
        s.category.toLowerCase().includes('makeup') ||
        s.category.toLowerCase().includes('bridal') ||
        s.name.toLowerCase().includes('bridal')
    );
  }, [services]);

  const bridalGallery = useMemo(() => {
    return gallery.filter(
      (g) =>
        (g.category || '').toLowerCase().includes('makeup') ||
        (g.category || '').toLowerCase().includes('bridal')
    );
  }, [gallery]);

  return (
    <div className="py-12 lg:py-20 max-w-[1440px] mx-auto px-4 sm:px-8 space-y-20">
      <Helmet>
        <title>Bridal &amp; Event Makeup Studio — Bbold Salon &amp; Academy Mumbai</title>
        <meta
          name="description"
          content="HD and airbrush bridal makeup, pre-bridal trials, hairstyling, and saree draping at Bbold Salon & Academy in Mumbai."
        />
      </Helmet>

      {/* Hero Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pb-16 border-b-[2.5px] border-[#15110F]">
        <div className="lg:col-span-7 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <StickerDrop rotate={-2} delay={0}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F2C9C0] border-2 border-[#15110F] shadow-[2px_2px_0px_#15110F] font-mono text-xs font-bold uppercase tracking-widest text-[#15110F]">
                <Sparkles size={13} className="text-[#C4262E]" />
                <span>Bridal &amp; Occasion Styling · Mumbai</span>
              </div>
            </StickerDrop>
            <DieCutSticker variant="lipstick" rotate={-4} delay={0.1} />
            <DieCutSticker variant="mirror" rotate={5} delay={0.2} />
          </div>

          <h1 className="font-display font-extrabold text-hero text-[#15110F]">
            Bridal &amp; Event Styling, Tailored to Your Celebrations.
          </h1>

          <p className="text-base sm:text-lg text-[#15110F]/80 max-w-2xl leading-relaxed">
            From intimate haldi mornings to full reception glamour — personalised trials, skin
            prep, hairstyling, and draping in Mumbai.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href="#bridal-enquiry"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-[#C4262E] text-[#F5F0E8] font-display font-bold text-sm hover:bg-[#15110F] transition-colors"
            >
              <span>Request a Bridal Consultation →</span>
            </a>
            <Link
              to="/book"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full border border-[#15110F]/20 bg-[#F5F0E8] hover:bg-[#E9DDD0] text-sm font-semibold text-[#15110F]"
            >
              <Calendar size={15} />
              <span>Book a Bridal Trial Slot</span>
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5">
          <Img
            slot="bridal_hero"
            mask="arch"
            aspect="4/5"
            hoverZoom
            className="w-full border border-[#15110F]/15 shadow-lg"
          />
        </div>
      </section>

      {/* Bridal Services & Packages pulled from DB */}
      <section className="space-y-8 pb-16 border-b-[2.5px] border-[#15110F]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-[2.5px] border-[#15110F] pb-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="font-mono text-xs uppercase tracking-widest text-[#C4262E]">
                01 / Bridal &amp; Occasion Menu
              </div>
              <DieCutSticker variant="crown" rotate={-4} delay={0.08} />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#15110F] mt-1">
              Bridal &amp; Party Packages
            </h2>
          </div>
          <span className="font-mono text-xs text-[#15110F]/65">
            Custom multi-event bridal quotes available on consultation
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bridalPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-3xl bg-[#F5F0E8] border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F] p-6 flex flex-col justify-between gap-5"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display font-bold text-xl text-[#15110F]">
                    {pkg.name}
                  </h3>
                  <SampleTag isSample={pkg.is_sample} />
                </div>
                <p className="text-sm text-[#15110F]/75 leading-relaxed">
                  {pkg.description ||
                    'Includes skin prep, long-wear base, custom eye & lip styling, lashes, and coordinated hair.'}
                </p>
              </div>

              <div className="pt-4 border-t border-[#15110F]/12 flex items-center justify-between">
                <div className="font-mono">
                  <div className="text-base font-bold text-[#C4262E]">
                    from {formatINR(pkg.price)}
                  </div>
                  <div className="text-[11px] text-[#15110F]/65 inline-flex items-center gap-1">
                    <Clock size={11} />
                    <span>{pkg.duration_minutes} mins</span>
                  </div>
                </div>
                <Link
                  to={`/book?service=${pkg.id}`}
                  className="px-4 py-2 rounded-full bg-[#15110F] text-[#F5F0E8] hover:bg-[#C4262E] font-mono text-xs uppercase tracking-wider transition-colors"
                >
                  Book Slot →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4-Step Timeline */}
      <section className="pb-16 border-b-[2.5px] border-[#15110F] space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-widest text-[#C4262E]">
              02 / How It Works
            </div>
            <h2 className="font-display text-3xl font-bold text-[#15110F] mt-1">
              Your 4-Step Bridal Journey
            </h2>
          </div>
          <DieCutSticker variant="stamp" rotate={-5} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {BRIDAL_TIMELINE.map((item, idx) => (
            <div
              key={item.step}
              className="p-5 rounded-2xl bg-[#F5F0E8] border-2 border-[#15110F] shadow-[3px_3px_0px_#15110F] space-y-2.5"
            >
              <StickerDrop rotate={idx % 2 === 0 ? -3 : 3} delay={0.05 * idx} dropDistance={100}>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#F2C9C0] border border-[#15110F] shadow-[2px_2px_0px_#15110F] font-mono text-xs font-bold text-[#15110F]">
                  Step {item.step}
                </span>
              </StickerDrop>
              <h3 className="font-display font-bold text-lg text-[#15110F]">{item.title}</h3>
              <p className="text-xs text-[#15110F]/80 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bridal Lookbook */}
      {bridalGallery.length > 0 && (
        <section className="space-y-6 pb-16 border-b-[2.5px] border-[#15110F]">
          <div className="flex items-end justify-between border-b-[2.5px] border-[#15110F] pb-4">
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-widest text-[#C4262E]">
                03 / Bridal Lookbook
              </div>
              <h2 className="font-display text-3xl font-bold text-[#15110F] mt-1">
                Recent Makeup &amp; Bridal Work
              </h2>
            </div>
            <Link
              to="/gallery"
              className="font-mono text-xs font-bold uppercase tracking-wider text-[#C4262E] underline"
            >
              Full Lookbook →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {bridalGallery.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-3xl bg-[#E9DDD0] border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F]"
              >
                <Img
                  src={item.image_url === 'ILLUSTRATION_AFTER' ? null : item.image_url}
                  alt={item.caption || 'Bridal makeup look'}
                  aspect="4/5"
                  mask="arch"
                  illustrationFallback="bridal-veil-and-flowers"
                />
                <div className="mt-3 px-1 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#15110F]">
                    {item.caption || 'Bridal Studio Look'}
                  </span>
                  <SampleTag isSample={item.is_sample} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <CutLine />

      {/* Bridal Consultation Form */}
      <section id="bridal-enquiry" className="max-w-3xl mx-auto">
        <EnquiryFormCard
          type="bridal"
          title="Request a Bridal Consultation"
          subtitle="Share your wedding or event dates, venue, and bridal party size. Our senior bridal coordinator will call you to plan your trial."
          submitLabel="Request Bridal Callback →"
        />
      </section>
    </div>
  );
};
