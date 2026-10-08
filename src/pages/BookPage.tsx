import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  getPublicServices,
  getPublicStylists,
  getPublicBusinessHours,
  getPublicBlockedDates,
  getPublicSalonSettings,
  getPublicBusySlots,
} from '../lib/content';
import {
  computeAvailableSlots,
  formatDateYMD,
  getKolkataNow,
  parseDateYMD,
  type Slot,
} from '../lib/availability';
import { submitPublicBooking, findNextFreeChair } from '../lib/bookingClient';
import { downloadAppointmentIcs } from '../lib/calendar';
import {
  SITE_CONFIG,
  WEEKDAY_NAMES,
  formatINR,
  buildWhatsAppUrl,
  getRoomForCategory,
} from '../config/site';
import { useSiteData } from '../context/SiteDataContext';
import { SampleTag } from '../components/common/SampleTag';
import { Illustration } from '../components/visual/IllustrationKit';
import type {
  AudienceType,
  BlockedDate,
  BusinessHour,
  SalonSettings,
  Service,
  Stylist,
} from '../types/database';

const WIZARD_SESSION_KEY = 'bbold_booking_wizard_v1';

interface WizardStorageState {
  step: 1 | 2 | 3 | 4;
  serviceId: string;
  stylistChoice: string; // 'any' or stylist UUID
  dateStr: string;       // 'yyyy-MM-dd'
  startTimeStr: string;  // 'HH:mm:ss'
  fullName: string;
  phone: string;
  email: string;
  notes: string;
}

interface BookedConfirmation {
  id: string;
  service: Service;
  stylistName: string;
  dateStr: string;
  startTimeStr: string;
  endTimeStr: string;
  timeLabel: string;
  fullName: string;
  phone: string;
  email: string;
  notes: string;
}

export const BookPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { sampleEnabled } = useSiteData();

  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [salonSettings, setSalonSettings] = useState<SalonSettings | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const nowKolkata = useMemo(() => getKolkataNow(), []);
  const todayDate = useMemo(() => startOfDay(nowKolkata), [nowKolkata]);
  const todayStr = useMemo(() => formatDateYMD(todayDate), [todayDate]);

  // Restore saved state from sessionStorage
  const savedWizard = useMemo<Partial<WizardStorageState>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.sessionStorage.getItem(WIZARD_SESSION_KEY);
      return raw ? (JSON.parse(raw) as Partial<WizardStorageState>) : {};
    } catch {
      return {};
    }
  }, []);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(savedWizard.step || 1);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [audienceFilter, setAudienceFilter] = useState<'all' | AudienceType>('all');

  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    searchParams.get('service') || savedWizard.serviceId || ''
  );
  const [stylistChoice, setStylistChoice] = useState<string>(
    searchParams.get('stylist') || savedWizard.stylistChoice || 'any'
  );
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    savedWizard.dateStr && savedWizard.dateStr >= todayStr ? savedWizard.dateStr : todayStr
  );
  const [calendarMonth, setCalendarMonth] = useState<Date>(
    parseDateYMD(selectedDateStr) || todayDate
  );
  const [selectedStartTime, setSelectedStartTime] = useState<string>(
    savedWizard.startTimeStr || ''
  );

  // Slots for the selected date
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [busySlotsForDate, setBusySlotsForDate] = useState<
    Array<{ stylist_id: string | null; start_time: string; end_time: string }>
  >([]);

  // Step 04 form state
  const [fullName, setFullName] = useState(savedWizard.fullName || '');
  const [phone, setPhone] = useState(savedWizard.phone || '');
  const [email, setEmail] = useState(savedWizard.email || '');
  const [notes, setNotes] = useState(savedWizard.notes || '');
  const [consentChecked, setConsentChecked] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  // Field blur validation errors
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  // Success ticket state
  const [confirmation, setConfirmation] = useState<BookedConfirmation | null>(null);

  // Load initial catalog & schedule settings
  useEffect(() => {
    let mounted = true;
    async function loadCatalog() {
      setIsInitialLoading(true);
      const [srv, sty, bh, blk, set] = await Promise.all([
        getPublicServices(),
        getPublicStylists(),
        getPublicBusinessHours(),
        getPublicBlockedDates(),
        getPublicSalonSettings(),
      ]);
      if (!mounted) return;
      setServices(srv);
      setStylists(sty);
      setBusinessHours(bh);
      setBlockedDates(blk);
      setSalonSettings(set);

      // Deep-link handling for ?service= and ?stylist=
      const paramService = searchParams.get('service');
      const paramStylist = searchParams.get('stylist');
      if (paramService && srv.some((s) => s.id === paramService)) {
        setSelectedServiceId(paramService);
        if (paramStylist && sty.some((st) => st.id === paramStylist)) {
          setStylistChoice(paramStylist);
          setStep(3);
        } else if (step === 1) {
          setStep(2);
        }
      }
      setIsInitialLoading(false);
    }
    void loadCatalog();
    return () => {
      mounted = false;
    };
  }, [sampleEnabled, searchParams]);

  // Persist wizard state to sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined' || confirmation) return;
    const stateToSave: WizardStorageState = {
      step,
      serviceId: selectedServiceId,
      stylistChoice,
      dateStr: selectedDateStr,
      startTimeStr: selectedStartTime,
      fullName,
      phone,
      email,
      notes,
    };
    window.sessionStorage.setItem(WIZARD_SESSION_KEY, JSON.stringify(stateToSave));
  }, [
    step,
    selectedServiceId,
    stylistChoice,
    selectedDateStr,
    selectedStartTime,
    fullName,
    phone,
    email,
    notes,
    confirmation,
  ]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) || null,
    [services, selectedServiceId]
  );

  const selectedStylist = useMemo(
    () => (stylistChoice === 'any' ? null : stylists.find((s) => s.id === stylistChoice) || null),
    [stylists, stylistChoice]
  );

  // Fetch busy slots whenever selectedDateStr changes
  const refreshSlotsForDate = useCallback(async (dateStr: string) => {
    setSlotsLoading(true);
    try {
      const busy = await getPublicBusySlots(dateStr);
      setBusySlotsForDate(busy);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDateStr) {
      void refreshSlotsForDate(selectedDateStr);
    }
  }, [selectedDateStr, refreshSlotsForDate]);

  // Compute day availability using shared availability module
  const dayAvailability = useMemo(() => {
    if (!salonSettings || !selectedService) {
      return {
        dateStr: selectedDateStr,
        isClosed: false,
        isBlocked: false,
        isPastOrBeyondHorizon: false,
        reason: null,
        slots: [] as Slot[],
      };
    }
    const d = parseDateYMD(selectedDateStr) || todayDate;
    return computeAvailableSlots({
      date: d,
      service: selectedService,
      stylistChoice,
      businessHours,
      blockedDates,
      salonSettings,
      busySlots: busySlotsForDate,
      activeStylists: stylists,
      nowKolkata: getKolkataNow(),
    });
  }, [
    salonSettings,
    selectedService,
    selectedDateStr,
    todayDate,
    stylistChoice,
    businessHours,
    blockedDates,
    busySlotsForDate,
    stylists,
  ]);

  const selectedSlotObj = useMemo(
    () => dayAvailability.slots.find((s) => s.startTimeStr === selectedStartTime) || null,
    [dayAvailability.slots, selectedStartTime]
  );

  // Categories for Step 01 tabs
  const categories = useMemo(() => {
    const unique = Array.from(new Set(services.map((s) => s.category)));
    return ['All', ...unique];
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const catMatch = selectedCategory === 'All' || s.category === selectedCategory;
      const audMatch =
        audienceFilter === 'all' || s.audience === 'all' || s.audience === audienceFilter;
      return catMatch && audMatch;
    });
  }, [services, selectedCategory, audienceFilter]);

  // Helper to check if any calendar day is closed or blocked for tooltip display
  const getDayDisabledInfo = useCallback(
    (day: Date): { disabled: boolean; reason: string | null } => {
      const dStart = startOfDay(day);
      const dStr = formatDateYMD(dStart);
      if (isBefore(dStart, todayDate)) {
        return { disabled: true, reason: 'Past date' };
      }
      if (isBefore(addDays(todayDate, 60), dStart)) {
        return { disabled: true, reason: 'More than 60 days ahead' };
      }
      const blk = blockedDates.find((b) => b.blocked_date === dStr);
      if (blk) {
        return { disabled: true, reason: blk.reason || 'Closed on this date' };
      }
      const bh = businessHours.find((h) => h.weekday === dStart.getDay());
      if (!bh || !bh.is_open) {
        return { disabled: true, reason: `Closed on ${WEEKDAY_NAMES[dStart.getDay()]}s` };
      }
      return { disabled: false, reason: null };
    },
    [todayDate, blockedDates, businessHours]
  );

  // Quick chip: Jump to next free date & slot
  const handleSelectNextFree = async () => {
    if (!selectedService) return;
    setSlotsLoading(true);
    try {
      const next = await findNextFreeChair(
        selectedService,
        selectedStylist ? [selectedStylist] : stylists
      );
      if (next) {
        setSelectedDateStr(next.dateStr);
        const parsed = parseDateYMD(next.dateStr);
        if (parsed) setCalendarMonth(parsed);
        setSelectedStartTime(next.slot.startTimeStr);
      }
    } finally {
      setSlotsLoading(false);
    }
  };

  // Inline validation for Step 04
  const fieldErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    const trimmedName = fullName.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      errs.fullName = 'Enter your full name (2 to 80 characters).';
    }
    const cleanPhone = phone.replace(/\s+/g, '');
    if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      errs.phone = 'Enter a 10-digit Indian mobile number (starts with 6–9).';
    }
    const cleanEmail = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      errs.email = 'Enter a valid email address.';
    }
    if (notes.trim().length > 500) {
      errs.notes = 'Notes must be 500 characters or fewer.';
    }
    if (!consentChecked) {
      errs.consent = 'Please agree to be contacted about this appointment.';
    }
    return errs;
  }, [fullName, phone, email, notes, consentChecked]);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Honeypot check
    if (honeypot.trim() !== '') {
      return;
    }

    setTouched({
      fullName: true,
      phone: true,
      email: true,
      notes: true,
      consent: true,
    });

    if (Object.keys(fieldErrors).length > 0 || !selectedService || !selectedSlotObj) {
      setSubmitError('Please review the highlighted fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    const response = await submitPublicBooking({
      fullName,
      email,
      phone,
      serviceId: selectedService.id,
      stylistId: stylistChoice === 'any' ? null : stylistChoice,
      dateStr: selectedDateStr,
      startTimeStr: selectedSlotObj.startTimeStr,
      notes,
    });
    setIsSubmitting(false);

    if (!response.ok) {
      if (response.errorCode === 'slot_taken') {
        setSubmitError('That time was just taken');
        setSelectedStartTime('');
        await refreshSlotsForDate(selectedDateStr);
        setStep(3);
        return;
      }
      setSubmitError(response.errorMessage || 'Could not complete booking.');
      return;
    }

    const assignedStylistObj = stylists.find(
      (s) => s.id === (response.assignedStylistId || selectedSlotObj.stylistIds[0])
    );

    const confirmedTicket: BookedConfirmation = {
      id: response.appointmentId || 'pending-id',
      service: selectedService,
      stylistName:
        selectedStylist?.name ||
        assignedStylistObj?.name ||
        'First available stylist',
      dateStr: selectedDateStr,
      startTimeStr: selectedSlotObj.startTimeStr,
      endTimeStr: selectedSlotObj.endTimeStr,
      timeLabel: selectedSlotObj.label,
      fullName: fullName.trim(),
      phone: phone.replace(/\s+/g, ''),
      email: email.trim(),
      notes: notes.trim(),
    };

    setConfirmation(confirmedTicket);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(WIZARD_SESSION_KEY);
    }
  };

  const resetWizardForAnother = () => {
    setConfirmation(null);
    setSelectedStartTime('');
    setNotes('');
    setSubmitError(null);
    setStep(1);
    void refreshSlotsForDate(selectedDateStr);
  };

  const activeRoom = selectedService ? getRoomForCategory(selectedService.category) : 'hair';

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  // Group slots into Morning / Afternoon / Evening
  const groupedSlots = useMemo(() => {
    const groups: Record<'Morning' | 'Afternoon' | 'Evening', Slot[]> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };
    for (const s of dayAvailability.slots) {
      groups[s.period].push(s);
    }
    return groups;
  }, [dayAvailability.slots]);

  return (
    <div data-room={activeRoom} className="min-h-screen bg-[#F5F0E8] text-[#15110F] pb-28 lg:pb-16">
      <Helmet>
        <title>Reserve Your Appointment — {SITE_CONFIG.brandName}</title>
        <meta
          name="description"
          content="Book your haircut, colour, makeup, bridal trial, manicure, or facial appointment online at Bbold Salon & Academy in Mumbai."
        />
      </Helmet>

      {/* Clean, predictable top bar for /book */}
      <header className="sticky top-0 z-[100] h-[72px] bg-[#F5F0E8]/95 border-b border-[#15110F]/10 px-6 md:px-12 flex items-center justify-between">
        <Link
          to="/"
          className="font-display font-extrabold text-2xl tracking-tight text-[#15110F]"
        >
          {SITE_CONFIG.shortBrandName}
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#15110F]/80">
          <Link to="/services" className="hover:text-[#15110F] hover:underline underline-offset-4">
            Services
          </Link>
          <Link to="/team" className="hover:text-[#15110F] hover:underline underline-offset-4">
            Team
          </Link>
          <Link to="/bridal" className="hover:text-[#15110F] hover:underline underline-offset-4">
            Bridal
          </Link>
          <Link to="/academy" className="hover:text-[#15110F] hover:underline underline-offset-4">
            Academy
          </Link>
          <Link to="/contact" className="hover:text-[#15110F] hover:underline underline-offset-4">
            Contact
          </Link>
        </nav>

        <Link
          to="/services"
          className="text-xs font-mono uppercase tracking-wider text-[#15110F]/75 hover:text-[#15110F] underline underline-offset-4"
        >
          Back to menu
        </Link>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-10 pt-8 md:pt-12">
        {/* Global Alert Banner (e.g. slot_taken message) */}
        {submitError && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-[14px] bg-[#C4262E]/10 border border-[#C4262E] text-[#C4262E] flex items-center justify-between gap-4"
          >
            <span className="text-sm font-medium">{submitError}</span>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="font-mono text-xs uppercase underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SUCCESS STATE: Perforated Appointment Card Ticket */}
        {confirmation ? (
          <div className="max-w-[640px] mx-auto my-6 animate-[fadeIn_400ms_cubic-bezier(0.16,1,0.3,1)]">
            <div className="relative rounded-[28px] bg-[#FFFFFF] border border-[#15110F]/15 shadow-editorial overflow-hidden">
              {/* Top ticket header */}
              <div className="bg-[#15110F] text-[#F5F0E8] px-7 py-6">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#F2C9C0]">
                    Appointment Ticket · {SITE_CONFIG.shortBrandName} {SITE_CONFIG.city}
                  </span>
                  <span className="font-mono text-xs text-[#F5F0E8]/70">
                    #{confirmation.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold">
                  Request received: the salon will confirm shortly
                </h1>
                <p className="text-sm text-[#F5F0E8]/80 mt-1">
                  We have held your requested time slot as pending and our front desk will reach
                  out via call or WhatsApp.
                </p>
              </div>

              {/* Perforated divider with side notch circles */}
              <div className="relative flex items-center justify-between my-1">
                <span
                  aria-hidden="true"
                  className="w-6 h-6 -ml-3 rounded-full bg-[#F5F0E8] border border-[#15110F]/15"
                />
                <div className="flex-1 border-t-2 border-dashed border-[#15110F]/20 mx-2" />
                <span
                  aria-hidden="true"
                  className="w-6 h-6 -mr-3 rounded-full bg-[#F5F0E8] border border-[#15110F]/15"
                />
              </div>

              {/* Ticket Body Details */}
              <div className="px-7 py-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-mono-label text-[#15110F]/55">Service</div>
                    <div className="font-display text-lg font-bold mt-0.5">
                      {confirmation.service.name}
                    </div>
                    <div className="font-mono text-xs text-[#15110F]/70">
                      {confirmation.service.duration_minutes} mins ·{' '}
                      {formatINR(confirmation.service.price)}
                    </div>
                  </div>
                  <div>
                    <div className="text-mono-label text-[#15110F]/55">Stylist</div>
                    <div className="font-display text-lg font-bold mt-0.5">
                      {confirmation.stylistName}
                    </div>
                    <div className="font-mono text-xs text-[#15110F]/70">
                      {confirmation.service.category} Station
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#15110F]/10">
                  <div>
                    <div className="text-mono-label text-[#15110F]/55">Date (Asia/Kolkata)</div>
                    <div className="font-mono text-base font-medium mt-0.5">
                      {format(parseDateYMD(confirmation.dateStr) || new Date(), 'EEEE, d MMMM yyyy')}
                    </div>
                  </div>
                  <div>
                    <div className="text-mono-label text-[#15110F]/55">Time</div>
                    <div className="font-mono text-base font-medium mt-0.5">
                      {confirmation.timeLabel} ({confirmation.startTimeStr.slice(0, 5)} –{' '}
                      {confirmation.endTimeStr.slice(0, 5)} IST)
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#15110F]/10 text-sm space-y-1">
                  <div className="text-mono-label text-[#15110F]/55 mb-1">Client Details</div>
                  <div>
                    <span className="font-medium">{confirmation.fullName}</span> ·{' '}
                    <span className="font-mono">{confirmation.phone}</span> · {confirmation.email}
                  </div>
                  {confirmation.notes && (
                    <div className="text-[#15110F]/75 italic">“{confirmation.notes}”</div>
                  )}
                </div>

                {/* Ticket Actions */}
                <div className="pt-5 border-t border-[#15110F]/10 flex flex-col sm:flex-row flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      downloadAppointmentIcs({
                        id: confirmation.id,
                        serviceName: confirmation.service.name,
                        stylistName: confirmation.stylistName,
                        dateStr: confirmation.dateStr,
                        startTimeStr: confirmation.startTimeStr,
                        endTimeStr: confirmation.endTimeStr,
                        salonName: salonSettings?.salon_name || SITE_CONFIG.brandName,
                        salonAddress: salonSettings?.salon_address || SITE_CONFIG.city,
                        salonPhone:
                          salonSettings?.salon_phone || SITE_CONFIG.defaultPhoneDigits,
                      })
                    }
                    className="px-5 py-3 rounded-full bg-[#15110F] text-[#F5F0E8] text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
                  >
                    Add to calendar (.ics)
                  </button>

                  <a
                    href={buildWhatsAppUrl(
                      `Hi ${SITE_CONFIG.shortBrandName}, I just requested an appointment online:\n` +
                        `• Service: ${confirmation.service.name}\n` +
                        `• Stylist: ${confirmation.stylistName}\n` +
                        `• Date: ${confirmation.dateStr} at ${confirmation.timeLabel}\n` +
                        `• Name: ${confirmation.fullName} (${confirmation.phone})`,
                      salonSettings?.salon_phone
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 rounded-full bg-[#C4262E] text-white text-sm font-medium text-center hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Send details on WhatsApp
                  </a>

                  <button
                    type="button"
                    onClick={resetWizardForAnother}
                    className="px-5 py-3 rounded-full border border-[#15110F]/25 text-sm font-medium hover:bg-[#E9DDD0] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Book another
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* WIZARD STEPS 01..04 */
          <div>
            {/* Step Header + "01 / 04" Mono Indicator + Progress Line */}
            <div className="mb-8">
              <div className="flex flex-wrap items-baseline justify-between gap-4 mb-3">
                <div>
                  <span className="font-mono text-sm uppercase tracking-[0.12em] text-[#C4262E] font-medium">
                    0{step} / 04
                  </span>
                  <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">
                    {step === 1 && 'Choose your service'}
                    {step === 2 && 'Select your stylist'}
                    {step === 3 && 'Pick a date and time'}
                    {step === 4 && 'Your contact details'}
                  </h1>
                </div>

                {/* Stepper Breadcrumb Buttons */}
                <div className="flex items-center gap-2 font-mono text-xs">
                  {([1, 2, 3, 4] as const).map((sNum) => {
                    const canJump =
                      sNum === 1 ||
                      (sNum === 2 && Boolean(selectedService)) ||
                      (sNum === 3 && Boolean(selectedService)) ||
                      (sNum === 4 && Boolean(selectedService && selectedSlotObj));
                    return (
                      <button
                        key={sNum}
                        type="button"
                        disabled={!canJump}
                        onClick={() => canJump && setStep(sNum)}
                        className={`px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${
                          step === sNum
                            ? 'bg-[#15110F] text-[#F5F0E8]'
                            : canJump
                            ? 'bg-[#E9DDD0] text-[#15110F] hover:bg-[#15110F]/15 cursor-pointer'
                            : 'bg-[#E9DDD0]/40 text-[#15110F]/35 cursor-not-allowed'
                        }`}
                      >
                        0{sNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Progress Line */}
              <div className="w-full h-1.5 bg-[#E9DDD0] rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(step / 4) * 100}%`,
                    backgroundColor: 'var(--room, #C4262E)',
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left 8 Columns: Active Wizard Step */}
              <div className="lg:col-span-8">
                {isInitialLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className="h-24 rounded-[20px] bg-[#E9DDD0]/70 animate-pulse"
                      />
                    ))}
                  </div>
                ) : services.length === 0 ? (
                  <div className="p-10 rounded-[28px] bg-[#E9DDD0]/60 border border-[#15110F]/15 text-center">
                    <div className="w-24 h-28 mx-auto mb-4">
                      <Illustration name="comb-and-scissors" />
                    </div>
                    <h2 className="font-display text-2xl font-bold mb-2">
                      Online service menu is being updated
                    </h2>
                    <p className="text-sm text-[#15110F]/75 max-w-md mx-auto mb-6">
                      No active services are published right now. Message us on WhatsApp to reserve
                      your appointment directly.
                    </p>
                    <a
                      href={buildWhatsAppUrl('Hi Bbold, I would like to book an appointment.')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex px-6 py-3 rounded-full bg-[#C4262E] text-white text-sm font-medium"
                    >
                      Book on WhatsApp
                    </a>
                  </div>
                ) : (
                  <>
                    {/* STEP 01: SERVICE */}
                    {step === 1 && (
                      <div className="space-y-6">
                        {/* Category Tabs + Audience Filter */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#15110F]/10">
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            {categories.map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                                  selectedCategory === cat
                                    ? 'bg-[#15110F] text-[#F5F0E8]'
                                    : 'bg-[#E9DDD0]/75 text-[#15110F]/80 hover:bg-[#E9DDD0]'
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>

                          {/* Audience Segmented Filter */}
                          <div className="inline-flex items-center p-1 rounded-full bg-[#E9DDD0] self-start shrink-0">
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
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                                  audienceFilter === aud.id
                                    ? 'bg-[#F5F0E8] text-[#15110F] shadow-sm'
                                    : 'text-[#15110F]/70 hover:text-[#15110F]'
                                }`}
                              >
                                {aud.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Service List Rows */}
                        <div className="space-y-3">
                          {filteredServices.map((srv) => {
                            const isSelected = srv.id === selectedServiceId;
                            return (
                              <button
                                key={srv.id}
                                type="button"
                                onClick={() => {
                                  setSelectedServiceId(srv.id);
                                  setSelectedStartTime('');
                                  setStep(2);
                                }}
                                className={`w-full text-left p-5 rounded-[22px] border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                                  isSelected
                                    ? 'bg-[#FFFFFF] border-[#C4262E] ring-2 ring-[#C4262E]/20 shadow-editorial'
                                    : 'bg-[#FFFFFF]/80 border-[#15110F]/10 hover:border-[#15110F]/35 hover:bg-[#FFFFFF]'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-display text-lg font-bold text-[#15110F]">
                                      {srv.name}
                                    </span>
                                    <span className="text-xs text-[#15110F]/55">
                                      · {srv.category}
                                    </span>
                                    <SampleTag isSample={srv.is_sample} />
                                  </div>
                                  {srv.description && (
                                    <p className="text-sm text-[#15110F]/75 mt-1">
                                      {srv.description}
                                    </p>
                                  )}
                                </div>

                                <div className="text-right shrink-0 font-mono">
                                  <div className="text-base font-semibold text-[#15110F]">
                                    {formatINR(srv.price)}
                                  </div>
                                  <div className="text-xs text-[#15110F]/60 mt-0.5">
                                    {srv.duration_minutes} min
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* STEP 02: STYLIST */}
                    {step === 2 && (
                      <div className="space-y-4">
                        {/* First available option */}
                        <button
                          type="button"
                          onClick={() => {
                            setStylistChoice('any');
                            setSelectedStartTime('');
                            setStep(3);
                          }}
                          className={`w-full text-left p-5 rounded-[24px] border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                            stylistChoice === 'any'
                              ? 'bg-[#FFFFFF] border-[#C4262E] ring-2 ring-[#C4262E]/20 shadow-editorial'
                              : 'bg-[#FFFFFF]/80 border-[#15110F]/10 hover:border-[#15110F]/35'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-20 rounded-full bg-[#E9DDD0] flex items-center justify-center shrink-0 overflow-hidden p-2">
                              <Illustration name="salon-chair" animateOnView={false} />
                            </div>
                            <div>
                              <div className="font-display text-xl font-bold">First available</div>
                              <p className="text-sm text-[#15110F]/75 mt-0.5">
                                Shows the widest range of open time slots and assigns the first free
                                stylist at your chosen time.
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-xs uppercase tracking-wider px-3 py-1.5 rounded-full bg-[#E9DDD0] shrink-0">
                            Recommended
                          </span>
                        </button>

                        {/* Specific Active Stylists */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          {stylists.map((st) => {
                            const isSelected = stylistChoice === st.id;
                            return (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => {
                                  setStylistChoice(st.id);
                                  setSelectedStartTime('');
                                  setStep(3);
                                }}
                                className={`text-left p-5 rounded-[24px] border transition-all cursor-pointer flex items-start gap-4 ${
                                  isSelected
                                    ? 'bg-[#FFFFFF] border-[#C4262E] ring-2 ring-[#C4262E]/20 shadow-editorial'
                                    : 'bg-[#FFFFFF]/80 border-[#15110F]/10 hover:border-[#15110F]/35'
                                }`}
                              >
                                {/* Portrait in a capsule mask */}
                                <div className="w-16 h-24 rounded-full bg-[#E9DDD0] overflow-hidden shrink-0 border border-[#15110F]/10 flex items-center justify-center">
                                  {st.photo_url ? (
                                    <img
                                      src={st.photo_url}
                                      alt={st.name}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Illustration
                                      name={
                                        st.name === 'Dev' || st.name === 'Imran'
                                          ? 'man-profile-fade'
                                          : 'profile-bob'
                                      }
                                      animateOnView={false}
                                    />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-display text-lg font-bold">{st.name}</span>
                                    <SampleTag isSample={st.is_sample} />
                                  </div>
                                  <div className="text-xs text-[#15110F]/70 mt-0.5">{st.title}</div>
                                  <div className="text-xs font-mono text-[#15110F]/60 mt-2">
                                    {st.specialties.join(' · ')}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="pt-4">
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="text-xs font-mono uppercase tracking-wider text-[#15110F]/70 hover:text-[#15110F] cursor-pointer"
                          >
                            ← Back to service selection
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP 03: DATE & TIME */}
                    {step === 3 && (
                      <div className="space-y-6">
                        {/* Quick Chips: Today / Tomorrow / Next free */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-mono-label text-[#15110F]/60 mr-1">Quick pick:</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDateStr(todayStr);
                              setCalendarMonth(todayDate);
                              setSelectedStartTime('');
                            }}
                            className={`px-4 py-2 min-h-[44px] rounded-full text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                              selectedDateStr === todayStr
                                ? 'bg-[#15110F] text-[#F5F0E8]'
                                : 'bg-[#FFFFFF] border border-[#15110F]/15 hover:bg-[#E9DDD0]'
                            }`}
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const tom = addDays(todayDate, 1);
                              const tomStr = formatDateYMD(tom);
                              setSelectedDateStr(tomStr);
                              setCalendarMonth(tom);
                              setSelectedStartTime('');
                            }}
                            className={`px-4 py-2 min-h-[44px] rounded-full text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                              selectedDateStr === formatDateYMD(addDays(todayDate, 1))
                                ? 'bg-[#15110F] text-[#F5F0E8]'
                                : 'bg-[#FFFFFF] border border-[#15110F]/15 hover:bg-[#E9DDD0]'
                            }`}
                          >
                            Tomorrow
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSelectNextFree()}
                            className="px-4 py-2 min-h-[44px] rounded-full text-xs font-mono uppercase tracking-wider bg-[#C4262E] text-white hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            Next free
                          </button>
                        </div>

                        {/* Month Calendar Card */}
                        <div className="p-5 sm:p-6 rounded-[24px] bg-[#FFFFFF] border border-[#15110F]/10">
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="font-display text-xl font-bold">
                              {format(calendarMonth, 'MMMM yyyy')}
                            </h2>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setCalendarMonth(addMonths(calendarMonth, -1))}
                                className="px-3 py-1.5 rounded-full border border-[#15110F]/15 text-xs font-mono hover:bg-[#E9DDD0] cursor-pointer"
                                aria-label="Previous month"
                              >
                                Prev
                              </button>
                              <button
                                type="button"
                                onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                                className="px-3 py-1.5 rounded-full border border-[#15110F]/15 text-xs font-mono hover:bg-[#E9DDD0] cursor-pointer"
                                aria-label="Next month"
                              >
                                Next
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] uppercase text-[#15110F]/55 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                              <div key={d} className="py-1">
                                {d}
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 gap-1.5">
                            {calendarDays.map((day) => {
                              const dStr = formatDateYMD(day);
                              const inMonth = isSameMonth(day, calendarMonth);
                              const isSelected = dStr === selectedDateStr;
                              const isToday = isSameDay(day, todayDate);
                              const { disabled, reason } = getDayDisabledInfo(day);

                              return (
                                <button
                                  key={dStr}
                                  type="button"
                                  disabled={disabled}
                                  title={reason || format(day, 'EEEE, d MMMM yyyy')}
                                  onClick={() => {
                                    setSelectedDateStr(dStr);
                                    setSelectedStartTime('');
                                  }}
                                  className={`min-h-[44px] rounded-[12px] font-mono text-sm flex flex-col items-center justify-center transition-all relative ${
                                    !inMonth ? 'opacity-30' : ''
                                  } ${
                                    isSelected
                                      ? 'bg-[#C4262E] text-white font-semibold shadow-sm'
                                      : disabled
                                      ? 'bg-[#E9DDD0]/35 text-[#15110F]/30 cursor-not-allowed line-through'
                                      : 'bg-[#F5F0E8]/70 text-[#15110F] hover:bg-[#E9DDD0] cursor-pointer'
                                  }`}
                                >
                                  <span>{format(day, 'd')}</span>
                                  {isToday && !isSelected && (
                                    <span className="w-1 h-1 rounded-full bg-[#C4262E] mt-0.5" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Time Slots Panel */}
                        <div className="p-5 sm:p-6 rounded-[24px] bg-[#FFFFFF] border border-[#15110F]/10">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <h3 className="font-display text-lg font-bold">
                              Available slots ·{' '}
                              {format(parseDateYMD(selectedDateStr) || todayDate, 'EEE, d MMM')}
                            </h3>
                            <span className="font-mono text-xs text-[#15110F]/60">
                              All times in IST (Asia/Kolkata)
                            </span>
                          </div>

                          {slotsLoading ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                                <div
                                  key={n}
                                  className="h-[44px] rounded-[12px] bg-[#E9DDD0]/70 animate-pulse"
                                />
                              ))}
                            </div>
                          ) : dayAvailability.isBlocked || dayAvailability.isClosed ? (
                            <div className="py-8 text-center">
                              <p className="font-display text-lg font-bold text-[#15110F]">
                                {dayAvailability.reason || 'Closed on this day'}
                              </p>
                              <p className="text-sm text-[#15110F]/70 mt-1">
                                Try another date or click &ldquo;Next free&rdquo; above.
                              </p>
                            </div>
                          ) : dayAvailability.slots.length === 0 ? (
                            <div className="py-8 text-center">
                              <p className="font-display text-lg font-bold text-[#15110F]">
                                No free chairs this day. Try another date.
                              </p>
                              <button
                                type="button"
                                onClick={() => void handleSelectNextFree()}
                                className="mt-3 px-4 py-2 rounded-full bg-[#15110F] text-[#F5F0E8] text-xs font-mono uppercase tracking-wider cursor-pointer"
                              >
                                Jump to next free slot
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-5">
                              {(['Morning', 'Afternoon', 'Evening'] as const).map((period) => {
                                const list = groupedSlots[period];
                                if (list.length === 0) return null;
                                return (
                                  <div key={period}>
                                    <div className="text-mono-label text-[#15110F]/60 mb-2.5">
                                      {period}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                      {list.map((slot) => {
                                        const isChosen =
                                          slot.startTimeStr === selectedStartTime;
                                        return (
                                          <button
                                            key={slot.startTimeStr}
                                            type="button"
                                            onClick={() => {
                                              setSelectedStartTime(slot.startTimeStr);
                                              setStep(4);
                                            }}
                                            className={`min-h-[44px] px-3 py-2 rounded-[14px] font-mono text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                                              isChosen
                                                ? 'bg-[#C4262E] text-white shadow-editorial ring-2 ring-[#C4262E]/30'
                                                : 'bg-[#F5F0E8] text-[#15110F] border border-[#15110F]/15 hover:border-[#15110F]'
                                            }`}
                                          >
                                            {slot.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="text-xs font-mono uppercase tracking-wider text-[#15110F]/70 hover:text-[#15110F] cursor-pointer"
                          >
                            ← Back to stylist
                          </button>
                          {selectedSlotObj && (
                            <button
                              type="button"
                              onClick={() => setStep(4)}
                              className="px-6 py-3 rounded-full bg-[#C4262E] text-white text-sm font-medium cursor-pointer"
                            >
                              Continue to details →
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* STEP 04: CLIENT DETAILS */}
                    {step === 4 && (
                      <form
                        onSubmit={handleSubmitBooking}
                        noValidate
                        className="p-6 sm:p-8 rounded-[28px] bg-[#FFFFFF] border border-[#15110F]/10 space-y-5"
                      >
                        {/* Hidden Honeypot */}
                        <div className="hidden" aria-hidden="true">
                          <label htmlFor="bbold_company_website">Website</label>
                          <input
                            id="bbold_company_website"
                            type="text"
                            tabIndex={-1}
                            autoComplete="off"
                            value={honeypot}
                            onChange={(e) => setHoneypot(e.target.value)}
                          />
                        </div>

                        {/* Full Name (Floating Label) */}
                        <div className="relative">
                          <input
                            id="book-full-name"
                            type="text"
                            required
                            value={fullName}
                            onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder=" "
                            className="peer w-full px-4 pt-6 pb-2 rounded-[14px] bg-[#F5F0E8]/60 border border-[#15110F]/20 text-[#15110F] focus:outline-none focus:border-[#C4262E]"
                          />
                          <label
                            htmlFor="book-full-name"
                            className="absolute left-4 top-2 text-[11px] font-mono uppercase tracking-wider text-[#15110F]/60 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:font-sans peer-placeholder-shown:normal-case peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-mono peer-focus:uppercase"
                          >
                            Full name *
                          </label>
                          {touched.fullName && fieldErrors.fullName && (
                            <p className="text-xs text-[#C4262E] mt-1">{fieldErrors.fullName}</p>
                          )}
                        </div>

                        {/* Phone & Email Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="relative">
                            <input
                              id="book-phone"
                              type="tel"
                              inputMode="numeric"
                              maxLength={10}
                              required
                              value={phone}
                              onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
                              onChange={(e) =>
                                setPhone(e.target.value.replace(/\D+/g, '').slice(0, 10))
                              }
                              placeholder=" "
                              className="peer w-full px-4 pt-6 pb-2 rounded-[14px] bg-[#F5F0E8]/60 border border-[#15110F]/20 font-mono text-[#15110F] focus:outline-none focus:border-[#C4262E]"
                            />
                            <label
                              htmlFor="book-phone"
                              className="absolute left-4 top-2 text-[11px] font-mono uppercase tracking-wider text-[#15110F]/60 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:font-sans peer-placeholder-shown:normal-case peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-mono peer-focus:uppercase"
                            >
                              10-digit Indian mobile *
                            </label>
                            {touched.phone && fieldErrors.phone && (
                              <p className="text-xs text-[#C4262E] mt-1">{fieldErrors.phone}</p>
                            )}
                          </div>

                          <div className="relative">
                            <input
                              id="book-email"
                              type="email"
                              required
                              value={email}
                              onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder=" "
                              className="peer w-full px-4 pt-6 pb-2 rounded-[14px] bg-[#F5F0E8]/60 border border-[#15110F]/20 text-[#15110F] focus:outline-none focus:border-[#C4262E]"
                            />
                            <label
                              htmlFor="book-email"
                              className="absolute left-4 top-2 text-[11px] font-mono uppercase tracking-wider text-[#15110F]/60 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:font-sans peer-placeholder-shown:normal-case peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-mono peer-focus:uppercase"
                            >
                              Email address *
                            </label>
                            {touched.email && fieldErrors.email && (
                              <p className="text-xs text-[#C4262E] mt-1">{fieldErrors.email}</p>
                            )}
                          </div>
                        </div>

                        {/* Optional Notes */}
                        <div className="relative">
                          <textarea
                            id="book-notes"
                            rows={3}
                            maxLength={500}
                            value={notes}
                            onBlur={() => setTouched((p) => ({ ...p, notes: true }))}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder=" "
                            className="peer w-full px-4 pt-6 pb-2 rounded-[14px] bg-[#F5F0E8]/60 border border-[#15110F]/20 text-[#15110F] focus:outline-none focus:border-[#C4262E]"
                          />
                          <label
                            htmlFor="book-notes"
                            className="absolute left-4 top-2 text-[11px] font-mono uppercase tracking-wider text-[#15110F]/60"
                          >
                            Notes for your stylist (optional, max 500 chars)
                          </label>
                          {touched.notes && fieldErrors.notes && (
                            <p className="text-xs text-[#C4262E] mt-1">{fieldErrors.notes}</p>
                          )}
                        </div>

                        {/* Consent Checkbox */}
                        <div className="pt-1">
                          <label className="flex items-start gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={consentChecked}
                              onChange={(e) => {
                                setConsentChecked(e.target.checked);
                                setTouched((p) => ({ ...p, consent: true }));
                              }}
                              className="mt-1 w-4 h-4 accent-[#C4262E]"
                            />
                            <span className="text-sm text-[#15110F]/85">
                              I agree to be contacted about this appointment via phone, WhatsApp, or
                              email.
                            </span>
                          </label>
                          {touched.consent && fieldErrors.consent && (
                            <p className="text-xs text-[#C4262E] mt-1">{fieldErrors.consent}</p>
                          )}
                        </div>

                        <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#15110F]/10">
                          <button
                            type="button"
                            onClick={() => setStep(3)}
                            className="text-xs font-mono uppercase tracking-wider text-[#15110F]/70 hover:text-[#15110F] cursor-pointer"
                          >
                            ← Change date or time
                          </button>

                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-7 py-3.5 rounded-full bg-[#C4262E] text-white text-sm font-medium hover:opacity-95 disabled:opacity-50 transition-opacity cursor-pointer whitespace-nowrap"
                          >
                            {isSubmitting ? 'Reserving your slot...' : 'Reserve your appointment'}
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </div>

              {/* Right 4 Columns: Sticky Summary Panel on Desktop */}
              <aside className="hidden lg:block lg:col-span-4 sticky top-24">
                <div className="rounded-[28px] bg-[#FFFFFF] border border-[#15110F]/15 p-6 shadow-editorial">
                  <div className="flex items-center justify-between border-b border-[#15110F]/10 pb-4 mb-4">
                    <span className="text-mono-label text-[#15110F]/60">Appointment Summary</span>
                    <span className="font-mono text-xs text-[#C4262E]">Step 0{step} / 04</span>
                  </div>

                  <div className="space-y-4 text-sm">
                    <div>
                      <div className="text-mono-label text-[#15110F]/50">01 · Service</div>
                      {selectedService ? (
                        <div className="mt-1 flex items-baseline justify-between gap-2">
                          <span className="font-display font-bold text-base">
                            {selectedService.name}
                          </span>
                          <span className="font-mono font-semibold">
                            {formatINR(selectedService.price)}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[#15110F]/45 mt-0.5">Select a service</div>
                      )}
                    </div>

                    <div>
                      <div className="text-mono-label text-[#15110F]/50">02 · Stylist</div>
                      <div className="mt-1 font-medium">
                        {selectedStylist ? selectedStylist.name : 'First available stylist'}
                      </div>
                    </div>

                    <div>
                      <div className="text-mono-label text-[#15110F]/50">03 · Date &amp; Time</div>
                      {selectedSlotObj ? (
                        <div className="mt-1 font-mono text-xs">
                          <div>
                            {format(
                              parseDateYMD(selectedDateStr) || todayDate,
                              'EEEE, d MMM yyyy'
                            )}
                          </div>
                          <div className="text-[#C4262E] font-medium mt-0.5">
                            {selectedSlotObj.label} ({selectedService?.duration_minutes} min)
                          </div>
                        </div>
                      ) : (
                        <div className="text-[#15110F]/45 mt-0.5">Pick an open slot</div>
                      )}
                    </div>
                  </div>

                  {selectedService && (
                    <div className="mt-6 pt-4 border-t border-dashed border-[#15110F]/20 flex items-baseline justify-between">
                      <span className="text-mono-label text-[#15110F]/60">Estimated Total</span>
                      <span className="font-mono text-xl font-semibold">
                        {formatINR(selectedService.price)}
                      </span>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>

      {/* Collapsed Mobile Bottom Bar Summary (only during wizard steps) */}
      {!confirmation && selectedService && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-[150] bg-[#15110F] text-[#F5F0E8] border-t border-[#F5F0E8]/15 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
              className="text-left min-w-0 flex-1"
            >
              <div className="font-display font-bold text-sm truncate">
                {selectedService.name} · {formatINR(selectedService.price)}
              </div>
              <div className="font-mono text-[11px] text-[#F5F0E8]/75 truncate">
                {selectedStylist ? selectedStylist.name : 'First available'}
                {selectedSlotObj ? ` · ${selectedDateStr} ${selectedSlotObj.label}` : ''}
              </div>
            </button>

            {step < 4 && selectedSlotObj && (
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-4 py-2 rounded-full bg-[#C4262E] text-white text-xs font-mono uppercase tracking-wider shrink-0"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
