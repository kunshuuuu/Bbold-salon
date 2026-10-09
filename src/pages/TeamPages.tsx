import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Calendar, Clock, Sparkles } from 'lucide-react';
import {
  getPublicStylists,
  getPublicServices,
  getPublicGalleryItems,
} from '../lib/content';
import { formatINR } from '../config/site';
import { Img } from '../components/visual/Img';
import { SampleTag } from '../components/common/SampleTag';
import { DieCutSticker, StickerDrop } from '../components/public/GlobalEffects';
import type { GalleryItem, Service, Stylist } from '../types/database';

export const TeamPage: React.FC = () => {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getPublicStylists().then((rows) => {
      if (!mounted) return;
      setStylists(rows);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="py-12 lg:py-20 max-w-[1440px] mx-auto px-4 sm:px-8">
      <Helmet>
        <title>Stylists &amp; Team — Bbold Salon &amp; Academy Mumbai</title>
        <meta
          name="description"
          content="Meet the hair stylists, colourists, bridal makeup artists, nail technicians, and aestheticians at Bbold Salon & Academy in Mumbai."
        />
      </Helmet>

      <div className="space-y-3 pb-10 border-b-[2.5px] border-[#15110F] flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <StickerDrop rotate={-2} delay={0}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8A317] border-2 border-[#15110F] shadow-[2px_2px_0px_#15110F] font-mono text-xs font-bold uppercase tracking-widest text-[#15110F]">
                <Sparkles size={12} />
                <span>The Artists Behind the Chair</span>
              </div>
            </StickerDrop>
            <DieCutSticker variant="scissors" rotate={-4} delay={0.1} />
            <DieCutSticker variant="blowdryer" rotate={5} delay={0.2} />
          </div>
          <h1 className="font-display font-extrabold text-h1 text-[#15110F]">
            Meet Our Team
          </h1>
          <p className="text-base text-[#15110F]/80 max-w-2xl">
            Each specialist at Bbold Salon &amp; Academy brings focused expertise across hair,
            colour, bridal makeup, nail extensions, and skin care.
          </p>
        </div>
        <DieCutSticker variant="stamp" rotate={-6} />
      </div>

      {loading ? (
        <div className="py-16 text-center font-mono text-xs uppercase tracking-widest text-[#15110F]/60">
          Loading stylists...
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stylists.map((sty) => {
            const firstName = sty.name.split(' ')[0];
            return (
              <article
                key={sty.id}
                className="rounded-3xl bg-[#E9DDD0] border border-[#15110F]/15 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
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
                      className="w-full border border-[#15110F]/10"
                    />
                  </Link>

                  <div className="mt-5 flex items-start justify-between gap-2">
                    <div>
                      <Link
                        to={`/team/${sty.id}`}
                        className="font-display text-2xl font-bold text-[#15110F] hover:text-[#C4262E] transition-colors"
                      >
                        {sty.name}
                      </Link>
                      <div className="font-mono text-xs text-[#C4262E] mt-0.5">
                        {sty.title || 'Senior Stylist'}
                      </div>
                    </div>
                    <SampleTag isSample={sty.is_sample} />
                  </div>

                  {sty.bio && (
                    <p className="mt-3 text-sm text-[#15110F]/75 line-clamp-3 leading-relaxed">
                      {sty.bio}
                    </p>
                  )}

                  {sty.specialties && sty.specialties.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {sty.specialties.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-0.5 rounded-full bg-[#F5F0E8] border border-[#15110F]/15 font-mono text-[10px] uppercase tracking-wider text-[#15110F]/80"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[#15110F]/15 flex items-center justify-between gap-2">
                  <Link
                    to={`/book?stylist=${sty.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C4262E] text-[#F5F0E8] font-mono text-xs uppercase tracking-wider font-semibold hover:bg-[#15110F] transition-colors"
                  >
                    <Calendar size={13} />
                    <span>Book with {firstName} →</span>
                  </Link>
                  <Link
                    to={`/team/${sty.id}`}
                    className="font-mono text-xs uppercase tracking-wider text-[#15110F]/70 hover:text-[#15110F] underline underline-offset-4"
                  >
                    Full Bio
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const StylistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [stylist, setStylist] = useState<Stylist | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getPublicStylists(),
      getPublicServices(),
      getPublicGalleryItems(),
    ]).then(([styRows, srvRows, galRows]) => {
      if (!mounted) return;
      const found = styRows.find((s) => s.id === id) || null;
      setStylist(found);
      setServices(srvRows);
      setGallery(galRows);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [id]);

  const matchingServices = useMemo(() => {
    if (!stylist) return [];
    const specs = (stylist.specialties || []).map((s) => s.toLowerCase());
    if (specs.length === 0) return services.slice(0, 8);
    return services.filter((srv) => {
      const cat = srv.category.toLowerCase();
      return specs.some((sp) => sp.includes(cat) || cat.includes(sp));
    });
  }, [stylist, services]);

  const matchingGallery = useMemo(() => {
    if (!stylist) return [];
    const specs = (stylist.specialties || []).map((s) => s.toLowerCase());
    return gallery
      .filter((g) => g.category && specs.some((sp) => sp.includes(g.category!.toLowerCase())))
      .slice(0, 4);
  }, [stylist, gallery]);

  if (loading) {
    return (
      <div className="py-20 text-center font-mono text-xs uppercase tracking-widest text-[#15110F]/60">
        Loading stylist profile...
      </div>
    );
  }

  if (!stylist) {
    return (
      <div className="py-20 max-w-xl mx-auto px-4 text-center space-y-4">
        <h1 className="font-display text-3xl font-bold text-[#15110F]">Stylist Not Found</h1>
        <p className="text-sm text-[#15110F]/75">
          We couldn&apos;t find that team member profile.
        </p>
        <Link
          to="/team"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#15110F] text-[#F5F0E8] font-mono text-xs uppercase tracking-wider"
        >
          <ArrowLeft size={14} />
          <span>Back to Team</span>
        </Link>
      </div>
    );
  }

  const firstName = stylist.name.split(' ')[0];

  return (
    <div className="py-12 lg:py-20 max-w-[1440px] mx-auto px-4 sm:px-8 space-y-16">
      <Helmet>
        <title>{stylist.name} — {stylist.title || 'Stylist'} at Bbold Salon &amp; Academy</title>
      </Helmet>

      <div>
        <Link
          to="/team"
          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#15110F]/70 hover:text-[#C4262E]"
        >
          <ArrowLeft size={14} />
          <span>All Stylists</span>
        </Link>
      </div>

      {/* Profile Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start pb-12 border-b-[2.5px] border-[#15110F]">
        <div className="lg:col-span-4">
          <Img
            src={stylist.photo_url}
            alt={stylist.name}
            mask="arch"
            aspect="3/4"
            illustrationFallback="profile-bob"
            className="w-full border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F]"
          />
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <StickerDrop rotate={-2} delay={0}>
              <span className="inline-block px-3 py-1 rounded-full bg-[#E8A317] border-2 border-[#15110F] shadow-[2px_2px_0px_#15110F] font-mono text-xs font-bold uppercase tracking-wider text-[#15110F]">
                {stylist.title || 'Senior Stylist'}
              </span>
            </StickerDrop>
            <DieCutSticker variant="scissors" rotate={-4} delay={0.12} />
            <SampleTag isSample={stylist.is_sample} />
          </div>

          <h1 className="font-display font-extrabold text-h1 text-[#15110F]">
            {stylist.name}
          </h1>

          <p className="text-base sm:text-lg text-[#15110F]/80 leading-relaxed max-w-2xl">
            {stylist.bio ||
              `${stylist.name} is part of the Bbold Salon & Academy team in Mumbai, focusing on tailored consultations and precision execution.`}
          </p>

          {stylist.specialties && stylist.specialties.length > 0 && (
            <div className="space-y-2">
              <div className="font-mono text-xs font-bold uppercase tracking-widest text-[#15110F]/70">
                Specialities
              </div>
              <div className="flex flex-wrap gap-2">
                {stylist.specialties.map((sp) => (
                  <span
                    key={sp}
                    className="px-3.5 py-1.5 rounded-full bg-[#E9DDD0]/80 border-2 border-[#15110F] font-mono text-xs font-bold uppercase tracking-wider text-[#15110F]"
                  >
                    {sp}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4">
            <Link
              to={`/book?stylist=${stylist.id}`}
              className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-[#C4262E] text-[#F5F0E8] border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F] font-display font-bold text-base hover:bg-[#15110F] transition-colors"
            >
              <Calendar size={18} />
              <span>Book with {firstName} →</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Services Performed */}
      {matchingServices.length > 0 && (
        <section className="space-y-6 pb-12 border-b-[2.5px] border-[#15110F]">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#15110F]">
            Services with {firstName}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchingServices.slice(0, 8).map((srv) => (
              <Link
                key={srv.id}
                to={`/book?service=${srv.id}&stylist=${stylist.id}`}
                className="p-5 rounded-2xl bg-[#E9DDD0] hover:bg-[#F5F0E8] border-2 border-[#15110F] shadow-[3px_3px_0px_#15110F] flex items-center justify-between gap-4 transition-colors"
              >
                <div>
                  <div className="font-display font-bold text-base text-[#15110F]">
                    {srv.name}
                  </div>
                  <div className="text-xs font-mono text-[#15110F]/65 inline-flex items-center gap-1 mt-1">
                    <Clock size={11} />
                    <span>{srv.duration_minutes} mins</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-[#C4262E]">
                    from {formatINR(srv.price)}
                  </div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#15110F] mt-0.5">
                    Book →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Portfolio Work */}
      {matchingGallery.length > 0 && (
        <section className="space-y-6 pb-12 border-b-[2.5px] border-[#15110F]">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#15110F]">
            Lookbook Highlights
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {matchingGallery.map((g) => (
              <div
                key={g.id}
                className="p-3 rounded-3xl bg-[#E9DDD0] border border-[#15110F]/15"
              >
                <Img
                  src={g.image_url === 'ILLUSTRATION_AFTER' ? null : g.image_url}
                  alt={g.caption || 'Salon portfolio work'}
                  aspect="4/5"
                  mask="rounded"
                  illustrationFallback="hair-dryer"
                />
                <div className="mt-3 px-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-[#15110F] line-clamp-1">
                    {g.caption || g.category}
                  </span>
                  <SampleTag isSample={g.is_sample} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
