import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  GraduationCap,
  HeartHandshake,
  Mail,
  MapPin,
  MessageSquarePlus,
  Phone,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';
import {
  getPublicTestimonials,
  getPublicFaqs,
} from '../lib/content';
import { useSiteData } from '../context/SiteDataContext';
import { SITE_CONFIG, WEEKDAY_NAMES } from '../config/site';
import { Img } from '../components/visual/Img';
import { Illustration } from '../components/visual/IllustrationKit';
import { SampleTag } from '../components/common/SampleTag';
import { EnquiryFormCard } from '../components/public/EnquiryFormCard';
import {
  CutLine,
  DieCutSticker,
  StickerDrop,
  MarqueeBand,
} from '../components/public/GlobalEffects';
import type { FaqItem, Testimonial } from '../types/database';

// =============================================================================
// 1. /testimonials — Client Reviews + Rating Summary + Feedback Modal
// =============================================================================

export const TestimonialsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    getPublicTestimonials().then((rows) => {
      if (!mounted) return;
      setReviews(rows);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredReviews = useMemo(() => {
    if (selectedFilter === 'All') return reviews;
    return reviews.filter((r) =>
      (r.service_label || '').toLowerCase().includes(selectedFilter.toLowerCase())
    );
  }, [reviews, selectedFilter]);

  return (
    <div className="py-12 lg:py-20 max-w-[1440px] mx-auto px-4 sm:px-8 space-y-12">
      <Helmet>
        <title>Client Voices &amp; Reviews — Bbold Salon &amp; Academy Mumbai</title>
        <meta
          name="description"
          content="Read verified client testimonials and feedback for hair, makeup, nail, skin, and academy experiences at Bbold Salon & Academy in Mumbai."
        />
      </Helmet>

      {/* Section 1: Header */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-10 border-b-[2.5px] border-[#15110F]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <StickerDrop rotate={-2} delay={0}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E8A317] border-2 border-[#15110F] shadow-[2px_2px_0px_#15110F] font-mono text-xs font-bold uppercase tracking-widest text-[#15110F]">
                <Sparkles size={12} />
                <span>Client Voices</span>
              </div>
            </StickerDrop>
            <DieCutSticker variant="flower" rotate={-4} delay={0.1} />
            <DieCutSticker variant="lipstick" rotate={5} delay={0.2} />
          </div>
          <h1 className="font-display font-extrabold text-h1 text-[#15110F]">
            Words From the Chair
          </h1>
          <p className="text-base text-[#15110F]/80 max-w-2xl">
            Every review below comes from a salon client or academy student with explicit
            display consent.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <DieCutSticker variant="stamp" rotate={-6} className="hidden sm:inline-flex" />
          <button
            type="button"
            onClick={() => setFeedbackModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#C4262E] text-[#F5F0E8] border-2 border-[#15110F] shadow-[3px_3px_0px_#15110F] font-bold text-sm hover:bg-[#15110F] transition-colors shrink-0"
          >
            <MessageSquarePlus size={16} />
            <span>Visited us recently? Share your feedback →</span>
          </button>
        </div>
      </section>

      {/* Section 2: Filter Bar */}
      {reviews.length >= 3 && (
        <section className="pb-10 border-b-[2.5px] border-[#15110F]">
          <div className="p-6 sm:p-8 rounded-3xl bg-[#E9DDD0] border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-[#E8A317]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={18} fill="currentColor" stroke="#15110F" />
                ))}
              </div>
              <div className="font-mono text-xs font-bold text-[#15110F]">
                {reviews.length} verified client quotes with consent
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {['All', 'Hair', 'Balayage', 'Bridal', 'Gel', 'Facial', 'Beard'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedFilter(tag)}
                  className={`px-3.5 py-1.5 rounded-full font-mono text-xs font-bold uppercase tracking-wider border-2 border-[#15110F] transition-colors ${
                    selectedFilter === tag
                      ? 'bg-[#15110F] text-[#F5F0E8]'
                      : 'bg-[#F5F0E8] text-[#15110F] hover:bg-[#E8A317]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Section 3: Reviews Grid */}
      <section className="pb-12 border-b-[2.5px] border-[#15110F]">
        {loading ? (
          <div className="py-16 text-center font-mono text-xs uppercase tracking-widest text-[#15110F]/60">
            Loading reviews...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReviews.map((item) => (
              <article
                key={item.id}
                className="rounded-3xl bg-[#F5F0E8] border-2 border-[#15110F] p-6 sm:p-7 flex flex-col justify-between gap-5 shadow-[4px_4px_0px_#15110F]"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[#E8A317]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={15} fill="currentColor" stroke="#15110F" />
                      ))}
                    </div>
                    <SampleTag isSample={item.is_sample} />
                  </div>

                  <p className="text-base text-[#15110F]/90 font-medium leading-relaxed">
                    “{item.quote}”
                  </p>
                </div>

                <div className="pt-4 border-t-2 border-[#15110F] flex items-center justify-between gap-2">
                  <div>
                    <div className="font-display font-bold text-base text-[#15110F]">
                      {item.name}
                    </div>
                    {item.service_label && (
                      <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#C4262E]">
                        {item.service_label}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Share Feedback Modal */}
      {feedbackModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Share your feedback"
          className="fixed inset-0 z-[250] bg-[#15110F]/80 flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="relative max-w-xl w-full">
            <button
              type="button"
              onClick={() => setFeedbackModalOpen(false)}
              aria-label="Close modal"
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-[#E9DDD0] border-2 border-[#15110F] text-[#15110F] flex items-center justify-center"
            >
              <X size={18} />
            </button>
            <EnquiryFormCard
              type="general"
              title="Share Your Bbold Experience"
              subtitle="Tell us which service you had and what you loved. Reviews are published after staff moderation."
              messagePrefix="[Review Submission]"
              submitLabel="Submit Feedback →"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// 2. /about — Expanded Story, Philosophy, 4 Stations + Academy, Hygiene, Milestones & Stickers
// =============================================================================

const STUDIO_PILLARS = [
  {
    num: '01',
    title: 'Consultation-First Craft',
    sticker: 'scissors' as const,
    body: 'Before a single scissor snip or colour bowl is mixed, our senior stylists sit down with you to diagnose hair porosity, scalp health, skin undertone, and how much time you realistically spend styling every morning.',
  },
  {
    num: '02',
    title: 'Indian Hair & Skin Science',
    sticker: 'comb' as const,
    body: 'Mumbai humidity, hard water, and diverse Indian undertones require tailored formulations. From warm caramel balayages that flatter olive skin to barrier-safe facials, every technique is calibrated for local conditions.',
  },
  {
    num: '03',
    title: 'Unhurried Chair Time',
    sticker: 'blowdryer' as const,
    body: 'We never double-book chemical or bridal slots in a factory-line rush. Your appointment time is protected so sectioning, blending, nail prep, and massage rituals receive full artistic attention.',
  },
  {
    num: '04',
    title: 'Working Salon Educators',
    sticker: 'academy-star' as const,
    body: 'Because Bbold houses an active training academy under the same roof, our floor artists stay razor-sharp on modern geometry, international colour placement, and strict sanitation standards.',
  },
];

const HYGIENE_CHECKLIST = [
  {
    title: 'Hospital-Grade Autoclave & UV Sterilisation',
    detail:
      'All metal shears, cuticle nippers, tweezers, and comedone extractors undergo ultrasonic cleaning followed by medical-grade heat and UV-C cabinet sterilisation between every single guest.',
  },
  {
    title: 'Single-Use Disposables Protocol',
    detail:
      'Nail buffers, wooden spatulas, waxing strips, headland bands, and pedicure liners are strictly one-client-only and disposed of immediately after your service.',
  },
  {
    title: 'Mandatory 24–48 Hr Sensitivity Patch Testing',
    detail:
      'For first-time global colour, ammonia-free glosses, lash tints, or active chemical peels, we offer complimentary patch testing to guarantee zero allergic surprises.',
  },
  {
    title: 'Authentic Sealed Backbar Formulas',
    detail:
      'We mix hair colour, bond-builders, keratin treatments, and facial ampoules in front of your chair using 100% genuine, batch-verified professional products.',
  },
  {
    title: 'Dedicated Station Sanitisers & Clean Linen',
    detail:
      'Hydraulic chairs, shampoo basins, and nail tables are wiped down with hospital disinfectant after every client, paired with freshly laundered, sealed towels and capes.',
  },
  {
    title: 'Scalp & Skin Barrier First',
    detail:
      'We never push aggressive bleaching or over-exfoliation if your hair cortex or skin barrier needs restorative spa care first. Honest advice always comes before upselling.',
  },
];

const STUDIO_MILESTONES = [
  {
    phase: 'Chapter 01',
    title: 'The Neighbourhood Styling Floor',
    text: 'Founded in Mumbai with a clear mission: to bring editorial-grade haircutting, dimensional colour, and warm neighbourhood hospitality into one welcoming studio without pretentious salon intimidation.',
  },
  {
    phase: 'Chapter 02',
    title: 'Four Specialised Beauty Stations',
    text: 'Expanded into four dedicated zones — the Hair & Colour Lab, the Bridal & Occasion Makeup Suite, the Soft-Gel Nail Art Bar, and the Quiet Skin & Facial Room — each staffed by domain specialists.',
  },
  {
    phase: 'Chapter 03',
    title: 'Launching Bbold Training Academy',
    text: 'Opened our hands-on classroom floor so aspiring stylists, makeup artists, and nail technicians in Mumbai can learn real-world salon craft, client consultation, and hygiene directly from working pros.',
  },
  {
    phase: 'Chapter 04',
    title: '55+ Curated Services & Real-Time Booking',
    text: 'Today, Bbold combines 55+ transparent menu offerings across women’s and men’s grooming with instant online chair reservations and personalised bridal & academy mentorship.',
  },
];

export const AboutPage: React.FC = () => {
  return (
    <div>
      <Helmet>
        <title>Our Story, Philosophy &amp; Hygiene Standards — Bbold Salon &amp; Academy Mumbai</title>
        <meta
          name="description"
          content="Discover the full story of Bbold Salon & Academy in Mumbai — our consultation-first philosophy, four specialised beauty stations, hospital-grade hygiene standards, and hands-on training academy."
        />
      </Helmet>

      {/* =====================================================================
          SECTION 1: HERO & EXTENDED ORIGIN STORY (With Dark Black Bottom Border & Animated Stickers)
         ===================================================================== */}
      <section className="py-14 lg:py-24 border-b-[2.5px] border-[#15110F] relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <StickerDrop rotate={-2} delay={0}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E8A317] border-2 border-[#15110F] shadow-[3px_3px_0px_#15110F] font-mono text-xs font-bold uppercase tracking-widest text-[#15110F]">
                  <Sparkles size={13} className="text-[#C4262E]" />
                  <span>About Bbold Salon &amp; Academy · Mumbai</span>
                </div>
              </StickerDrop>
              <DieCutSticker variant="scissors" rotate={-4} delay={0.1} />
              <DieCutSticker variant="blowdryer" rotate={5} delay={0.2} />
            </div>

            <div className="p-6 sm:p-8 rounded-3xl bg-[#F5F0E8] border-[3px] border-[#15110F] shadow-[6px_6px_0px_#15110F] space-y-3">
              <div className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#C4262E]">
                Est. Mumbai · Four Stations + Pro Academy
              </div>
              <h1 className="font-display font-black text-[clamp(2.4rem,5vw,4.5rem)] leading-[1.02] tracking-tight text-[#15110F]">
                Craft, Conversation &amp;{' '}
                <span className="text-[#C4262E] text-stroke-shadow-md">
                  Clean Technique
                </span>{' '}
                in Mumbai.
              </h1>
            </div>

            <div className="space-y-4 text-base sm:text-lg text-[#15110F]/90 leading-relaxed max-w-2xl">
              <p>
                <strong>Bbold Salon &amp; Academy</strong> was born from a simple observation in
                Mumbai: clients were forced to choose between rushed, assembly-line neighbourhood
                parlours or intimidating luxury salons where stylists barely listened. We built
                Bbold to be the third space — a warm, sunlit editorial studio where technical
                precision meets genuine conversation.
              </p>
              <p>
                Whether you are walking in for a sharp 30-minute beard sculpt, spending four hours
                in the colour chair for a custom hand-painted balayage, prepping your skin for your
                wedding week, or enrolling in our professional diploma courses, every experience at
                Bbold is anchored in honesty, hygiene, and wearable artistry.
              </p>
              <p>
                Our floor is divided into four dedicated specialist stations —{' '}
                <strong>Hair &amp; Colour</strong>, <strong>Bridal &amp; Event Makeup</strong>,{' '}
                <strong>Gel &amp; Nail Art</strong>, and <strong>Skin &amp; Facials</strong> — alongside
                the <strong>Bbold Training Academy</strong>, where working senior educators mentor
                the next generation of Mumbai beauty professionals.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/book"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-[#C4262E] text-[#F5F0E8] border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F] font-display font-bold text-sm hover:bg-[#15110F] transition-colors"
              >
                <Calendar size={16} />
                <span>Book an Appointment →</span>
              </Link>
              <Link
                to="/team"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-full border-2 border-[#15110F] bg-[#F5F0E8] hover:bg-[#E8A317] text-sm font-bold text-[#15110F] shadow-[3px_3px_0px_#15110F] transition-colors"
              >
                <Users size={16} />
                <span>Meet Our Stylists</span>
              </Link>
              <Link
                to="/academy"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-full border-2 border-[#15110F] bg-[#E9DDD0] hover:bg-[#F2C9C0] text-sm font-bold text-[#15110F] shadow-[3px_3px_0px_#15110F] transition-colors"
              >
                <GraduationCap size={16} />
                <span>Explore Academy</span>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="hidden sm:block absolute -top-6 -right-4 z-20">
              <DieCutSticker variant="crown" rotate={7} />
            </div>
            <div className="p-3 rounded-3xl bg-[#E9DDD0] border-[3px] border-[#15110F] shadow-[6px_6px_0px_#15110F]">
              <Img
                slot="about_story"
                mask="arch"
                aspect="4/5"
                hoverZoom
                className="w-full border-2 border-[#15110F]"
              />
            </div>
            <div className="hidden sm:block absolute -bottom-8 -left-8 z-20">
              <DieCutSticker variant="stamp" rotate={-8} />
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: MARQUEE STRIP (Yellow with Black Borders, Infinite Loop)
         ===================================================================== */}
      <MarqueeBand
        phrases={[
          'Consultation First, Always',
          'Four Dedicated Salon Stations',
          'Hospital-Grade Tool Sterilisation',
          'Custom Balayage & Indian Texture Care',
          'Hands-On Professional Beauty Academy',
          'Transparent Rate Card · No Hidden Upsells',
        ]}
      />

      {/* =====================================================================
          SECTION 3: OUR 4-PILLAR STUDIO PHILOSOPHY (With Dark Black Bottom Border)
         ===================================================================== */}
      <section className="py-16 lg:py-24 bg-transparent border-b-[2.5px] border-[#15110F]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-[2.5px] border-[#15110F] pb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#C4262E]">
                  01 / The Bbold Manifesto
                </span>
                <DieCutSticker variant="sparkle-badge" rotate={-3} />
              </div>
              <h2 className="font-display font-extrabold text-h1 text-[#15110F]">
                Four Principles That Guide Every Chair
              </h2>
            </div>
            <p className="text-sm sm:text-base text-[#15110F]/80 max-w-md font-medium">
              Great hair and skin never happen by accident. Here is how we approach every guest who
              walks through our doors in Mumbai.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {STUDIO_PILLARS.map((pillar) => (
              <article
                key={pillar.num}
                className="p-7 sm:p-8 rounded-3xl bg-[#F5F0E8] border-2 border-[#15110F] shadow-[5px_5px_0px_#15110F] flex flex-col justify-between gap-4"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <StickerDrop rotate={-2} delay={0.04} dropDistance={110}>
                      <span className="inline-block px-3 py-1 rounded-full bg-[#E8A317] border-2 border-[#15110F] shadow-[2px_2px_0px_#15110F] font-mono text-xs font-bold uppercase tracking-widest text-[#15110F]">
                        Pillar {pillar.num}
                      </span>
                    </StickerDrop>
                    <DieCutSticker variant={pillar.sticker} rotate={4} delay={0.14} />
                  </div>
                  <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#15110F]">
                    {pillar.title}
                  </h3>
                  <p className="text-sm sm:text-base text-[#15110F]/85 leading-relaxed">
                    {pillar.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 4: INSIDE OUR MUMBAI STUDIO & CLASSROOM FLOOR (With Dark Black Bottom Border)
         ===================================================================== */}
      <section className="py-16 lg:py-24 border-b-[2.5px] border-[#15110F]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-[2.5px] border-[#15110F] pb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#C4262E]">
                  02 / Inside the Studio
                </span>
                <DieCutSticker variant="nail-polish" rotate={-4} />
                <DieCutSticker variant="lipstick" rotate={5} />
              </div>
              <h2 className="font-display font-extrabold text-h1 text-[#15110F]">
                Designed for Calm, Light &amp; Craft
              </h2>
            </div>
            <p className="text-sm sm:text-base text-[#15110F]/80 max-w-md">
              Every zone at Bbold is color-coded and acoustically zoned so lively blowouts and
              quiet facial rituals coexist effortlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-5 rounded-3xl bg-[#E9DDD0] border-2 border-[#15110F] shadow-[5px_5px_0px_#15110F] space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <Img
                  slot="about_space_1"
                  aspect="4/3"
                  mask="rounded"
                  className="border-2 border-[#15110F]"
                />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#C4262E]">
                    Zone 01 · Crimson &amp; Paper
                  </span>
                  <DieCutSticker variant="scissors" rotate={-3} className="scale-90" />
                </div>
                <h3 className="font-display text-2xl font-bold text-[#15110F]">
                  Hair &amp; Colour Cutting Floor
                </h3>
                <p className="text-sm text-[#15110F]/80 leading-relaxed">
                  Equipped with daylight-balanced CRI 95+ mirrors so hair colour, highlights, and
                  balayage tones look identical indoors and out in natural Mumbai sunlight. Includes
                  deep-recline ceramic backwash stations for scalp detox spas.
                </p>
              </div>
              <Link
                to="/services?category=Hair"
                className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-[#C4262E] hover:text-[#15110F] pt-2 border-t-2 border-[#15110F]"
              >
                <span>Explore Hair Services →</span>
              </Link>
            </div>

            <div className="p-5 rounded-3xl bg-[#E9DDD0] border-2 border-[#15110F] shadow-[5px_5px_0px_#15110F] space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <Img
                  slot="about_space_2"
                  aspect="4/3"
                  mask="rounded"
                  className="border-2 border-[#15110F]"
                />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#C4262E]">
                    Zone 02 · Blush, Marigold &amp; Sage
                  </span>
                  <DieCutSticker variant="mirror" rotate={4} className="scale-90" />
                </div>
                <h3 className="font-display text-2xl font-bold text-[#15110F]">
                  Nail Bar, Bridal &amp; Facial Suites
                </h3>
                <p className="text-sm text-[#15110F]/80 leading-relaxed">
                  Our dust-extracted gel nail bar sits alongside a private bridal trial vanity and
                  a quiet, sage-toned aesthetic room where hydrating facials, D-tan rituals, and
                  chemical peels are performed in calm privacy.
                </p>
              </div>
              <Link
                to="/bridal"
                className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-[#C4262E] hover:text-[#15110F] pt-2 border-t-2 border-[#15110F]"
              >
                <span>Explore Bridal &amp; Nail Suites →</span>
              </Link>
            </div>

            <div className="p-5 rounded-3xl bg-[#E9DDD0] border-2 border-[#15110F] shadow-[5px_5px_0px_#15110F] space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <Img
                  slot="about_space_3"
                  aspect="4/3"
                  mask="rounded"
                  className="border-2 border-[#15110F]"
                />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#C4262E]">
                    Zone 03 · Espresso &amp; Marigold
                  </span>
                  <DieCutSticker variant="academy-star" rotate={-4} className="scale-90" />
                </div>
                <h3 className="font-display text-2xl font-bold text-[#15110F]">
                  Bbold Training Classroom
                </h3>
                <p className="text-sm text-[#15110F]/80 leading-relaxed">
                  A dedicated demonstration and practice wing where students train on mannequin
                  heads, colour wheels, and supervised live models under the eye of senior salon
                  educators.
                </p>
              </div>
              <Link
                to="/academy"
                className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-[#C4262E] hover:text-[#15110F] pt-2 border-t-2 border-[#15110F]"
              >
                <span>Explore Academy Courses →</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 5: OUR JOURNEY & MILESTONES IN MUMBAI (With Dark Black Bottom Border)
         ===================================================================== */}
      <section className="py-16 lg:py-24 bg-[#15110F] text-[#F5F0E8] border-b-[2.5px] border-[#15110F]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-[#F5F0E8]/25 pb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <StickerDrop rotate={-2} delay={0.02}>
                  <span className="inline-block px-3 py-1 rounded-full bg-[#E8A317] text-[#15110F] font-mono text-xs font-bold uppercase tracking-widest">
                    03 / Our Evolution
                  </span>
                </StickerDrop>
                <DieCutSticker variant="comb" rotate={-5} delay={0.14} />
              </div>
              <h2 className="font-display font-extrabold text-h1 text-[#F5F0E8]">
                How Bbold Grew in Mumbai
              </h2>
            </div>
            <DieCutSticker variant="stamp" rotate={6} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STUDIO_MILESTONES.map((m) => (
              <div
                key={m.phase}
                className="p-6 rounded-3xl bg-[#F5F0E8]/[0.07] border-2 border-[#F5F0E8]/25 hover:border-[#E8A317] transition-colors space-y-3"
              >
                <span className="inline-block px-3 py-1 rounded-full bg-[#C4262E] text-[#F5F0E8] font-mono text-xs font-bold uppercase tracking-wider">
                  {m.phase}
                </span>
                <h3 className="font-display text-xl font-bold text-[#F5F0E8]">{m.title}</h3>
                <p className="text-sm text-[#F5F0E8]/80 leading-relaxed">{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 6: HOSPITAL-GRADE HYGIENE & PRODUCT STANDARDS (With Dark Black Bottom Border)
         ===================================================================== */}
      <section className="py-16 lg:py-24 border-b-[2.5px] border-[#15110F]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 space-y-12">
          <div className="p-8 sm:p-12 rounded-3xl bg-[#D7DFD4] border-2 border-[#15110F] shadow-[6px_6px_0px_#15110F] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <StickerDrop rotate={-2} delay={0.02}>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F5F0E8] border-2 border-[#15110F] shadow-[2px_2px_0px_#15110F] font-mono text-xs font-bold uppercase tracking-widest text-[#15110F]">
                    <ShieldCheck size={16} className="text-[#2E6F40]" />
                    <span>04 / Hygiene &amp; Studio Protocol</span>
                  </div>
                </StickerDrop>
                <DieCutSticker variant="flower" rotate={-4} delay={0.12} />
                <DieCutSticker variant="sparkle-badge" rotate={5} delay={0.22} />
              </div>
              <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-[#15110F]">
                Uncompromising Hygiene &amp; Product Integrity
              </h2>
              <p className="text-base sm:text-lg text-[#15110F]/85 leading-relaxed">
                Clean beauty starts with clean tools. Whether you are getting a gel manicure, a
                classic clean-up, or a full bridal transformation, our sanitation checklist is
                strictly enforced between every single guest.
              </p>
            </div>
            <div className="lg:col-span-4 flex justify-center">
              <div className="p-6 rounded-full bg-[#F5F0E8] border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F]">
                <Illustration name="facial-jar-and-leaf" className="w-36 h-36" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {HYGIENE_CHECKLIST.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-[#F5F0E8] border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F] space-y-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={20} className="text-[#2E6F40] shrink-0" />
                  <h3 className="font-display font-bold text-lg text-[#15110F]">
                    {item.title}
                  </h3>
                </div>
                <p className="text-sm text-[#15110F]/80 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 7: FINAL CTA BANNER (With Dark Black Bottom Border)
         ===================================================================== */}
      <section className="py-16 lg:py-24 bg-[#C4262E] text-[#F5F0E8] border-b-[2.5px] border-[#15110F]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 text-center space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <DieCutSticker variant="scissors" rotate={-5} delay={0.02} />
            <DieCutSticker variant="stamp" rotate={6} delay={0.14} />
            <DieCutSticker variant="lipstick" rotate={-3} delay={0.24} />
          </div>
          <h2 className="font-display font-black text-3xl sm:text-5xl text-[#F5F0E8] text-stroke-shadow-md max-w-3xl mx-auto">
            Experience the Bbold difference in person.
          </h2>
          <p className="text-base sm:text-lg text-[#F5F0E8]/90 max-w-xl mx-auto">
            Book your chair online in 60 seconds, or drop by our Mumbai studio for a complimentary
            hair and skin consultation.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <Link
              to="/book"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#F5F0E8] text-[#15110F] border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F] font-display font-bold text-base hover:bg-[#E8A317] transition-colors"
            >
              <Calendar size={18} />
              <span>Book Your Chair →</span>
            </Link>
            <Link
              to="/services"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-[#15110F] text-[#F5F0E8] border-2 border-[#F5F0E8] font-mono text-xs uppercase tracking-wider font-bold hover:bg-[#E8A317] hover:text-[#15110F] hover:border-[#15110F] transition-colors"
            >
              <span>Browse Full Menu →</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

// =============================================================================
// 3. /contact — Address, Phone, Live Hours Table, Map & General Enquiry Form
// =============================================================================

export const ContactPage: React.FC = () => {
  const { salonSettings, businessHours } = useSiteData();
  const todayDow = new Date().getDay();
  const todayRule = businessHours.find((h) => h.weekday === todayDow);

  const orderedHours = useMemo(() => {
    return [...businessHours].sort((a, b) => a.weekday - b.weekday);
  }, [businessHours]);

  const mapsQueryUrl = useMemo(() => {
    const query = [
      salonSettings.salon_name || 'Bbold Salon & Academy',
      salonSettings.salon_address && !salonSettings.salon_address.startsWith('TODO')
        ? salonSettings.salon_address
        : 'Mumbai',
    ]
      .filter(Boolean)
      .join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }, [salonSettings]);

  return (
    <div className="py-12 lg:py-20 max-w-[1440px] mx-auto px-4 sm:px-8 space-y-16">
      <Helmet>
        <title>Contact, Location &amp; Opening Hours — Bbold Salon &amp; Academy Mumbai</title>
        <meta
          name="description"
          content="Get in touch with Bbold Salon & Academy in Mumbai. View our opening hours, salon address, phone number, and send an online enquiry."
        />
      </Helmet>

      {/* Section 1: Header */}
      <section className="space-y-3 pb-10 border-b-[2.5px] border-[#15110F] flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <StickerDrop rotate={-2} delay={0}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E8A317] border-2 border-[#15110F] shadow-[2px_2px_0px_#15110F] font-mono text-xs font-bold uppercase tracking-widest text-[#15110F]">
                <MapPin size={12} />
                <span>Visit or Call Us in Mumbai</span>
              </div>
            </StickerDrop>
            <DieCutSticker variant="blowdryer" rotate={-4} delay={0.1} />
            <DieCutSticker variant="scissors" rotate={5} delay={0.2} />
          </div>
          <h1 className="font-display font-extrabold text-h1 text-[#15110F]">
            Contact &amp; Studio Hours
          </h1>
        </div>
        <DieCutSticker variant="stamp" rotate={-6} />
      </section>

      {/* Section 2: Contact Details + Live Hours + Form */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start pb-16 border-b-[2.5px] border-[#15110F]">
        {/* Left 5 Columns: Direct Contact + Live Business Hours + Map Card */}
        <div className="lg:col-span-5 space-y-8">
          {/* Contact Details Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#E9DDD0] border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F] space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-[#15110F]">
                Studio Desk
              </h2>
              <DieCutSticker variant="crown" rotate={4} className="scale-90" />
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-[#C4262E] shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#15110F]/70">
                    Address
                  </div>
                  <div className="font-medium text-[#15110F] mt-0.5">
                    {salonSettings.salon_address || SITE_CONFIG.todoAddress}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone size={18} className="text-[#C4262E] shrink-0 mt-0.5" />
                <div>
                  <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#15110F]/70">
                    Phone / WhatsApp
                  </div>
                  {salonSettings.salon_phone ? (
                    <a
                      href={`tel:${salonSettings.salon_phone}`}
                      className="font-mono font-bold text-[#15110F] underline"
                    >
                      {salonSettings.salon_phone}
                    </a>
                  ) : (
                    <span className="text-[#15110F]/70">
                      Phone configurable in Admin → Salon settings
                    </span>
                  )}
                </div>
              </div>

              {salonSettings.salon_email && (
                <div className="flex items-start gap-3">
                  <Mail size={18} className="text-[#C4262E] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#15110F]/70">
                      Email
                    </div>
                    <span className="font-mono text-[#15110F]">
                      {salonSettings.salon_email}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Business Hours Table */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#F5F0E8] border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F] space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b-2 border-[#15110F]">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-[#C4262E]" />
                <h2 className="font-display text-xl font-bold text-[#15110F]">
                  Opening Hours
                </h2>
              </div>

              <span
                className={`px-3 py-1 rounded-full font-mono text-[11px] uppercase tracking-wider font-bold border border-[#15110F] ${
                  todayRule && todayRule.is_open
                    ? 'bg-[#9AAA94] text-[#15110F]'
                    : 'bg-[#F2C9C0] text-[#15110F]'
                }`}
              >
                {todayRule && todayRule.is_open
                  ? `Open today · Closes at ${todayRule.end_time.slice(0, 5)}`
                  : 'Closed today'}
              </span>
            </div>

            <div className="divide-y divide-[#15110F]/20 text-sm">
              {orderedHours.map((h) => {
                const isToday = h.weekday === todayDow;
                return (
                  <div
                    key={h.weekday}
                    className={`py-2.5 flex items-center justify-between ${
                      isToday ? 'font-bold text-[#C4262E]' : 'text-[#15110F]/85'
                    }`}
                  >
                    <span>
                      {WEEKDAY_NAMES[h.weekday]} {isToday ? '(Today)' : ''}
                    </span>
                    <span className="font-mono text-xs font-semibold">
                      {!h.is_open
                        ? 'Closed'
                        : `${h.start_time.slice(0, 5)} – ${h.end_time.slice(0, 5)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Styled Address Card with Google Maps Link */}
          <div className="p-6 rounded-3xl bg-[#E9DDD0] border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Illustration name="salon-chair" className="w-16 h-16 shrink-0" />
              <div>
                <div className="font-display font-bold text-base text-[#15110F]">
                  Bbold Salon &amp; Academy · Mumbai
                </div>
                <p className="text-xs text-[#15110F]/75">
                  Open directions in Google Maps
                </p>
              </div>
            </div>
            <a
              href={mapsQueryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#15110F] text-[#F5F0E8] font-mono text-xs uppercase tracking-wider font-bold shrink-0 hover:bg-[#C4262E] transition-colors"
            >
              <span>Open Maps</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Right 7 Columns: General Enquiry Form */}
        <div className="lg:col-span-7">
          <EnquiryFormCard
            type="general"
            title="Send Us a Message"
            subtitle="Have a question about a hair colour correction, service pricing, or group booking? Drop us a note below."
          />
        </div>
      </section>
    </div>
  );
};

// =============================================================================
// 4. /faq — Animated Category-Grouped Accordion + FAQPage JSON-LD
// =============================================================================

export const FaqPage: React.FC = () => {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getPublicFaqs().then((rows) => {
      if (!mounted) return;
      setFaqs(rows);
      if (rows.length > 0) setOpenId(rows[0].id);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, FaqItem[]>();
    for (const item of faqs) {
      const cat = item.category || 'General';
      const list = map.get(cat) || [];
      list.push(item);
      map.set(cat, list);
    }
    return Array.from(map.entries());
  }, [faqs]);

  const faqJsonLd = useMemo(() => {
    return JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    });
  }, [faqs]);

  return (
    <div className="py-12 lg:py-20 max-w-4xl mx-auto px-4 sm:px-8 space-y-12">
      <Helmet>
        <title>Frequently Asked Questions — Bbold Salon &amp; Academy Mumbai</title>
        <meta
          name="description"
          content="Answers to common questions about booking, cancellations, bridal trials, skin patch tests, and Bbold Academy courses in Mumbai."
        />
        {faqs.length > 0 && <script type="application/ld+json">{faqJsonLd}</script>}
      </Helmet>

      <section className="space-y-3 pb-8 border-b-[2.5px] border-[#15110F] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#C4262E]">
              Help &amp; Policies
            </span>
            <DieCutSticker variant="comb" rotate={-4} />
          </div>
          <h1 className="font-display font-extrabold text-h1 text-[#15110F]">
            Frequently Asked Questions
          </h1>
        </div>
        <DieCutSticker variant="stamp" rotate={5} />
      </section>

      <div className="space-y-10">
        {grouped.map(([category, list]) => (
          <section
            key={category}
            className="space-y-4 pb-10 border-b-[2.5px] border-[#15110F]"
          >
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#C4262E]">
              {category}
            </h2>
            <div className="space-y-3">
              {list.map((item) => {
                const isOpen = openId === item.id;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-[#E9DDD0] border-2 border-[#15110F] shadow-[3px_3px_0px_#15110F] overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : item.id)}
                      aria-expanded={isOpen}
                      className="w-full p-5 text-left flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-display font-bold text-lg text-[#15110F]">
                          {item.question}
                        </span>
                        <SampleTag isSample={item.is_sample} />
                      </div>
                      {isOpen ? (
                        <ChevronUp size={18} className="text-[#C4262E] shrink-0" />
                      ) : (
                        <ChevronDown size={18} className="text-[#15110F] shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-sm text-[#15110F]/85 leading-relaxed border-t-2 border-[#15110F] pt-3 bg-[#F5F0E8]">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="text-center space-y-4 pb-8 border-b-[2.5px] border-[#15110F]">
        <p className="font-display text-xl font-bold text-[#15110F]">
          Still have a question?
        </p>
        <div className="flex justify-center gap-3">
          <Link
            to="/contact"
            className="px-6 py-3 rounded-full bg-[#15110F] text-[#F5F0E8] border-2 border-[#15110F] font-mono text-xs font-bold uppercase tracking-wider"
          >
            Contact Us →
          </Link>
          <Link
            to="/book"
            className="px-6 py-3 rounded-full bg-[#C4262E] text-[#F5F0E8] border-2 border-[#15110F] font-mono text-xs font-bold uppercase tracking-wider"
          >
            Book Online →
          </Link>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// 5. /privacy & /terms — Legal Pages
// =============================================================================

export const LegalPage: React.FC<{ mode: 'privacy' | 'terms' }> = ({ mode }) => {
  const isPrivacy = mode === 'privacy';
  const title = isPrivacy ? 'Privacy Policy' : 'Cancellation & Terms of Service';
  const body = isPrivacy
    ? `Bbold Salon & Academy respects your privacy.\n\n1. Information We Collect: When you book an appointment or submit an academy/bridal enquiry, we collect your name, phone number, email address, and service preferences.\n\n2. How We Use Your Details: Contact details are used solely to confirm your appointment, send reminders, or respond to your course/bridal enquiry. We never sell or rent client contact lists.\n\n3. Data Security: Booking records are stored with Row-Level Security (RLS) so that personal client details are accessible only to authorised salon staff.`
    : `1. Rescheduling & Cancellations: Appointments may be rescheduled or cancelled with at least 4 hours prior notice via phone or WhatsApp.\n\n2. Service Pricing: Menu prices listed as "from ₹..." are starting rates. Final quotes for hair colour, chemical treatments, nail extensions, and bridal packages depend on hair length, density, and in-salon consultation.\n\n3. Patch Testing: We recommend a 24–48 hour patch test prior to global hair colour or chemical skin peels for sensitive skin.`;

  return (
    <div className="py-16 lg:py-24 max-w-3xl mx-auto px-4 sm:px-8 space-y-8">
      <Helmet>
        <title>{title} — Bbold Salon &amp; Academy Mumbai</title>
      </Helmet>

      <div className="space-y-2 border-b-[2.5px] border-[#15110F] pb-6 flex items-center justify-between gap-4">
        <div>
          <div className="font-mono text-xs font-bold uppercase tracking-widest text-[#C4262E]">
            Bbold Salon &amp; Academy · Mumbai
          </div>
          <h1 className="font-display text-4xl font-extrabold text-[#15110F] mt-1">{title}</h1>
        </div>
        <DieCutSticker variant="scissors" rotate={-4} />
      </div>

      <div className="p-8 rounded-3xl bg-[#E9DDD0] border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F] prose prose-neutral max-w-none text-base text-[#15110F]/90 leading-relaxed whitespace-pre-line">
        {body}
      </div>
    </div>
  );
};

// =============================================================================
// 6. * — Custom 404 NotFoundPage with SVG Illustration
// =============================================================================

export const NotFoundPage: React.FC = () => {
  return (
    <div className="py-20 lg:py-28 max-w-2xl mx-auto px-4 text-center space-y-6 border-b-[2.5px] border-[#15110F]">
      <Helmet>
        <title>Page Not Found — Bbold Salon &amp; Academy</title>
      </Helmet>

      <div className="w-40 h-40 mx-auto rounded-full bg-[#E9DDD0] border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F] flex items-center justify-center p-6">
        <Illustration name="comb-and-scissors" className="w-full h-full" />
      </div>

      <div className="font-mono text-xs font-bold uppercase tracking-widest text-[#C4262E]">
        Error 404
      </div>

      <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-[#15110F]">
        Looks like a tangled comb — this page doesn&apos;t exist.
      </h1>

      <p className="text-base text-[#15110F]/80 max-w-md mx-auto">
        The link you followed may have moved or been mistyped. Let&apos;s get you back to the
        styling floor.
      </p>

      <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/"
          className="px-6 py-3.5 rounded-full bg-[#15110F] text-[#F5F0E8] border-2 border-[#15110F] font-mono text-xs uppercase tracking-wider font-bold hover:bg-[#C4262E] transition-colors"
        >
          Back to Home
        </Link>
        <Link
          to="/book"
          className="px-6 py-3.5 rounded-full bg-[#C4262E] text-[#F5F0E8] border-2 border-[#15110F] font-mono text-xs uppercase tracking-wider font-bold hover:bg-[#15110F] transition-colors"
        >
          Book an Appointment →
        </Link>
      </div>
    </div>
  );
};
