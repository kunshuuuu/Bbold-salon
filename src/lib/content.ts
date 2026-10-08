import { supabase, isSupabaseConfigured } from './supabase';
import {
  SAMPLE_SERVICES,
  SAMPLE_STYLISTS,
  SAMPLE_COURSES,
  SAMPLE_TESTIMONIALS,
  SAMPLE_GALLERY_ITEMS,
  SAMPLE_FAQS,
} from './sampleData';
import {
  DEFAULT_SALON_SETTINGS,
  DEFAULT_BUSINESS_HOURS,
  DEFAULT_SITE_TEXTS,
} from '../config/site';
import {
  getLocalBlockedDates,
  getLocalBusinessHours,
  getLocalBusySlotsForDate,
  getLocalSalonSettings,
} from './availability';
import type {
  Service,
  Stylist,
  Course,
  Testimonial,
  GalleryItem,
  FaqItem,
  SiteImageRow,
  SiteTextsMap,
  SalonSettings,
  BusinessHour,
  BlockedDate,
  BusySlot,
  SampleContentCounts,
  AcademyEnquiry,
} from '../types/database';

const SAMPLE_OVERRIDE_STORAGE_KEY = 'bbold_dev_sample_override';

export const LOCAL_STORAGE_KEYS = {
  services: 'bbold_local_services_v1',
  stylists: 'bbold_local_stylists_v1',
  courses: 'bbold_local_courses_v1',
  testimonials: 'bbold_local_testimonials_v1',
  gallery_items: 'bbold_local_gallery_v1',
  faqs: 'bbold_local_faqs_v1',
  site_images: 'bbold_local_site_images_v1',
  site_texts: 'bbold_local_site_texts_v1',
  enquiries: 'bbold_local_enquiries_v1',
} as const;

export function readLocalTable<T>(key: string, defaultRows: T[]): T[] {
  if (typeof window === 'undefined') return defaultRows;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : defaultRows;
  } catch {
    return defaultRows;
  }
}

export function writeLocalTable<T>(key: string, rows: T[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent('bbold-sample-toggle'));
}

/**
 * Checks whether sample content should be displayed publicly.
 * Reads VITE_SHOW_SAMPLE_CONTENT ('true' during design; 'false' in production).
 */
export function isSampleContentEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const override = window.localStorage.getItem(SAMPLE_OVERRIDE_STORAGE_KEY);
    if (override === 'true') return true;
    if (override === 'false') return false;
  }
  const envVal = import.meta.env.VITE_SHOW_SAMPLE_CONTENT;
  if (envVal === undefined || envVal === '') {
    return true;
  }
  return String(envVal).toLowerCase() === 'true';
}

export function setSampleContentDevOverride(value: boolean | null): void {
  if (typeof window === 'undefined') return;
  if (value === null) {
    window.localStorage.removeItem(SAMPLE_OVERRIDE_STORAGE_KEY);
  } else {
    window.localStorage.setItem(SAMPLE_OVERRIDE_STORAGE_KEY, String(value));
  }
  window.dispatchEvent(new CustomEvent('bbold-sample-toggle'));
}

function filterSample<T extends { is_sample?: boolean }>(rows: T[]): T[] {
  if (isSampleContentEnabled()) return rows;
  return rows.filter((row) => !row.is_sample);
}

// =============================================================================
// PUBLIC CONTENT READS (All public components & /book read strictly through here)
// =============================================================================

export async function getPublicServices(): Promise<Service[]> {
  const showSample = isSampleContentEnabled();
  if (!isSupabaseConfigured()) {
    const rows = readLocalTable(LOCAL_STORAGE_KEYS.services, SAMPLE_SERVICES);
    return filterSample(
      rows
        .filter((s) => s.is_active)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
    );
  }

  let query = supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (!showSample) {
    query = query.eq('is_sample', false);
  }

  const { data, error } = await query;
  if (error || !data) {
    const rows = readLocalTable(LOCAL_STORAGE_KEYS.services, SAMPLE_SERVICES);
    return filterSample(rows.filter((s) => s.is_active));
  }
  return data as Service[];
}

export async function getPublicStylists(): Promise<Stylist[]> {
  const showSample = isSampleContentEnabled();
  if (!isSupabaseConfigured()) {
    const rows = readLocalTable(LOCAL_STORAGE_KEYS.stylists, SAMPLE_STYLISTS);
    return filterSample(
      rows
        .filter((s) => s.is_active)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
    );
  }

  let query = supabase
    .from('stylists')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (!showSample) {
    query = query.eq('is_sample', false);
  }

  const { data, error } = await query;
  if (error || !data) {
    const rows = readLocalTable(LOCAL_STORAGE_KEYS.stylists, SAMPLE_STYLISTS);
    return filterSample(rows.filter((s) => s.is_active));
  }
  return data as Stylist[];
}

export async function getPublicCourses(): Promise<Course[]> {
  const showSample = isSampleContentEnabled();
  if (!isSupabaseConfigured()) {
    const rows = readLocalTable(LOCAL_STORAGE_KEYS.courses, SAMPLE_COURSES);
    return filterSample(
      rows
        .filter((c) => c.is_active)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
    );
  }

  let query = supabase
    .from('courses')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (!showSample) {
    query = query.eq('is_sample', false);
  }

  const { data, error } = await query;
  if (error || !data) {
    const rows = readLocalTable(LOCAL_STORAGE_KEYS.courses, SAMPLE_COURSES);
    return filterSample(rows.filter((c) => c.is_active));
  }
  return data as Course[];
}

export async function getPublicTestimonials(): Promise<Testimonial[]> {
  const showSample = isSampleContentEnabled();
  if (!isSupabaseConfigured()) {
    const rows = readLocalTable(LOCAL_STORAGE_KEYS.testimonials, SAMPLE_TESTIMONIALS);
    return filterSample(rows.filter((t) => t.is_active && (t.is_sample || t.consent)));
  }

  let query = supabase
    .from('testimonials')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (!showSample) {
    query = query.eq('is_sample', false);
  }

  const { data, error } = await query;
  if (error || !data) {
    const rows = readLocalTable(LOCAL_STORAGE_KEYS.testimonials, SAMPLE_TESTIMONIALS);
    return filterSample(rows.filter((t) => t.is_active && (t.is_sample || t.consent)));
  }
  return (data as Testimonial[]).filter((t) => t.is_sample || t.consent);
}

export async function getPublicGalleryItems(): Promise<GalleryItem[]> {
  const showSample = isSampleContentEnabled();
  if (!isSupabaseConfigured()) {
    const rows = readLocalTable(LOCAL_STORAGE_KEYS.gallery_items, SAMPLE_GALLERY_ITEMS);
    return filterSample(
      rows
        .filter((g) => g.is_active)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
    );
  }

  let query = supabase
    .from('gallery_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (!showSample) {
    query = query.eq('is_sample', false);
  }

  const { data, error } = await query;
  if (error || !data) {
    const rows = readLocalTable(LOCAL_STORAGE_KEYS.gallery_items, SAMPLE_GALLERY_ITEMS);
    return filterSample(rows.filter((g) => g.is_active));
  }
  return data as GalleryItem[];
}

export async function getPublicFaqs(): Promise<FaqItem[]> {
  const showSample = isSampleContentEnabled();
  if (!isSupabaseConfigured()) {
    const rows = readLocalTable(LOCAL_STORAGE_KEYS.faqs, SAMPLE_FAQS);
    return filterSample(
      rows
        .filter((f) => f.is_active)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
    );
  }

  let query = supabase
    .from('faqs')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (!showSample) {
    query = query.eq('is_sample', false);
  }

  const { data, error } = await query;
  if (error || !data) {
    const rows = readLocalTable(LOCAL_STORAGE_KEYS.faqs, SAMPLE_FAQS);
    return filterSample(rows.filter((f) => f.is_active));
  }
  return data as FaqItem[];
}

export async function getPublicSiteImages(): Promise<Record<string, SiteImageRow>> {
  if (!isSupabaseConfigured()) {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEYS.site_images);
      return raw ? (JSON.parse(raw) as Record<string, SiteImageRow>) : {};
    } catch {
      return {};
    }
  }

  const { data, error } = await supabase.from('site_images').select('*');
  if (error || !data) {
    return {};
  }

  const map: Record<string, SiteImageRow> = {};
  for (const row of data as SiteImageRow[]) {
    map[row.slot] = row;
  }
  return map;
}

export async function getPublicSiteTexts(): Promise<SiteTextsMap> {
  if (!isSupabaseConfigured()) {
    if (typeof window === 'undefined') return DEFAULT_SITE_TEXTS;
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEYS.site_texts);
      return raw ? { ...DEFAULT_SITE_TEXTS, ...(JSON.parse(raw) as SiteTextsMap) } : DEFAULT_SITE_TEXTS;
    } catch {
      return DEFAULT_SITE_TEXTS;
    }
  }

  const { data, error } = await supabase.from('site_texts').select('*');
  if (error || !data || data.length === 0) {
    return DEFAULT_SITE_TEXTS;
  }

  const result: SiteTextsMap = {
    hero: { ...DEFAULT_SITE_TEXTS.hero },
    announcement: { ...DEFAULT_SITE_TEXTS.announcement },
    marquee: { ...DEFAULT_SITE_TEXTS.marquee },
    footer: { ...DEFAULT_SITE_TEXTS.footer },
  };

  for (const row of data as Array<{ key: string; value: unknown }>) {
    if (row.key === 'hero' && row.value && typeof row.value === 'object') {
      result.hero = { ...result.hero, ...(row.value as SiteTextsMap['hero']) };
    } else if (row.key === 'announcement' && row.value && typeof row.value === 'object') {
      result.announcement = { ...result.announcement, ...(row.value as SiteTextsMap['announcement']) };
    } else if (row.key === 'marquee' && row.value && typeof row.value === 'object') {
      result.marquee = { ...result.marquee, ...(row.value as SiteTextsMap['marquee']) };
    } else if (row.key === 'footer' && row.value && typeof row.value === 'object') {
      result.footer = { ...result.footer, ...(row.value as SiteTextsMap['footer']) };
    }
  }

  return result;
}

export async function getPublicSalonSettings(): Promise<SalonSettings> {
  if (!isSupabaseConfigured()) {
    return getLocalSalonSettings(DEFAULT_SALON_SETTINGS);
  }

  const { data, error } = await supabase
    .from('salon_settings')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return getLocalSalonSettings(DEFAULT_SALON_SETTINGS);
  }

  return data as SalonSettings;
}

export async function getPublicBusinessHours(): Promise<BusinessHour[]> {
  if (!isSupabaseConfigured()) {
    return getLocalBusinessHours(DEFAULT_BUSINESS_HOURS);
  }

  const { data, error } = await supabase
    .from('business_hours')
    .select('*')
    .order('weekday', { ascending: true });

  if (error || !data || data.length === 0) {
    return getLocalBusinessHours(DEFAULT_BUSINESS_HOURS);
  }

  return data as BusinessHour[];
}

export async function getPublicBlockedDates(): Promise<BlockedDate[]> {
  if (!isSupabaseConfigured()) {
    return getLocalBlockedDates();
  }

  const { data, error } = await supabase
    .from('blocked_dates')
    .select('*')
    .order('blocked_date', { ascending: true });

  if (error || !data) {
    return getLocalBlockedDates();
  }

  return data as BlockedDate[];
}

export async function getPublicBusySlots(dateStr: string): Promise<BusySlot[]> {
  if (!isSupabaseConfigured()) {
    return getLocalBusySlotsForDate(dateStr);
  }

  const { data, error } = await supabase.rpc('get_busy_slots', { p_date: dateStr });
  if (error || !data) {
    return getLocalBusySlotsForDate(dateStr);
  }

  return data as BusySlot[];
}

export async function submitPublicAcademyEnquiry(payload: {
  full_name: string;
  phone: string;
  email: string;
  course_id: string | null;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const cleanName = payload.full_name.trim();
  const cleanPhone = payload.phone.replace(/\s+/g, '');
  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanMessage = payload.message.trim();

  if (cleanName.length < 2 || cleanName.length > 80) {
    return { ok: false, error: 'Please enter your full name (2–80 characters).' };
  }
  if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
    return { ok: false, error: 'Please enter a valid 10-digit Indian mobile number.' };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (cleanMessage.length > 1000) {
    return { ok: false, error: 'Message must be 1000 characters or fewer.' };
  }

  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('academy_enquiries').insert({
      full_name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      course_id: payload.course_id || null,
      message: cleanMessage || null,
      status: 'new',
    });
    if (error) {
      return { ok: false, error: 'Could not submit your enquiry. Please try again or message us on WhatsApp.' };
    }
    return { ok: true };
  }

  const existing = readLocalTable<AcademyEnquiry>(LOCAL_STORAGE_KEYS.enquiries, []);
  const newRow: AcademyEnquiry = {
    id: crypto.randomUUID ? crypto.randomUUID() : `enq-${Date.now()}`,
    full_name: cleanName,
    phone: cleanPhone,
    email: cleanEmail,
    course_id: payload.course_id || null,
    message: cleanMessage || null,
    status: 'new',
    created_at: new Date().toISOString(),
  };
  writeLocalTable(LOCAL_STORAGE_KEYS.enquiries, [newRow, ...existing]);
  return { ok: true };
}

// =============================================================================
// ADMIN SAMPLE CONTENT HELPERS (Used in Admin Overview & Data Tools)
// =============================================================================

export async function getSampleContentCounts(): Promise<SampleContentCounts> {
  if (!isSupabaseConfigured()) {
    const services = readLocalTable(LOCAL_STORAGE_KEYS.services, SAMPLE_SERVICES).filter(
      (r) => r.is_sample
    ).length;
    const stylists = readLocalTable(LOCAL_STORAGE_KEYS.stylists, SAMPLE_STYLISTS).filter(
      (r) => r.is_sample
    ).length;
    const courses = readLocalTable(LOCAL_STORAGE_KEYS.courses, SAMPLE_COURSES).filter(
      (r) => r.is_sample
    ).length;
    const testimonials = readLocalTable(
      LOCAL_STORAGE_KEYS.testimonials,
      SAMPLE_TESTIMONIALS
    ).filter((r) => r.is_sample).length;
    const gallery_items = readLocalTable(
      LOCAL_STORAGE_KEYS.gallery_items,
      SAMPLE_GALLERY_ITEMS
    ).filter((r) => r.is_sample).length;
    const faqs = readLocalTable(LOCAL_STORAGE_KEYS.faqs, SAMPLE_FAQS).filter(
      (r) => r.is_sample
    ).length;
    return {
      services,
      stylists,
      courses,
      testimonials,
      gallery_items,
      faqs,
      total: services + stylists + courses + testimonials + gallery_items + faqs,
    };
  }

  const [servicesRes, stylistsRes, coursesRes, testimonialsRes, galleryRes, faqsRes] =
    await Promise.all([
      supabase.from('services').select('id', { count: 'exact', head: true }).eq('is_sample', true),
      supabase.from('stylists').select('id', { count: 'exact', head: true }).eq('is_sample', true),
      supabase.from('courses').select('id', { count: 'exact', head: true }).eq('is_sample', true),
      supabase
        .from('testimonials')
        .select('id', { count: 'exact', head: true })
        .eq('is_sample', true),
      supabase
        .from('gallery_items')
        .select('id', { count: 'exact', head: true })
        .eq('is_sample', true),
      supabase.from('faqs').select('id', { count: 'exact', head: true }).eq('is_sample', true),
    ]);

  const services = servicesRes.count ?? 0;
  const stylists = stylistsRes.count ?? 0;
  const courses = coursesRes.count ?? 0;
  const testimonials = testimonialsRes.count ?? 0;
  const gallery_items = galleryRes.count ?? 0;
  const faqs = faqsRes.count ?? 0;

  return {
    services,
    stylists,
    courses,
    testimonials,
    gallery_items,
    faqs,
    total: services + stylists + courses + testimonials + gallery_items + faqs,
  };
}

export interface RemoveSampleResult {
  deletedCounts: Record<string, number>;
  deactivatedServicesCount: number;
}

export async function removeAllSampleContent(): Promise<RemoveSampleResult> {
  if (!isSupabaseConfigured()) {
    const services = readLocalTable(LOCAL_STORAGE_KEYS.services, SAMPLE_SERVICES);
    const stylists = readLocalTable(LOCAL_STORAGE_KEYS.stylists, SAMPLE_STYLISTS);
    const courses = readLocalTable(LOCAL_STORAGE_KEYS.courses, SAMPLE_COURSES);
    const testimonials = readLocalTable(LOCAL_STORAGE_KEYS.testimonials, SAMPLE_TESTIMONIALS);
    const gallery = readLocalTable(LOCAL_STORAGE_KEYS.gallery_items, SAMPLE_GALLERY_ITEMS);
    const faqs = readLocalTable(LOCAL_STORAGE_KEYS.faqs, SAMPLE_FAQS);

    writeLocalTable(
      LOCAL_STORAGE_KEYS.services,
      services.filter((r) => !r.is_sample)
    );
    writeLocalTable(
      LOCAL_STORAGE_KEYS.stylists,
      stylists.filter((r) => !r.is_sample)
    );
    writeLocalTable(
      LOCAL_STORAGE_KEYS.courses,
      courses.filter((r) => !r.is_sample)
    );
    writeLocalTable(
      LOCAL_STORAGE_KEYS.testimonials,
      testimonials.filter((r) => !r.is_sample)
    );
    writeLocalTable(
      LOCAL_STORAGE_KEYS.gallery_items,
      gallery.filter((r) => !r.is_sample)
    );
    writeLocalTable(
      LOCAL_STORAGE_KEYS.faqs,
      faqs.filter((r) => !r.is_sample)
    );
    setSampleContentDevOverride(false);

    return {
      deletedCounts: {
        services: services.filter((r) => r.is_sample).length,
        stylists: stylists.filter((r) => r.is_sample).length,
        courses: courses.filter((r) => r.is_sample).length,
        testimonials: testimonials.filter((r) => r.is_sample).length,
        gallery_items: gallery.filter((r) => r.is_sample).length,
        faqs: faqs.filter((r) => r.is_sample).length,
      },
      deactivatedServicesCount: 0,
    };
  }

  const deletedCounts: Record<string, number> = {
    services: 0,
    stylists: 0,
    courses: 0,
    testimonials: 0,
    gallery_items: 0,
    faqs: 0,
  };
  let deactivatedServicesCount = 0;

  const { data: sampleServices } = await supabase
    .from('services')
    .select('id')
    .eq('is_sample', true);

  if (sampleServices && sampleServices.length > 0) {
    const sampleIds = sampleServices.map((s) => s.id as string);
    const { data: referencedAppts } = await supabase
      .from('appointments')
      .select('service_id')
      .in('service_id', sampleIds);

    const referencedIds = Array.from(
      new Set((referencedAppts || []).map((a) => a.service_id as string))
    );
    const deletableIds = sampleIds.filter((id) => !referencedIds.includes(id));

    if (deletableIds.length > 0) {
      await supabase.from('services').delete().in('id', deletableIds);
      deletedCounts.services = deletableIds.length;
    }

    if (referencedIds.length > 0) {
      await supabase
        .from('services')
        .update({ is_active: false, is_sample: false })
        .in('id', referencedIds);
      deactivatedServicesCount = referencedIds.length;
    }
  }

  const tables = ['stylists', 'courses', 'testimonials', 'gallery_items', 'faqs'] as const;
  for (const table of tables) {
    const { data } = await supabase.from(table).delete().eq('is_sample', true).select('id');
    deletedCounts[table] = data?.length ?? 0;
  }

  return { deletedCounts, deactivatedServicesCount };
}
