import { supabase, isSupabaseConfigured } from './supabase';
import {
  LOCAL_STORAGE_KEYS,
  readLocalTable,
  writeLocalTable,
  getPublicSiteTexts,
  getPublicSalonSettings,
  getPublicBusinessHours,
  getPublicBlockedDates,
  getPublicSiteImages,
} from './content';
import {
  SAMPLE_SERVICES,
  SAMPLE_STYLISTS,
  SAMPLE_COURSES,
  SAMPLE_TESTIMONIALS,
  SAMPLE_GALLERY_ITEMS,
  SAMPLE_FAQS,
} from './sampleData';
import {
  getLocalAppointments,
  saveLocalAppointments,
  saveLocalBlockedDates,
  saveLocalBusinessHours,
  saveLocalSalonSettings,
} from './availability';
import type {
  Appointment,
  AppointmentStatus,
  BlockedDate,
  BusinessHour,
  Course,
  AcademyEnquiry,
  FaqItem,
  GalleryItem,
  SalonSettings,
  Service,
  SiteImageRow,
  SiteTextsMap,
  Stylist,
  Testimonial,
} from '../types/database';

// =============================================================================
// BROWSER IMAGE RESIZER & WEBP CONVERTER (Max 1600px, WebP before upload)
// =============================================================================

export async function resizeAndConvertToWebP(file: File, maxDimension = 1600): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not initialize image canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Could not encode WebP image'));
          }
        },
        'image/webp',
        0.84
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Invalid image file'));
    };

    img.src = objectUrl;
  });
}

export async function uploadMediaImage(file: File, folder = 'uploads'): Promise<string> {
  const webpBlob = await resizeAndConvertToWebP(file, 1600);

  if (isSupabaseConfigured()) {
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const { error } = await supabase.storage.from('media').upload(fileName, webpBlob, {
      contentType: 'image/webp',
      upsert: true,
    });
    if (error) {
      throw new Error(error.message);
    }
    const { data } = supabase.storage.from('media').getPublicUrl(fileName);
    return data.publicUrl;
  }

  // Local preview fallback: convert WebP blob to data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(webpBlob);
  });
}

// =============================================================================
// APPOINTMENTS ADMIN API
// =============================================================================

export async function adminGetAppointments(): Promise<Appointment[]> {
  if (!isSupabaseConfigured()) {
    return getLocalAppointments().sort((a, b) =>
      `${b.appointment_date} ${b.start_time}`.localeCompare(`${a.appointment_date} ${a.start_time}`)
    );
  }
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('appointment_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error || !data) {
    return getLocalAppointments();
  }
  return data as Appointment[];
}

export async function adminUpdateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  notes?: string | null
): Promise<void> {
  if (!isSupabaseConfigured()) {
    const rows = getLocalAppointments().map((a) =>
      a.id === id ? { ...a, status, ...(notes !== undefined ? { notes } : {}) } : a
    );
    saveLocalAppointments(rows);
    return;
  }
  const updatePayload: Partial<Appointment> = { status };
  if (notes !== undefined) updatePayload.notes = notes;
  const { error } = await supabase.from('appointments').update(updatePayload).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adminCreateManualAppointment(
  payload: Omit<Appointment, 'id' | 'created_at'>
): Promise<Appointment> {
  if (!isSupabaseConfigured()) {
    const newRow: Appointment = {
      ...payload,
      id: crypto.randomUUID ? crypto.randomUUID() : `appt-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    const existing = getLocalAppointments();
    saveLocalAppointments([newRow, ...existing]);
    return newRow;
  }
  const { data, error } = await supabase
    .from('appointments')
    .insert(payload)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message || 'Could not create appointment');
  return data as Appointment;
}

// =============================================================================
// SERVICES ADMIN API (Including inactive services)
// =============================================================================

export async function adminGetServices(): Promise<Service[]> {
  if (!isSupabaseConfigured()) {
    return readLocalTable(LOCAL_STORAGE_KEYS.services, SAMPLE_SERVICES)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error || !data) return readLocalTable(LOCAL_STORAGE_KEYS.services, SAMPLE_SERVICES);
  return data as Service[];
}

export async function adminUpsertService(
  service: Partial<Service> & { name: string; duration_minutes: number; price: number }
): Promise<Service> {
  if (!isSupabaseConfigured()) {
    const all = readLocalTable(LOCAL_STORAGE_KEYS.services, SAMPLE_SERVICES);
    if (service.id) {
      const updated = all.map((s) => (s.id === service.id ? ({ ...s, ...service } as Service) : s));
      writeLocalTable(LOCAL_STORAGE_KEYS.services, updated);
      return updated.find((s) => s.id === service.id)!;
    }
    const created: Service = {
      id: crypto.randomUUID ? crypto.randomUUID() : `srv-${Date.now()}`,
      name: service.name,
      description: service.description ?? null,
      duration_minutes: service.duration_minutes,
      price: service.price,
      category: service.category || 'Hair',
      audience: service.audience || 'all',
      is_featured: service.is_featured ?? false,
      sort_order: service.sort_order ?? all.length + 1,
      is_active: service.is_active ?? true,
      is_sample: service.is_sample ?? false,
      created_at: new Date().toISOString(),
    };
    writeLocalTable(LOCAL_STORAGE_KEYS.services, [...all, created]);
    return created;
  }

  if (service.id) {
    const { data, error } = await supabase
      .from('services')
      .update(service)
      .eq('id', service.id)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to update service');
    return data as Service;
  } else {
    const { data, error } = await supabase
      .from('services')
      .insert(service)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to create service');
    return data as Service;
  }
}

export async function adminRenameServiceCategory(oldCat: string, newCat: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const all = readLocalTable(LOCAL_STORAGE_KEYS.services, SAMPLE_SERVICES).map((s) =>
      s.category === oldCat ? { ...s, category: newCat } : s
    );
    writeLocalTable(LOCAL_STORAGE_KEYS.services, all);
    return;
  }
  const { error } = await supabase
    .from('services')
    .update({ category: newCat })
    .eq('category', oldCat);
  if (error) throw new Error(error.message);
}

// =============================================================================
// STYLISTS ADMIN API
// =============================================================================

export async function adminGetStylists(): Promise<Stylist[]> {
  if (!isSupabaseConfigured()) {
    return readLocalTable(LOCAL_STORAGE_KEYS.stylists, SAMPLE_STYLISTS)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  const { data, error } = await supabase
    .from('stylists')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error || !data) return readLocalTable(LOCAL_STORAGE_KEYS.stylists, SAMPLE_STYLISTS);
  return data as Stylist[];
}

export async function adminUpsertStylist(
  stylist: Partial<Stylist> & { name: string }
): Promise<Stylist> {
  if (!isSupabaseConfigured()) {
    const all = readLocalTable(LOCAL_STORAGE_KEYS.stylists, SAMPLE_STYLISTS);
    if (stylist.id) {
      const updated = all.map((s) => (s.id === stylist.id ? ({ ...s, ...stylist } as Stylist) : s));
      writeLocalTable(LOCAL_STORAGE_KEYS.stylists, updated);
      return updated.find((s) => s.id === stylist.id)!;
    }
    const created: Stylist = {
      id: crypto.randomUUID ? crypto.randomUUID() : `sty-${Date.now()}`,
      name: stylist.name,
      title: stylist.title ?? null,
      bio: stylist.bio ?? null,
      photo_url: stylist.photo_url ?? null,
      specialties: stylist.specialties ?? [],
      is_active: stylist.is_active ?? true,
      sort_order: stylist.sort_order ?? all.length + 1,
      is_sample: stylist.is_sample ?? false,
      created_at: new Date().toISOString(),
    };
    writeLocalTable(LOCAL_STORAGE_KEYS.stylists, [...all, created]);
    return created;
  }

  if (stylist.id) {
    const { data, error } = await supabase
      .from('stylists')
      .update(stylist)
      .eq('id', stylist.id)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to save stylist');
    return data as Stylist;
  } else {
    const { data, error } = await supabase
      .from('stylists')
      .insert(stylist)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to create stylist');
    return data as Stylist;
  }
}

// =============================================================================
// COURSES & ACADEMY ENQUIRIES ADMIN API
// =============================================================================

export async function adminGetCourses(): Promise<Course[]> {
  if (!isSupabaseConfigured()) {
    return readLocalTable(LOCAL_STORAGE_KEYS.courses, SAMPLE_COURSES)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error || !data) return readLocalTable(LOCAL_STORAGE_KEYS.courses, SAMPLE_COURSES);
  return data as Course[];
}

export async function adminUpsertCourse(
  course: Partial<Course> & { name: string }
): Promise<Course> {
  if (!isSupabaseConfigured()) {
    const all = readLocalTable(LOCAL_STORAGE_KEYS.courses, SAMPLE_COURSES);
    if (course.id) {
      const updated = all.map((c) => (c.id === course.id ? ({ ...c, ...course } as Course) : c));
      writeLocalTable(LOCAL_STORAGE_KEYS.courses, updated);
      return updated.find((c) => c.id === course.id)!;
    }
    const created: Course = {
      id: crypto.randomUUID ? crypto.randomUUID() : `crs-${Date.now()}`,
      name: course.name,
      description: course.description ?? null,
      duration_text: course.duration_text ?? null,
      fee: course.fee ?? null,
      is_active: course.is_active ?? true,
      sort_order: course.sort_order ?? all.length + 1,
      is_sample: course.is_sample ?? false,
      created_at: new Date().toISOString(),
    };
    writeLocalTable(LOCAL_STORAGE_KEYS.courses, [...all, created]);
    return created;
  }

  if (course.id) {
    const { data, error } = await supabase
      .from('courses')
      .update(course)
      .eq('id', course.id)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to save course');
    return data as Course;
  } else {
    const { data, error } = await supabase
      .from('courses')
      .insert(course)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to create course');
    return data as Course;
  }
}

export async function adminDeleteCourse(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const all = readLocalTable(LOCAL_STORAGE_KEYS.courses, SAMPLE_COURSES).filter(
      (c) => c.id !== id
    );
    writeLocalTable(LOCAL_STORAGE_KEYS.courses, all);
    return;
  }
  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adminGetEnquiries(): Promise<AcademyEnquiry[]> {
  if (!isSupabaseConfigured()) {
    return readLocalTable<AcademyEnquiry>(LOCAL_STORAGE_KEYS.enquiries, []);
  }
  const { data, error } = await supabase
    .from('academy_enquiries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return readLocalTable<AcademyEnquiry>(LOCAL_STORAGE_KEYS.enquiries, []);
  return data as AcademyEnquiry[];
}

export async function adminUpdateEnquiry(
  id: string,
  patch: Partial<AcademyEnquiry>
): Promise<void> {
  if (!isSupabaseConfigured()) {
    const all = readLocalTable<AcademyEnquiry>(LOCAL_STORAGE_KEYS.enquiries, []).map((e) =>
      e.id === id ? { ...e, ...patch } : e
    );
    writeLocalTable(LOCAL_STORAGE_KEYS.enquiries, all);
    return;
  }
  const { error } = await supabase.from('academy_enquiries').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

// =============================================================================
// TESTIMONIALS, FAQS, GALLERY & SITE IMAGES ADMIN API
// =============================================================================

export async function adminGetTestimonials(): Promise<Testimonial[]> {
  if (!isSupabaseConfigured()) {
    return readLocalTable(LOCAL_STORAGE_KEYS.testimonials, SAMPLE_TESTIMONIALS);
  }
  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return readLocalTable(LOCAL_STORAGE_KEYS.testimonials, SAMPLE_TESTIMONIALS);
  return data as Testimonial[];
}

export async function adminUpsertTestimonial(
  item: Partial<Testimonial> & { name: string; quote: string }
): Promise<Testimonial> {
  // Enforce rule: a real (non-sample) testimonial cannot be active unless consent is true
  const isSample = item.is_sample ?? false;
  const consent = item.consent ?? false;
  const isActive = isSample ? (item.is_active ?? true) : consent ? (item.is_active ?? true) : false;

  const payload = { ...item, is_sample: isSample, consent, is_active: isActive };

  if (!isSupabaseConfigured()) {
    const all = readLocalTable(LOCAL_STORAGE_KEYS.testimonials, SAMPLE_TESTIMONIALS);
    if (payload.id) {
      const updated = all.map((t) =>
        t.id === payload.id ? ({ ...t, ...payload } as Testimonial) : t
      );
      writeLocalTable(LOCAL_STORAGE_KEYS.testimonials, updated);
      return updated.find((t) => t.id === payload.id)!;
    }
    const created: Testimonial = {
      id: crypto.randomUUID ? crypto.randomUUID() : `tst-${Date.now()}`,
      name: payload.name,
      quote: payload.quote,
      service_label: payload.service_label ?? null,
      consent: payload.consent,
      is_active: payload.is_active,
      is_sample: payload.is_sample,
      created_at: new Date().toISOString(),
    };
    writeLocalTable(LOCAL_STORAGE_KEYS.testimonials, [created, ...all]);
    return created;
  }

  if (payload.id) {
    const { data, error } = await supabase
      .from('testimonials')
      .update(payload)
      .eq('id', payload.id)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to save testimonial');
    return data as Testimonial;
  } else {
    const { data, error } = await supabase
      .from('testimonials')
      .insert(payload)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to create testimonial');
    return data as Testimonial;
  }
}

export async function adminDeleteTestimonial(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const all = readLocalTable(LOCAL_STORAGE_KEYS.testimonials, SAMPLE_TESTIMONIALS).filter(
      (t) => t.id !== id
    );
    writeLocalTable(LOCAL_STORAGE_KEYS.testimonials, all);
    return;
  }
  const { error } = await supabase.from('testimonials').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adminGetFaqs(): Promise<FaqItem[]> {
  if (!isSupabaseConfigured()) {
    return readLocalTable(LOCAL_STORAGE_KEYS.faqs, SAMPLE_FAQS)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error || !data) return readLocalTable(LOCAL_STORAGE_KEYS.faqs, SAMPLE_FAQS);
  return data as FaqItem[];
}

export async function adminUpsertFaq(
  faq: Partial<FaqItem> & { question: string; answer: string }
): Promise<FaqItem> {
  if (!isSupabaseConfigured()) {
    const all = readLocalTable(LOCAL_STORAGE_KEYS.faqs, SAMPLE_FAQS);
    if (faq.id) {
      const updated = all.map((f) => (f.id === faq.id ? ({ ...f, ...faq } as FaqItem) : f));
      writeLocalTable(LOCAL_STORAGE_KEYS.faqs, updated);
      return updated.find((f) => f.id === faq.id)!;
    }
    const created: FaqItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `faq-${Date.now()}`,
      question: faq.question,
      answer: faq.answer,
      category: faq.category ?? 'General',
      sort_order: faq.sort_order ?? all.length + 1,
      is_active: faq.is_active ?? true,
      is_sample: faq.is_sample ?? false,
      created_at: new Date().toISOString(),
    };
    writeLocalTable(LOCAL_STORAGE_KEYS.faqs, [...all, created]);
    return created;
  }

  if (faq.id) {
    const { data, error } = await supabase
      .from('faqs')
      .update(faq)
      .eq('id', faq.id)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to save FAQ');
    return data as FaqItem;
  } else {
    const { data, error } = await supabase.from('faqs').insert(faq).select('*').single();
    if (error || !data) throw new Error(error?.message || 'Failed to create FAQ');
    return data as FaqItem;
  }
}

export async function adminDeleteFaq(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const all = readLocalTable(LOCAL_STORAGE_KEYS.faqs, SAMPLE_FAQS).filter((f) => f.id !== id);
    writeLocalTable(LOCAL_STORAGE_KEYS.faqs, all);
    return;
  }
  const { error } = await supabase.from('faqs').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adminGetGalleryItems(): Promise<GalleryItem[]> {
  if (!isSupabaseConfigured()) {
    return readLocalTable(LOCAL_STORAGE_KEYS.gallery_items, SAMPLE_GALLERY_ITEMS)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
  }
  const { data, error } = await supabase
    .from('gallery_items')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error || !data)
    return readLocalTable(LOCAL_STORAGE_KEYS.gallery_items, SAMPLE_GALLERY_ITEMS);
  return data as GalleryItem[];
}

export async function adminUpsertGalleryItem(
  item: Partial<GalleryItem>
): Promise<GalleryItem> {
  if (!isSupabaseConfigured()) {
    const all = readLocalTable(LOCAL_STORAGE_KEYS.gallery_items, SAMPLE_GALLERY_ITEMS);
    if (item.id) {
      const updated = all.map((g) => (g.id === item.id ? ({ ...g, ...item } as GalleryItem) : g));
      writeLocalTable(LOCAL_STORAGE_KEYS.gallery_items, updated);
      return updated.find((g) => g.id === item.id)!;
    }
    const created: GalleryItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `gal-${Date.now()}`,
      image_url: item.image_url ?? null,
      before_image_url: item.before_image_url ?? null,
      caption: item.caption ?? '',
      category: item.category ?? 'Hair',
      sort_order: item.sort_order ?? all.length + 1,
      is_active: item.is_active ?? true,
      is_sample: item.is_sample ?? false,
      created_at: new Date().toISOString(),
    };
    writeLocalTable(LOCAL_STORAGE_KEYS.gallery_items, [...all, created]);
    return created;
  }

  if (item.id) {
    const { data, error } = await supabase
      .from('gallery_items')
      .update(item)
      .eq('id', item.id)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to save gallery item');
    return data as GalleryItem;
  } else {
    const { data, error } = await supabase
      .from('gallery_items')
      .insert(item)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message || 'Failed to create gallery item');
    return data as GalleryItem;
  }
}

export async function adminDeleteGalleryItem(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const all = readLocalTable(LOCAL_STORAGE_KEYS.gallery_items, SAMPLE_GALLERY_ITEMS).filter(
      (g) => g.id !== id
    );
    writeLocalTable(LOCAL_STORAGE_KEYS.gallery_items, all);
    return;
  }
  const { error } = await supabase.from('gallery_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adminUpsertSiteImage(
  slot: string,
  image_url: string | null,
  alt: string
): Promise<void> {
  const row: SiteImageRow = {
    slot,
    image_url,
    alt,
    updated_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    const current = await getPublicSiteImages();
    current[slot] = row;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCAL_STORAGE_KEYS.site_images, JSON.stringify(current));
    }
    return;
  }

  const { error } = await supabase.from('site_images').upsert(row, { onConflict: 'slot' });
  if (error) throw new Error(error.message);
}

// =============================================================================
// SITE SETTINGS, HOURS, BLOCKED DATES & HOMEPAGE TEXTS
// =============================================================================

export async function adminSaveBusinessHours(rows: BusinessHour[]): Promise<void> {
  if (!isSupabaseConfigured()) {
    saveLocalBusinessHours(rows);
    return;
  }
  for (const row of rows) {
    const { error } = await supabase.from('business_hours').upsert(
      {
        weekday: row.weekday,
        is_open: row.is_open,
        start_time: row.start_time,
        end_time: row.end_time,
      },
      { onConflict: 'weekday' }
    );
    if (error) throw new Error(error.message);
  }
}

export async function adminAddBlockedDate(
  blocked_date: string,
  reason: string
): Promise<BlockedDate> {
  if (!isSupabaseConfigured()) {
    const existing = await getPublicBlockedDates();
    const newRow: BlockedDate = {
      id: crypto.randomUUID ? crypto.randomUUID() : `blk-${Date.now()}`,
      blocked_date,
      reason: reason.trim() || null,
      created_at: new Date().toISOString(),
    };
    const next = [...existing.filter((b) => b.blocked_date !== blocked_date), newRow].sort((a, b) =>
      a.blocked_date.localeCompare(b.blocked_date)
    );
    saveLocalBlockedDates(next);
    return newRow;
  }
  const { data, error } = await supabase
    .from('blocked_dates')
    .upsert({ blocked_date, reason: reason.trim() || null }, { onConflict: 'blocked_date' })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message || 'Failed to add blocked date');
  return data as BlockedDate;
}

export async function adminRemoveBlockedDate(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const existing = await getPublicBlockedDates();
    saveLocalBlockedDates(existing.filter((b) => b.id !== id));
    return;
  }
  const { error } = await supabase.from('blocked_dates').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function adminSaveSalonSettings(settings: SalonSettings): Promise<void> {
  if (!isSupabaseConfigured()) {
    saveLocalSalonSettings(settings);
    return;
  }
  const { error } = await supabase.from('salon_settings').upsert(settings);
  if (error) throw new Error(error.message);
}

export async function adminSaveSiteTexts(texts: SiteTextsMap): Promise<void> {
  if (!isSupabaseConfigured()) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCAL_STORAGE_KEYS.site_texts, JSON.stringify(texts));
    }
    return;
  }
  const entries: Array<{ key: keyof SiteTextsMap; value: unknown }> = [
    { key: 'hero', value: texts.hero },
    { key: 'announcement', value: texts.announcement },
    { key: 'marquee', value: texts.marquee },
    { key: 'footer', value: texts.footer },
  ];
  for (const entry of entries) {
    const { error } = await supabase.from('site_texts').upsert(
      {
        key: entry.key,
        value: entry.value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
    if (error) throw new Error(error.message);
  }
}

// =============================================================================
// DATA TOOLS: JSON EXPORT & IMPORT
// =============================================================================

export async function adminExportAllJson() {
  const [
    services,
    stylists,
    courses,
    testimonials,
    gallery_items,
    faqs,
    salon_settings,
    business_hours,
    blocked_dates,
    site_texts,
    site_images,
  ] = await Promise.all([
    adminGetServices(),
    adminGetStylists(),
    adminGetCourses(),
    adminGetTestimonials(),
    adminGetGalleryItems(),
    adminGetFaqs(),
    getPublicSalonSettings(),
    getPublicBusinessHours(),
    getPublicBlockedDates(),
    getPublicSiteTexts(),
    getPublicSiteImages(),
  ]);

  return {
    exported_at: new Date().toISOString(),
    brand: 'Bbold Salon & Academy',
    salon_settings,
    business_hours,
    blocked_dates,
    site_texts,
    site_images,
    services,
    stylists,
    courses,
    testimonials,
    gallery_items,
    faqs,
  };
}

export async function adminImportBackupJson(backup: Record<string, unknown>): Promise<void> {
  if (backup.salon_settings && typeof backup.salon_settings === 'object') {
    await adminSaveSalonSettings(backup.salon_settings as SalonSettings);
  }
  if (Array.isArray(backup.business_hours)) {
    await adminSaveBusinessHours(backup.business_hours as BusinessHour[]);
  }
  if (backup.site_texts && typeof backup.site_texts === 'object') {
    await adminSaveSiteTexts(backup.site_texts as SiteTextsMap);
  }
  if (!isSupabaseConfigured()) {
    if (Array.isArray(backup.services))
      writeLocalTable(LOCAL_STORAGE_KEYS.services, backup.services as Service[]);
    if (Array.isArray(backup.stylists))
      writeLocalTable(LOCAL_STORAGE_KEYS.stylists, backup.stylists as Stylist[]);
    if (Array.isArray(backup.courses))
      writeLocalTable(LOCAL_STORAGE_KEYS.courses, backup.courses as Course[]);
    if (Array.isArray(backup.testimonials))
      writeLocalTable(LOCAL_STORAGE_KEYS.testimonials, backup.testimonials as Testimonial[]);
    if (Array.isArray(backup.gallery_items))
      writeLocalTable(LOCAL_STORAGE_KEYS.gallery_items, backup.gallery_items as GalleryItem[]);
    if (Array.isArray(backup.faqs))
      writeLocalTable(LOCAL_STORAGE_KEYS.faqs, backup.faqs as FaqItem[]);
    return;
  }

  if (Array.isArray(backup.services) && backup.services.length > 0) {
    await supabase.from('services').upsert(backup.services);
  }
  if (Array.isArray(backup.stylists) && backup.stylists.length > 0) {
    await supabase.from('stylists').upsert(backup.stylists);
  }
  if (Array.isArray(backup.courses) && backup.courses.length > 0) {
    await supabase.from('courses').upsert(backup.courses);
  }
  if (Array.isArray(backup.testimonials) && backup.testimonials.length > 0) {
    await supabase.from('testimonials').upsert(backup.testimonials);
  }
  if (Array.isArray(backup.gallery_items) && backup.gallery_items.length > 0) {
    await supabase.from('gallery_items').upsert(backup.gallery_items);
  }
  if (Array.isArray(backup.faqs) && backup.faqs.length > 0) {
    await supabase.from('faqs').upsert(backup.faqs);
  }
}
