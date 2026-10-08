import React, { useState } from 'react';
import { CheckCircle2, Send, AlertCircle, MessageCircle } from 'lucide-react';
import { submitPublicAcademyEnquiry } from '../../lib/content';
import { buildWhatsAppUrl } from '../../config/site';
import type { Course } from '../../types/database';

export type PublicFormType = 'general' | 'bridal' | 'academy';

interface EnquiryFormCardProps {
  type: PublicFormType;
  title?: string;
  subtitle?: string;
  courses?: Course[];
  selectedCourseId?: string;
  onCourseChange?: (courseId: string) => void;
  messagePrefix?: string;
  submitLabel?: string;
}

export const EnquiryFormCard: React.FC<EnquiryFormCardProps> = ({
  type,
  title = 'Send an Enquiry',
  subtitle = 'Our team typically responds within a few working hours.',
  courses = [],
  selectedCourseId = '',
  onCourseChange,
  messagePrefix = '',
  submitLabel = 'Submit Enquiry →',
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [courseId, setCourseId] = useState(selectedCourseId);
  const [eventDate, setEventDate] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [partySize, setPartySize] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Beginner');
  const [preferredStartMonth, setPreferredStartMonth] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedOk, setSubmittedOk] = useState(false);

  React.useEffect(() => {
    if (selectedCourseId) {
      setCourseId(selectedCourseId);
    }
  }, [selectedCourseId]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2 || name.trim().length > 80) {
      next.name = 'Please enter your full name (2–80 characters).';
    }
    const digits = phone.replace(/\D+/g, '');
    const normalizedPhone = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
    if (!/^[6-9][0-9]{9}$/.test(normalizedPhone)) {
      next.phone = 'Please enter a valid 10-digit Indian mobile number.';
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Please enter a valid email address.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (honeypot.trim()) {
      setSubmittedOk(true);
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    try {
      const digits = phone.replace(/\D+/g, '');
      const cleanPhone =
        digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;

      const extraDetails: string[] = [];
      if (type === 'bridal') {
        extraDetails.push('[Bridal Enquiry]');
        if (eventDate) extraDetails.push(`Event Date: ${eventDate}`);
        if (eventVenue) extraDetails.push(`Location/Venue: ${eventVenue}`);
        if (partySize) extraDetails.push(`Party Size: ${partySize}`);
      } else if (type === 'academy') {
        if (experienceLevel) extraDetails.push(`Experience Level: ${experienceLevel}`);
        if (preferredStartMonth) extraDetails.push(`Preferred Start: ${preferredStartMonth}`);
      }

      const fullMessage = [
        messagePrefix ? messagePrefix.trim() : '',
        extraDetails.length > 0 ? extraDetails.join(' | ') : '',
        message.trim(),
      ]
        .filter(Boolean)
        .join('\n\n');

      const res = await submitPublicAcademyEnquiry({
        full_name: name.trim(),
        phone: cleanPhone,
        email: email.trim().toLowerCase(),
        course_id: type === 'academy' && courseId ? courseId : null,
        message: fullMessage,
      });

      if (!res.ok) {
        setSubmitError(res.error || 'Could not submit enquiry right now.');
      } else {
        setSubmittedOk(true);
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to send enquiry right now.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedOk) {
    return (
      <div className="p-8 rounded-2xl bg-[#F5F0E8] border border-[#15110F]/15 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#9AAA94]/25 text-[#15110F] mx-auto flex items-center justify-center">
          <CheckCircle2 size={24} className="text-[#2E6F40]" />
        </div>
        <h3 className="font-display text-2xl font-bold text-[#15110F]">
          Thank you, {name}
        </h3>
        <p className="text-sm text-[#15110F]/75 max-w-md mx-auto">
          Your enquiry has been logged with Bbold Salon &amp; Academy. Our coordinator will reach
          out on <span className="font-mono font-medium text-[#15110F]">{phone}</span> shortly.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <a
            href={buildWhatsAppUrl(
              `Hi Bbold Salon & Academy, I just submitted an online enquiry (${name}).`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1E7B4F] text-white text-xs font-mono uppercase tracking-wider font-semibold"
          >
            <MessageCircle size={14} />
            <span>Chat on WhatsApp</span>
          </a>
          <button
            type="button"
            onClick={() => {
              setSubmittedOk(false);
              setMessage('');
            }}
            className="text-xs font-mono uppercase tracking-wider underline text-[#C4262E]"
          >
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="p-6 sm:p-8 rounded-2xl bg-[#F5F0E8] border border-[#15110F]/15 shadow-sm space-y-5"
    >
      <div>
        <h3 className="font-display text-2xl font-bold text-[#15110F]">{title}</h3>
        {subtitle && <p className="text-sm text-[#15110F]/70 mt-1">{subtitle}</p>}
      </div>

      {/* Honeypot anti-spam field */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor={`hp-${type}`}>Company Website</label>
        <input
          id={`hp-${type}`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {submitError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-[#C4262E]/10 border border-[#C4262E]/30 text-[#C4262E] text-xs flex items-start gap-2.5"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`enq-name-${type}`}
            className="block text-xs font-mono uppercase tracking-wider text-[#15110F]/80 mb-1.5"
          >
            Full Name *
          </label>
          <input
            id={`enq-name-${type}`}
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `err-name-${type}` : undefined}
            placeholder="Priya Sharma"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#15110F]/20 text-sm text-[#15110F] focus:outline-none focus:border-[#C4262E]"
          />
          {errors.name && (
            <p id={`err-name-${type}`} className="mt-1 text-xs text-[#C4262E]">
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor={`enq-phone-${type}`}
            className="block text-xs font-mono uppercase tracking-wider text-[#15110F]/80 mb-1.5"
          >
            10-Digit Mobile Number *
          </label>
          <input
            id={`enq-phone-${type}`}
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? `err-phone-${type}` : undefined}
            placeholder="9876543210"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#15110F]/20 text-sm font-mono text-[#15110F] focus:outline-none focus:border-[#C4262E]"
          />
          {errors.phone && (
            <p id={`err-phone-${type}`} className="mt-1 text-xs text-[#C4262E]">
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor={`enq-email-${type}`}
          className="block text-xs font-mono uppercase tracking-wider text-[#15110F]/80 mb-1.5"
        >
          Email Address *
        </label>
        <input
          id={`enq-email-${type}`}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? `err-email-${type}` : undefined}
          placeholder="you@example.com"
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#15110F]/20 text-sm text-[#15110F] focus:outline-none focus:border-[#C4262E]"
        />
        {errors.email && (
          <p id={`err-email-${type}`} className="mt-1 text-xs text-[#C4262E]">
            {errors.email}
          </p>
        )}
      </div>

      {/* Bridal specific fields */}
      {type === 'bridal' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label
              htmlFor="bridal-date"
              className="block text-xs font-mono uppercase tracking-wider text-[#15110F]/80 mb-1.5"
            >
              Event Date(s)
            </label>
            <input
              id="bridal-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#15110F]/20 text-sm font-mono text-[#15110F]"
            />
          </div>
          <div>
            <label
              htmlFor="bridal-venue"
              className="block text-xs font-mono uppercase tracking-wider text-[#15110F]/80 mb-1.5"
            >
              Venue / Area
            </label>
            <input
              id="bridal-venue"
              type="text"
              value={eventVenue}
              onChange={(e) => setEventVenue(e.target.value)}
              placeholder="Salon or Venue in Mumbai"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#15110F]/20 text-sm text-[#15110F]"
            />
          </div>
          <div>
            <label
              htmlFor="bridal-party"
              className="block text-xs font-mono uppercase tracking-wider text-[#15110F]/80 mb-1.5"
            >
              Bride + Party Size
            </label>
            <input
              id="bridal-party"
              type="text"
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              placeholder="e.g. Bride + 3 family"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#15110F]/20 text-sm text-[#15110F]"
            />
          </div>
        </div>
      )}

      {/* Academy specific fields */}
      {type === 'academy' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="sm:col-span-1">
            <label
              htmlFor="academy-course"
              className="block text-xs font-mono uppercase tracking-wider text-[#15110F]/80 mb-1.5"
            >
              Course of Interest
            </label>
            <select
              id="academy-course"
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                onCourseChange?.(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#15110F]/20 text-sm text-[#15110F]"
            >
              <option value="">Select a course...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="academy-exp"
              className="block text-xs font-mono uppercase tracking-wider text-[#15110F]/80 mb-1.5"
            >
              Experience Level
            </label>
            <select
              id="academy-exp"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#15110F]/20 text-sm text-[#15110F]"
            >
              <option value="Beginner">Complete Beginner</option>
              <option value="Intermediate">Working Junior Stylist</option>
              <option value="Pro Upskill">Experienced Pro Upskilling</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="academy-month"
              className="block text-xs font-mono uppercase tracking-wider text-[#15110F]/80 mb-1.5"
            >
              Preferred Batch Month
            </label>
            <input
              id="academy-month"
              type="text"
              value={preferredStartMonth}
              onChange={(e) => setPreferredStartMonth(e.target.value)}
              placeholder="e.g. Next month / Flexible"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#15110F]/20 text-sm text-[#15110F]"
            />
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor={`enq-msg-${type}`}
          className="block text-xs font-mono uppercase tracking-wider text-[#15110F]/80 mb-1.5"
        >
          Message / Requirements
        </label>
        <textarea
          id={`enq-msg-${type}`}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what look, service, or training dates you have in mind..."
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFFFFF] border border-[#15110F]/20 text-sm text-[#15110F] focus:outline-none focus:border-[#C4262E]"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#C4262E] text-[#F5F0E8] font-semibold text-sm hover:bg-[#15110F] transition-colors disabled:opacity-50"
      >
        <Send size={15} />
        <span>{submitting ? 'Sending...' : submitLabel}</span>
      </button>
    </form>
  );
};
