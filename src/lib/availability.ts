import {
  addDays,
  addHours,
  addMinutes,
  format,
  isBefore,
  isAfter,
  startOfDay,
} from 'date-fns';
import { WEEKDAY_NAMES } from '../config/site';
import { getUniversalValue, pushKeyToUniversalServer } from './universalStore';
import type {
  Appointment,
  BlockedDate,
  BusinessHour,
  BusySlot,
  SalonSettings,
  Service,
  Stylist,
} from '../types/database';

export interface TimeParts {
  hours: number;
  minutes: number;
  seconds: number;
}

export interface Slot {
  start: Date;
  end: Date;
  startTimeStr: string; // 'HH:mm:ss'
  endTimeStr: string;   // 'HH:mm:ss'
  label: string;        // e.g. '10:30 AM'
  period: 'Morning' | 'Afternoon' | 'Evening';
  stylistIds: string[];
}

export interface AvailabilityInput {
  date: Date; // Date representing the target calendar day (year, month, day)
  service: Service | null | undefined;
  stylistChoice: string; // stylist UUID or 'any'
  businessHours: BusinessHour[];
  blockedDates: BlockedDate[];
  salonSettings: SalonSettings;
  busySlots: BusySlot[];
  activeStylists: Stylist[];
  nowKolkata?: Date; // Optional override for deterministic unit tests
}

export interface DayAvailabilityResult {
  dateStr: string; // 'yyyy-MM-dd'
  isClosed: boolean;
  isBlocked: boolean;
  isPastOrBeyondHorizon: boolean;
  reason: string | null;
  slots: Slot[];
}

/**
 * Returns a Date object whose local getters (getFullYear, getMonth, getDate, getHours, getMinutes)
 * match the current wall-clock time in Asia/Kolkata, regardless of the browser's timezone.
 */
export function getKolkataNow(referenceDate: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(referenceDate);
  const map: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = parseInt(part.value, 10);
    }
  }

  const hour = map.hour === 24 ? 0 : map.hour || 0;
  return new Date(
    map.year || 2026,
    (map.month || 1) - 1,
    map.day || 1,
    hour,
    map.minute || 0,
    map.second || 0,
    0
  );
}

/**
 * Safely parses 'HH:mm' or 'HH:mm:ss' into numeric hours, minutes, seconds.
 */
export function parseTimeStr(timeStr: string | null | undefined): TimeParts | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = match[3] ? parseInt(match[3], 10) : 0;
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    Number.isNaN(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }
  return { hours, minutes, seconds };
}

/**
 * Combines a calendar Date (year, month, day) with TimeParts into a real Date object.
 */
export function combineDateAndTime(calendarDate: Date, time: TimeParts): Date {
  return new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth(),
    calendarDate.getDate(),
    time.hours,
    time.minutes,
    time.seconds,
    0
  );
}

/**
 * Formats a Date object as 'yyyy-MM-dd' safely.
 */
export function formatDateYMD(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return format(getKolkataNow(), 'yyyy-MM-dd');
  }
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parses a 'yyyy-MM-dd' string into a local calendar Date at 00:00:00 without UTC shift.
 */
export function parseDateYMD(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const d = new Date(year, month, day, 0, 0, 0, 0);
  if (
    Number.isNaN(d.getTime()) ||
    d.getFullYear() !== year ||
    d.getMonth() !== month ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

/**
 * Formats a 'HH:mm:ss' string into human-readable '10:30 AM' using a real Date.
 */
export function formatTimeStringLabel(timeStr: string): string {
  const parts = parseTimeStr(timeStr);
  if (!parts) return timeStr;
  const d = combineDateAndTime(new Date(2026, 0, 1), parts);
  return format(d, 'h:mm a');
}

/**
 * Overlap check: new_start < existing_end AND new_end > existing_start
 */
export function intervalsOverlap(
  newStart: Date,
  newEnd: Date,
  existingStart: Date,
  existingEnd: Date
): boolean {
  return newStart.getTime() < existingEnd.getTime() && newEnd.getTime() > existingStart.getTime();
}

/**
 * Pure availability calculation matching the database RPC create_appointment rules.
 */
export function computeAvailableSlots(input: AvailabilityInput): DayAvailabilityResult {
  const {
    date,
    service,
    stylistChoice,
    businessHours,
    blockedDates,
    salonSettings,
    busySlots,
    activeStylists,
    nowKolkata = getKolkataNow(),
  } = input;

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return {
      dateStr: '',
      isClosed: true,
      isBlocked: false,
      isPastOrBeyondHorizon: true,
      reason: 'Invalid date selected',
      slots: [],
    };
  }

  const dayStart = startOfDay(date);
  const dateStr = formatDateYMD(dayStart);

  // Check active service
  if (!service || !service.is_active || service.duration_minutes <= 0) {
    return {
      dateStr,
      isClosed: false,
      isBlocked: false,
      isPastOrBeyondHorizon: false,
      reason: 'Service is unavailable',
      slots: [],
    };
  }

  // Check specific stylist is active if chosen
  const validStylists = activeStylists.filter((s) => s.is_active);
  if (stylistChoice && stylistChoice !== 'any') {
    const chosen = validStylists.find((s) => s.id === stylistChoice);
    if (!chosen) {
      return {
        dateStr,
        isClosed: false,
        isBlocked: false,
        isPastOrBeyondHorizon: false,
        reason: 'Selected stylist is unavailable',
        slots: [],
      };
    }
  }

  // Horizon check: today .. today + 60 days in Asia/Kolkata
  const todayStart = startOfDay(nowKolkata);
  const maxHorizonDate = addDays(todayStart, 60);

  if (isBefore(dayStart, todayStart)) {
    return {
      dateStr,
      isClosed: false,
      isBlocked: false,
      isPastOrBeyondHorizon: true,
      reason: 'Past dates cannot be booked',
      slots: [],
    };
  }

  if (isAfter(dayStart, maxHorizonDate)) {
    return {
      dateStr,
      isClosed: false,
      isBlocked: false,
      isPastOrBeyondHorizon: true,
      reason: 'Bookings are open up to 60 days ahead',
      slots: [],
    };
  }

  // 1. Check blocked_dates first
  const blockedRow = blockedDates.find((b) => b.blocked_date === dateStr);
  if (blockedRow) {
    return {
      dateStr,
      isClosed: false,
      isBlocked: true,
      isPastOrBeyondHorizon: false,
      reason: blockedRow.reason || 'Salon closed on this date',
      slots: [],
    };
  }

  // 2. Check business_hours for weekday(D)
  const weekday = dayStart.getDay();
  const hoursRow = businessHours.find((h) => h.weekday === weekday);
  if (!hoursRow || !hoursRow.is_open) {
    return {
      dateStr,
      isClosed: true,
      isBlocked: false,
      isPastOrBeyondHorizon: false,
      reason: `Closed on ${WEEKDAY_NAMES[weekday]}s`,
      slots: [],
    };
  }

  const openParts = parseTimeStr(hoursRow.start_time);
  const closeParts = parseTimeStr(hoursRow.end_time);
  if (!openParts || !closeParts) {
    return {
      dateStr,
      isClosed: true,
      isBlocked: false,
      isPastOrBeyondHorizon: false,
      reason: 'Invalid business hours configuration',
      slots: [],
    };
  }

  const openTime = combineDateAndTime(dayStart, openParts);
  const closeTime = combineDateAndTime(dayStart, closeParts);
  if (!isAfter(closeTime, openTime)) {
    return {
      dateStr,
      isClosed: true,
      isBlocked: false,
      isPastOrBeyondHorizon: false,
      reason: `Closed on ${WEEKDAY_NAMES[weekday]}s`,
      slots: [],
    };
  }

  const intervalMinutes = salonSettings.slot_interval_minutes || 15;
  const noticeHours = salonSettings.booking_notice_hours ?? 2;
  const earliestAllowedStart = addHours(nowKolkata, noticeHours);
  const nextMidnight = addDays(dayStart, 1);

  // Pre-parse busy slots for this date
  const parsedBusy = busySlots
    .map((b) => {
      const s = parseTimeStr(b.start_time);
      const e = parseTimeStr(b.end_time);
      if (!s || !e) return null;
      return {
        stylist_id: b.stylist_id,
        start: combineDateAndTime(dayStart, s),
        end: combineDateAndTime(dayStart, e),
      };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);

  const slots: Slot[] = [];
  let cursor = openTime;

  while (true) {
    const candidateEnd = addMinutes(cursor, service.duration_minutes);

    // Must not exceed closing time or pass midnight
    if (isAfter(candidateEnd, closeTime) || !isBefore(candidateEnd, nextMidnight)) {
      break;
    }

    // Must be >= now (Asia/Kolkata) + booking_notice_hours
    if (!isBefore(cursor, earliestAllowedStart)) {
      const overlappingBusy = parsedBusy.filter((b) =>
        intervalsOverlap(cursor, candidateEnd, b.start, b.end)
      );

      const nullStylistOverlaps = overlappingBusy.filter((b) => b.stylist_id === null).length;

      if (validStylists.length === 0) {
        // Zero active stylists -> capacity is 1
        if (overlappingBusy.length === 0) {
          slots.push(buildSlot(cursor, candidateEnd, []));
        }
      } else {
        // Determine which active stylists have no overlapping busy row
        const freeStylists = validStylists
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .filter(
            (st) => !overlappingBusy.some((b) => b.stylist_id === st.id)
          );

        const hasRemainingCapacity = freeStylists.length > nullStylistOverlaps;

        if (stylistChoice === 'any' || !stylistChoice) {
          if (hasRemainingCapacity && freeStylists.length > 0) {
            slots.push(
              buildSlot(
                cursor,
                candidateEnd,
                freeStylists.map((s) => s.id)
              )
            );
          }
        } else {
          // Specific stylist requested
          const stylistIsFree = freeStylists.some((s) => s.id === stylistChoice);
          if (stylistIsFree && hasRemainingCapacity) {
            slots.push(buildSlot(cursor, candidateEnd, [stylistChoice]));
          }
        }
      }
    }

    cursor = addMinutes(cursor, intervalMinutes);
  }

  return {
    dateStr,
    isClosed: false,
    isBlocked: false,
    isPastOrBeyondHorizon: false,
    reason: null,
    slots,
  };
}

function buildSlot(start: Date, end: Date, stylistIds: string[]): Slot {
  const hour = start.getHours();
  const period: Slot['period'] =
    hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';

  return {
    start,
    end,
    startTimeStr: format(start, 'HH:mm:ss'),
    endTimeStr: format(end, 'HH:mm:ss'),
    label: format(start, 'h:mm a'),
    period,
    stylistIds,
  };
}

/**
 * Computes live salon open/closed status in Asia/Kolkata for the Footer and PageHero chips.
 */
export function getSalonLiveStatus(
  businessHours: BusinessHour[],
  blockedDates: BlockedDate[],
  nowKolkata: Date = getKolkataNow()
): { isOpen: boolean; label: string } {
  const todayStr = formatDateYMD(nowKolkata);
  const blockedToday = blockedDates.find((b) => b.blocked_date === todayStr);

  if (blockedToday) {
    return {
      isOpen: false,
      label: `Closed today · ${blockedToday.reason || 'Holiday'}`,
    };
  }

  const weekday = nowKolkata.getDay();
  const todayHours = businessHours.find((h) => h.weekday === weekday);

  if (todayHours && todayHours.is_open) {
    const openParts = parseTimeStr(todayHours.start_time);
    const closeParts = parseTimeStr(todayHours.end_time);
    if (openParts && closeParts) {
      const openDate = combineDateAndTime(nowKolkata, openParts);
      const closeDate = combineDateAndTime(nowKolkata, closeParts);
      if (
        nowKolkata.getTime() >= openDate.getTime() &&
        nowKolkata.getTime() < closeDate.getTime()
      ) {
        return {
          isOpen: true,
          label: `Open now · closes ${format(closeDate, 'h:mm a')}`,
        };
      }
      if (nowKolkata.getTime() < openDate.getTime()) {
        return {
          isOpen: false,
          label: `Closed · opens today ${format(openDate, 'h:mm a')}`,
        };
      }
    }
  }

  // Find next open day
  for (let offset = 1; offset <= 7; offset++) {
    const candidateDay = addDays(nowKolkata, offset);
    const candidateStr = formatDateYMD(candidateDay);
    if (blockedDates.some((b) => b.blocked_date === candidateStr)) continue;
    const candidateHours = businessHours.find((h) => h.weekday === candidateDay.getDay());
    if (candidateHours && candidateHours.is_open) {
      const openParts = parseTimeStr(candidateHours.start_time);
      if (openParts) {
        const openDate = combineDateAndTime(candidateDay, openParts);
        const dayLabel =
          offset === 1 ? 'tomorrow' : WEEKDAY_NAMES[candidateDay.getDay()];
        return {
          isOpen: false,
          label: `Closed · opens ${dayLabel} ${format(openDate, 'h:mm a')}`,
        };
      }
    }
  }

  return { isOpen: false, label: 'Closed · check hours' };
}

// =============================================================================
// LOCAL FALLBACK APPOINTMENT STORE (Used when Supabase env vars are not set)
// =============================================================================

const LOCAL_APPOINTMENTS_KEY = 'bbold_local_appointments_v1';
const LOCAL_BLOCKED_DATES_KEY = 'bbold_local_blocked_dates_v1';
const LOCAL_BUSINESS_HOURS_KEY = 'bbold_local_business_hours_v1';
const LOCAL_SALON_SETTINGS_KEY = 'bbold_local_salon_settings_v1';

export function getLocalAppointments(): Appointment[] {
  return getUniversalValue<Appointment[]>(LOCAL_APPOINTMENTS_KEY, []);
}

export function saveLocalAppointments(appts: Appointment[]): void {
  void pushKeyToUniversalServer(LOCAL_APPOINTMENTS_KEY, appts);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bbold-appointments-updated'));
  }
}

export function getLocalBusySlotsForDate(dateStr: string): BusySlot[] {
  return getLocalAppointments()
    .filter((a) => a.appointment_date === dateStr && a.status !== 'cancelled')
    .map((a) => ({
      stylist_id: a.stylist_id,
      start_time: a.start_time,
      end_time: a.end_time,
    }));
}

export function getLocalBlockedDates(): BlockedDate[] {
  return getUniversalValue<BlockedDate[]>(LOCAL_BLOCKED_DATES_KEY, []);
}

export function saveLocalBlockedDates(rows: BlockedDate[]): void {
  void pushKeyToUniversalServer(LOCAL_BLOCKED_DATES_KEY, rows);
}

export function getLocalBusinessHours(fallback: BusinessHour[]): BusinessHour[] {
  return getUniversalValue<BusinessHour[]>(LOCAL_BUSINESS_HOURS_KEY, fallback);
}

export function saveLocalBusinessHours(rows: BusinessHour[]): void {
  void pushKeyToUniversalServer(LOCAL_BUSINESS_HOURS_KEY, rows);
}

export function getLocalSalonSettings(fallback: SalonSettings): SalonSettings {
  return getUniversalValue<SalonSettings>(LOCAL_SALON_SETTINGS_KEY, fallback);
}

export function saveLocalSalonSettings(settings: SalonSettings): void {
  void pushKeyToUniversalServer(LOCAL_SALON_SETTINGS_KEY, settings);
}

/**
 * Friendly error mapper for create_appointment RPC and local booking validation.
 */
export function mapBookingExceptionToMessage(errText: string): {
  code: 'slot_taken' | 'closed' | 'blocked' | 'too_soon' | 'invalid_input' | 'unknown';
  message: string;
} {
  const lower = (errText || '').toLowerCase();
  if (lower.includes('slot_taken')) {
    return {
      code: 'slot_taken',
      message: 'That time was just taken. Please pick another available slot.',
    };
  }
  if (lower.includes('blocked')) {
    return {
      code: 'blocked',
      message: 'The salon is closed for bookings on this date. Please choose another day.',
    };
  }
  if (lower.includes('closed')) {
    return {
      code: 'closed',
      message: 'This time falls outside our open hours. Please select another date or slot.',
    };
  }
  if (lower.includes('too_soon')) {
    return {
      code: 'too_soon',
      message: 'This slot is too close to the current time. Please pick a later time.',
    };
  }
  if (lower.includes('invalid_input')) {
    return {
      code: 'invalid_input',
      message:
        'Please check your details (valid 10-digit Indian mobile, email, active service, and fewer than 3 pending bookings).',
    };
  }
  return {
    code: 'unknown',
    message: 'Could not complete your booking request right now. Please try again or message us on WhatsApp.',
  };
}
