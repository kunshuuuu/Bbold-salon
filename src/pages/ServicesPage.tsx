import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Clock, Printer, Search, Sparkles, ArrowUpRight, MessageSquare } from 'lucide-react';
import { getPublicServices } from '../lib/content';
import { formatINR } from '../config/site';
import { SampleTag } from '../components/common/SampleTag';
import { CutLine, DieCutSticker } from '../components/public/GlobalEffects';
import type { AudienceType, Service } from '../types/database';

const CATEGORIES = ['All', 'Hair', 'Men', 'Nails', 'Makeup', 'Skin'] as const;

export const ServicesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = searchParams.get('category') || 'All';

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    CATEGORIES.includes(initialCat as (typeof CATEGORIES)[number]) ? initialCat : 'All'
  );
  const [audienceFilter, setAudienceFilter] = useState<'all' | AudienceType>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    getPublicServices().then((rows) => {
      if (!mounted) return;
      setServices(rows);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    if (cat === 'All') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', cat);
    }
    setSearchParams(searchParams, { replace: true });
  };

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (
        selectedCategory !== 'All' &&
        !s.category.toLowerCase().includes(selectedCategory.toLowerCase())
      ) {
        return false;
      }
      if (audienceFilter !== 'all') {
        const aud = s.audience || 'all';
        if (aud !== 'all' && aud !== audienceFilter) return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchDesc = (s.description || '').toLowerCase().includes(q);
        const matchCat = s.category.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [services, selectedCategory, audienceFilter, query]);

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const srv of filteredServices) {
      const existing = map.get(srv.category) || [];
      existing.push(srv);
      map.set(srv.category, existing);
    }
    return Array.from(map.entries()).filter(([, list]) => list.length > 0);
  }, [filteredServices]);

  return (
    <div className="py-12 lg:py-20 max-w-[1440px] mx-auto px-4 sm:px-8">
      <Helmet>
        <title>Services &amp; Price Menu — Bbold Salon &amp; Academy Mumbai</title>
        <meta
          name="description"
          content="Explore our complete menu of 55+ hair, men's grooming, nail extensions, bridal makeup, and skin facial services at Bbold Salon & Academy in Mumbai."
        />
      </Helmet>

      {/* Editorial Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-10 border-b-[2.5px] border-[#15110F]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8A317] border-2 border-[#15110F] font-mono text-xs font-bold uppercase tracking-widest text-[#15110F]">
              <Sparkles size={12} />
              <span>Full Salon Menu · Transparent Pricing</span>
            </div>
            <DieCutSticker variant="scissors" rotate={-4} />
            <DieCutSticker variant="comb" rotate={5} />
          </div>
          <h1 className="font-display font-extrabold text-h1 text-[#15110F]">
            Services &amp; Rate Card
          </h1>
          <p className="text-base text-[#15110F]/80 max-w-2xl">
            Every service begins with a one-on-one consultation. Final quotes for colour,
            treatments, and bridal packages depend on hair length, density, and custom art.
          </p>
        </div>

        <div className="flex items-center gap-3 no-print">
          <DieCutSticker variant="stamp" rotate={-6} className="hidden sm:inline-flex" />
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full border-2 border-[#15110F] bg-[#E9DDD0] hover:bg-[#E8A317] text-xs font-mono uppercase tracking-wider font-bold text-[#15110F] shadow-[3px_3px_0px_#15110F] transition-colors"
          >
            <Printer size={15} />
            <span>Print / Save Price List (PDF)</span>
          </button>
        </div>
      </div>

      {/* Sticky Sub-Nav Filter Bar */}
      <div className="sticky top-16 z-30 py-4 my-6 bg-[#F5F0E8]/95 backdrop-blur-md border-b-[2.5px] border-[#15110F] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 no-print">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategorySelect(cat)}
                className={`px-4 py-2 rounded-full font-mono text-xs uppercase tracking-wider shrink-0 transition-colors ${
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

        {/* Audience Toggle + Live Search */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div
            role="group"
            aria-label="Filter by audience"
            className="inline-flex rounded-full bg-[#E9DDD0]/80 p-1 border border-[#15110F]/10"
          >
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'women', label: 'Women' },
                { id: 'men', label: 'Men' },
              ] as const
            ).map((aud) => (
              <button
                key={aud.id}
                type="button"
                onClick={() => setAudienceFilter(aud.id)}
                className={`px-3.5 py-1 rounded-full font-mono text-[11px] uppercase tracking-wider transition-colors ${
                  audienceFilter === aud.id
                    ? 'bg-[#15110F] text-[#F5F0E8] font-semibold'
                    : 'text-[#15110F]/75 hover:text-[#15110F]'
                }`}
              >
                {aud.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 sm:w-64">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#15110F]/50"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search balayage, facial, nails..."
              aria-label="Search salon services"
              className="w-full pl-9 pr-4 py-2 rounded-full bg-[#FFFFFF] border border-[#15110F]/20 text-sm text-[#15110F] focus:outline-none focus:border-[#C4262E]"
            />
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      {loading ? (
        <div className="py-16 text-center font-mono text-xs uppercase tracking-widest text-[#15110F]/60">
          Loading salon menu...
        </div>
      ) : groupedByCategory.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[#E9DDD0]/35 rounded-3xl border border-[#15110F]/10">
          <p className="font-display text-xl font-bold text-[#15110F]">
            No services match your current filter.
          </p>
          <button
            type="button"
            onClick={() => {
              handleCategorySelect('All');
              setAudienceFilter('all');
              setQuery('');
            }}
            className="px-4 py-2 rounded-full bg-[#15110F] text-[#F5F0E8] font-mono text-xs uppercase tracking-wider"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-16">
          {groupedByCategory.map(([cat, list], idx) => (
            <section
              key={cat}
              className="space-y-6 pb-10 border-b-[2.5px] border-[#15110F]"
            >
              <div className="flex items-baseline justify-between border-b-[2.5px] border-[#15110F] pb-3">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-[#C4262E]">0{idx + 1}</span>
                  <h2 className="font-display text-3xl font-extrabold text-[#15110F]">
                    {cat}
                  </h2>
                </div>
                <span className="font-mono text-xs uppercase tracking-wider text-[#15110F]/60">
                  {list.length} {list.length === 1 ? 'service' : 'services'}
                </span>
              </div>

              <div className="divide-y divide-[#15110F]/12">
                {list.map((srv) => (
                  <div
                    key={srv.id}
                    className="py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#E9DDD0]/35 px-3 -mx-3 rounded-2xl transition-colors"
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-display font-bold text-lg text-[#15110F]">
                          {srv.name}
                        </h3>
                        {srv.audience && srv.audience !== 'all' && (
                          <span className="px-2 py-0.5 rounded-full bg-[#E9DDD0] text-[#15110F]/80 font-mono text-[10px] uppercase tracking-wider">
                            {srv.audience}
                          </span>
                        )}
                        <SampleTag isSample={srv.is_sample} />
                      </div>
                      {srv.description && (
                        <p className="text-sm text-[#15110F]/75">{srv.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0">
                      <div className="text-right font-mono">
                        <div className="text-sm font-bold text-[#15110F]">
                          from {formatINR(srv.price)}
                        </div>
                        <div className="text-[11px] text-[#15110F]/65 inline-flex items-center gap-1">
                          <Clock size={11} />
                          <span>{srv.duration_minutes} mins</span>
                        </div>
                      </div>

                      <Link
                        to={`/book?service=${srv.id}`}
                        className="no-print inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C4262E] text-[#F5F0E8] hover:bg-[#15110F] font-mono text-xs uppercase tracking-wider font-semibold transition-colors"
                      >
                        <span>Book →</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <CutLine className="my-12 no-print" />

      {/* Bottom Consultation Callout */}
      <div className="p-8 sm:p-10 rounded-3xl bg-[#E9DDD0]/70 border border-[#15110F]/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 no-print">
        <div className="space-y-2">
          <div className="font-mono text-xs uppercase tracking-widest text-[#C4262E]">
            Complimentary Texture &amp; Tone Check
          </div>
          <h3 className="font-display text-2xl font-bold text-[#15110F]">
            Not sure what you need? Book a consultation or message us.
          </h3>
          <p className="text-sm text-[#15110F]/75 max-w-xl">
            Our senior stylists can assess your hair history or skin goals in person before
            recommending any chemical, colour, or bridal service.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/book"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#C4262E] text-[#F5F0E8] font-semibold text-sm hover:bg-[#15110F] transition-colors"
          >
            <span>Book Appointment</span>
            <ArrowUpRight size={16} />
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full border border-[#15110F]/20 bg-[#F5F0E8] text-sm font-semibold text-[#15110F] hover:bg-[#E9DDD0]"
          >
            <MessageSquare size={15} />
            <span>Message Us</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
