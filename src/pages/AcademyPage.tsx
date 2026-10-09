import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ChevronDown, ChevronUp, GraduationCap, Sparkles } from 'lucide-react';
import { getPublicCourses } from '../lib/content';
import { formatINR } from '../config/site';
import { Img } from '../components/visual/Img';
import { SampleTag } from '../components/common/SampleTag';
import { EnquiryFormCard } from '../components/public/EnquiryFormCard';
import { CutLine, DieCutSticker, StickerDrop } from '../components/public/GlobalEffects';
import type { Course } from '../types/database';

export const AcademyPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    getPublicCourses().then((crs) => {
      if (!mounted) return;
      setCourses(crs);
      if (crs.length > 0) setExpandedCourseId(crs[0].id);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const pillars = [
    {
      num: '01',
      title: 'Live Salon Floor Practice',
      body:
        'Train with real tools, mannequin heads, and supervised model days inside an active Mumbai salon.',
    },
    {
      num: '02',
      title: 'Small Batch Mentorship',
      body:
        'Focused batch sizes so instructors can correct posture, sectioning, and blending in real time.',
    },
    {
      num: '03',
      title: 'Portfolio & Consultation Skills',
      body:
        'Graduate with photographed model work and practical client consultation confidence.',
    },
  ];

  const handleSelectCourseForEnquiry = (courseId: string) => {
    setSelectedCourseId(courseId);
    const el = document.getElementById('academy-enquiry-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="py-12 lg:py-20 max-w-[1440px] mx-auto px-4 sm:px-8 space-y-20">
      <Helmet>
        <title>Bbold Academy — Professional Hair, Makeup, Nails &amp; Cosmetology Courses Mumbai</title>
        <meta
          name="description"
          content="Hands-on professional beauty courses in hairdressing, bridal makeup, nail extensions, and cosmetology at Bbold Salon & Academy in Mumbai."
        />
      </Helmet>

      {/* Hero Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pb-16 border-b-[2.5px] border-[#15110F]">
        <div className="lg:col-span-7 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <StickerDrop rotate={-2} delay={0}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8A317] border-2 border-[#15110F] shadow-[2px_2px_0px_#15110F] font-mono text-xs font-bold uppercase tracking-widest text-[#15110F]">
                <GraduationCap size={14} className="text-[#C4262E]" />
                <span>Bbold Training Academy · Mumbai</span>
              </div>
            </StickerDrop>
            <DieCutSticker variant="academy-star" rotate={-4} delay={0.1} />
            <DieCutSticker variant="scissors" rotate={5} delay={0.2} />
          </div>

          <h1 className="font-display font-extrabold text-hero text-[#15110F]">
            Start Your Career in Hair, Makeup, Nails &amp; Skin.
          </h1>

          <p className="text-base sm:text-lg text-[#15110F]/80 max-w-2xl leading-relaxed">
            Hands-on training led by working stylists in Mumbai — structured for beginners and
            upskilling professionals.
          </p>

          <div className="pt-2">
            <a
              href="#academy-enquiry-section"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-[#C4262E] text-[#F5F0E8] font-display font-bold text-sm hover:bg-[#15110F] transition-colors"
            >
              <span>Enquire for Upcoming Batches →</span>
            </a>
          </div>
        </div>

        <div className="lg:col-span-5">
          <Img
            slot="academy_hero"
            mask="arch"
            aspect="4/5"
            hoverZoom
            className="w-full border border-[#15110F]/15 shadow-lg"
          />
        </div>
      </section>

      {/* Why Train at Bbold (3 Editorial Pillars) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-16 border-b-[2.5px] border-[#15110F]">
        {pillars.map((p, idx) => (
          <div
            key={p.num}
            className="p-7 rounded-3xl bg-[#E9DDD0] border-2 border-[#15110F] shadow-[4px_4px_0px_#15110F] space-y-3"
          >
            <StickerDrop rotate={idx % 2 === 0 ? -3 : 3} delay={idx * 0.08} dropDistance={110}>
              <span className="inline-block font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-[#E8A317] border border-[#15110F] shadow-[2px_2px_0px_#15110F] text-[#15110F]">
                Pillar {p.num}
              </span>
            </StickerDrop>
            <h2 className="font-display text-2xl font-bold text-[#15110F]">{p.title}</h2>
            <p className="text-sm text-[#15110F]/80 leading-relaxed">{p.body}</p>
          </div>
        ))}
      </section>

      {/* Courses Grid with Expandable Syllabus Accordion */}
      <section className="space-y-8 pb-16 border-b-[2.5px] border-[#15110F]">
        <div className="border-b-[2.5px] border-[#15110F] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="font-mono text-xs uppercase tracking-widest text-[#C4262E]">
                Curriculum &amp; Certification
              </div>
              <DieCutSticker variant="stamp" rotate={-5} delay={0.1} />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#15110F] mt-1">
              Professional Courses
            </h2>
          </div>
          <span className="font-mono text-xs text-[#15110F]/65">
            Click any course to inspect its module syllabus
          </span>
        </div>

        <div className="space-y-5">
          {courses.map((course, idx) => {
            const isExpanded = expandedCourseId === course.id;
            const lines = (course.description || '').split('\n').filter(Boolean);
            const overview = lines[0] || '';
            const bullets = lines.slice(1);

            return (
              <article
                key={course.id}
                className="rounded-3xl bg-[#F5F0E8] border border-[#15110F]/15 p-6 sm:p-8 shadow-sm transition-all"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-3">
                    <Img
                      slot="academy_class"
                      alt={course.name}
                      aspect="16/10"
                      mask="rounded"
                      illustrationFallback="salon-chair"
                      className="w-full border border-[#15110F]/10"
                    />
                  </div>

                  <div className="lg:col-span-9 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-xs text-[#C4262E]">
                            Course 0{idx + 1}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#E8A317]/25 font-mono text-xs text-[#15110F]">
                            {course.duration_text || 'Flexible Duration'}
                          </span>
                          <SampleTag isSample={course.is_sample} />
                        </div>
                        <h3 className="font-display text-2xl font-bold text-[#15110F] mt-1">
                          {course.name}
                        </h3>
                      </div>

                      <div className="text-left sm:text-right font-mono">
                        <div className="text-lg font-bold text-[#15110F]">
                          {course.fee ? formatINR(course.fee) : 'Fee on Enquiry'}
                        </div>
                        <div className="text-[11px] text-[#15110F]/60">
                          Kit &amp; batch schedule shared on call
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-[#15110F]/80 leading-relaxed">{overview}</p>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      {bullets.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCourseId(isExpanded ? null : course.id)
                          }
                          aria-expanded={isExpanded}
                          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[#15110F] hover:text-[#C4262E]"
                        >
                          <span>{isExpanded ? 'Hide Details' : 'View Course Details'}</span>
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSelectCourseForEnquiry(course.id)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#15110F] text-[#F5F0E8] hover:bg-[#C4262E] font-mono text-xs uppercase tracking-wider font-semibold transition-colors"
                      >
                        <Sparkles size={13} />
                        <span>Enquire for this course →</span>
                      </button>
                    </div>

                    {isExpanded && bullets.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-dashed border-[#15110F]/15">
                        <ul className="space-y-1.5 text-xs sm:text-sm text-[#15110F]/80 font-mono">
                          {bullets.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <CutLine />

      {/* Academy Enquiry Form */}
      <section id="academy-enquiry-section" className="max-w-3xl mx-auto">
        <EnquiryFormCard
          type="academy"
          title="Academy Course & Batch Enquiry"
          subtitle="Select a course below to receive the detailed syllabus, fee breakdown, and upcoming Mumbai batch dates."
          courses={courses}
          selectedCourseId={selectedCourseId}
          onCourseChange={setSelectedCourseId}
          submitLabel="Request Syllabus & Batch Dates →"
        />
      </section>
    </div>
  );
};
