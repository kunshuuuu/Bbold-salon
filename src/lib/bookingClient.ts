import { addDays, format, startOfDay } from 'date-fns';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  getPublicServices,
  getPublicStylists,
  getPublicBusinessHours,
  getPublicBlockedDates,
  getPublicSalonSettings,
  getPublicBusySlots,
} from './content';
import {
  computeAvailableSlots,
  formatDateYMD,
  getKolkataNow,
  getLocalAppointments,
  saveLocalAppointments,
  parseDateYMD,
  mapBookingExceptionToMessage,
  type Slot,
} from './availability';
import type { Appointment, Service, Stylist } from '../types/database';

export interface CreateBookingPayload {
  fullName: string;
  email: string;
  phone: string;
  serviceId: string;
  stylistId: string | null; // null = First available ('any')
  dateStr: string;          // 'yyyy-MM-dd'
  startTimeStr: string;     // 'HH:mm:ss'
  notes?: string;
}

export interface CreateBookingResponse {
  ok: boolean;
  appointmentId?: string;
  assignedStylistId?: string | null;
  endTimeStr?: string;
  errorCode?: 'slot_taken' | 'closed' | 'blocked' | 'too_soon' | 'invalid_input' | 'unknown';
  errorMessage?: string;
}

/**
 * Public booking submission.
 * Calls Supabase RPC `create_appointment` when configured; otherwise enforces the exact same
 * rules against the local fallback store so the regression checklist can be verified immediately.
 */
export async function submitPublicBooking(
  payload: CreateBookingPayload
): Promise<CreateBookingResponse> {
  const cleanName = payload.fullName.trim();
  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanPhone = payload.phone.replace(/\s+/g, '');
  const cleanNotes = payload.notes?.trim() || null;

  // Client pre-validation matching RPC rules
  if (cleanName.length < 2 || cleanName.length > 80) {
    return {
      ok: false,
      errorCode: 'invalid_input',
      errorMessage: 'Please enter your full name (2 to 80 characters).',
    };
  }
  if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
    return {
      ok: false,
      errorCode: 'invalid_input',
      errorMessage: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.',
    };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    return {
      ok: false,
      errorCode: 'invalid_input',
      errorMessage: 'Please enter a valid email address.',
    };
  }
  if (cleanNotes && cleanNotes.length > 500) {
    return {
      ok: false,
      errorCode: 'invalid_input',
      errorMessage: 'Notes must be 500 characters or fewer.',
    };
  }

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc('create_appointment', {
      p_full_name: cleanName,
      p_email: cleanEmail,
      p_phone: cleanPhone,
      p_service_id: payload.serviceId,
      p_stylist_id: payload.stylistId,
      p_date: payload.dateStr,
      p_start: payload.startTimeStr,
      p_notes: cleanNotes,
    });

    if (error || !data) {
      const mapped = mapBookingExceptionToMessage(error?.message || 'unknown');
      return {
        ok: false,
        errorCode: mapped.code,
        errorMessage: mapped.message,
      };
    }

    return {
      ok: true,
      appointmentId: String(data),
      assignedStylistId: payload.stylistId,
    };
  }

  // Local fallback enforcing identical RPC rules
  const [services, stylists, businessHours, blockedDates, salonSettings, busySlots] =
    await Promise.all([
      getPublicServices(),
      getPublicStylists(),
      getPublicBusinessHours(),
      getPublicBlockedDates(),
      getPublicSalonSettings(),
      getPublicBusySlots(payload.dateStr),
    ]);

  const service = services.find((s) => s.id === payload.serviceId && s.is_active);
  if (!service) {
    const mapped = mapBookingExceptionToMessage('invalid_input');
    return { ok: false, errorCode: mapped.code, errorMessage: mapped.message };
  }

  const targetDate = parseDateYMD(payload.dateStr);
  if (!targetDate) {
    const mapped = mapBookingExceptionToMessage('invalid_input');
    return { ok: false, errorCode: mapped.code, errorMessage: mapped.message };
  }

  // Check max 3 future pending appointments for the same phone number
  const nowKolkata = getKolkataNow();
  const todayStr = formatDateYMD(nowKolkata);
  const existingLocal = getLocalAppointments();
  const futurePendingForPhone = existingLocal.filter(
    (a) =>
      a.phone === cleanPhone &&
      a.status === 'pending' &&
      a.appointment_date >= todayStr
  );

  if (futurePendingForPhone.length >= 3) {
    return {
      ok: false,
      errorCode: 'invalid_input',
      errorMessage: 'You already have 3 pending appointment requests with this phone number.',
    };
  }

  const availability = computeAvailableSlots({
    date: targetDate,
    service,
    stylistChoice: payload.stylistId || 'any',
    businessHours,
    blockedDates,
    salonSettings,
    busySlots,
    activeStylists: stylists,
    nowKolkata,
  });

  if (availability.isBlocked) {
    const mapped = mapBookingExceptionToMessage('blocked');
    return { ok: false, errorCode: mapped.code, errorMessage: mapped.message };
  }

  if (availability.isClosed) {
    const mapped = mapBookingExceptionToMessage('closed');
    return { ok: false, errorCode: mapped.code, errorMessage: mapped.message };
  }

  const matchingSlot = availability.slots.find(
    (s) => s.startTimeStr === payload.startTimeStr
  );

  if (!matchingSlot) {
    // Distinguish whether it was too_soon or slot_taken
    const withoutBusy = computeAvailableSlots({
      date: targetDate,
      service,
      stylistChoice: payload.stylistId || 'any',
      businessHours,
      blockedDates,
      salonSettings,
      busySlots: [],
      activeStylists: stylists,
      nowKolkata,
    });
    const existedWithoutBusy = withoutBusy.slots.some(
      (s) => s.startTimeStr === payload.startTimeStr
    );
    const code = existedWithoutBusy ? 'slot_taken' : 'too_soon';
    const mapped = mapBookingExceptionToMessage(code);
    return { ok: false, errorCode: mapped.code, errorMessage: mapped.message };
  }

  const assignedStylistId =
    payload.stylistId || matchingSlot.stylistIds[0] || null;

  const newAppointment: Appointment = {
    id: crypto.randomUUID ? crypto.randomUUID() : `appt-${Date.now()}`,
    full_name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    service_id: service.id,
    stylist_id: assignedStylistId,
    appointment_date: payload.dateStr,
    start_time: matchingSlot.startTimeStr,
    end_time: matchingSlot.endTimeStr,
    status: 'pending',
    notes: cleanNotes,
    created_at: new Date().toISOString(),
  };

  saveLocalAppointments([newAppointment, ...existingLocal]);

  return {
    ok: true,
    appointmentId: newAppointment.id,
    assignedStylistId,
    endTimeStr: matchingSlot.endTimeStr,
  };
}

/**
 * Finds the next free chair across the next 14 days for the Hero, CTA band, and Footer.
 */
export async function findNextFreeChair(
  preferredService?: Service | null,
  preferredStylists?: Stylist[]
): Promise<{
  dateStr: string;
  dayLabel: string;
  slot: Slot;
  displayLabel: string;
} | null> {
  const [services, stylists, businessHours, blockedDates, salonSettings] = await Promise.all([
    preferredService ? Promise.resolve([preferredService]) : getPublicServices(),
    preferredStylists ? Promise.resolve(preferredStylists) : getPublicStylists(),
    getPublicBusinessHours(),
    getPublicBlockedDates(),
    getPublicSalonSettings(),
  ]);

  const service = preferredService || services[0];
  if (!service) return null;

  const nowKolkata = getKolkataNow();
  const todayStart = startOfDay(nowKolkata);

  for (let offset = 0; offset < 14; offset++) {
    const candidateDate = addDays(todayStart, offset);
    const dateStr = formatDateYMD(candidateDate);
    const busySlots = await getPublicBusySlots(dateStr);

    const res = computeAvailableSlots({
      date: candidateDate,
      service,
      stylistChoice: 'any',
      businessHours,
      blockedDates,
      salonSettings,
      busySlots,
      activeStylists: stylists,
      nowKolkata,
    });

    if (res.slots.length > 0) {
      const firstSlot = res.slots[0];
      const dayLabel =
        offset === 0
          ? 'Today'
          : offset === 1
          ? 'Tomorrow'
          : format(candidateDate, 'EEE, d MMM');
      return {
        dateStr,
        dayLabel,
        slot: firstSlot,
        displayLabel: `${dayLabel} ${firstSlot.label}`,
      };
    }
  }

  return null;
}
