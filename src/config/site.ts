import type { RoomId, SalonSettings, BusinessHour, SiteTextsMap } from '../types/database';

/**
 * Static fallbacks for Bbold Salon & Academy.
 * Unprovided facts are explicitly marked TODO and are editable in the Admin Dashboard.
 * Never invent years in business, awards, client counts, certifications, guarantees or offers.
 */
export const SITE_CONFIG = {
  brandName: 'Bbold Salon & Academy',
  shortBrandName: 'Bbold',
  city: 'Mumbai',
  timezone: 'Asia/Kolkata',
  instagramUrl: 'https://www.instagram.com/bboldmumbai',
  instagramHandle: '@bboldmumbai',
  whatsappUrl: 'https://wa.me/918928837509',
  whatsappNumber: '918928837509',
  defaultPhoneDisplay: '+91 89288 37509',
  defaultPhoneDigits: '8928837509',
  // Unprovided fields marked TODO until set in Admin > Salon settings
  todoAddress: 'TODO: Add full studio address and area in Mumbai (Admin > Salon settings)',
  todoEmail: 'TODO: Add salon email address (Admin > Salon settings)',
  todoOpeningHoursNote: 'TODO: Confirm weekly opening hours in Admin > Business hours',
} as const;

export const DEFAULT_SALON_SETTINGS: SalonSettings = {
  id: '00000000-0000-0000-0000-000000000001',
  salon_name: 'Bbold Salon & Academy',
  salon_email: 'TODO: confirm salon email in Admin > Salon settings',
  salon_phone: '8928837509',
  salon_address: 'TODO: confirm full studio address, Mumbai (edit in Admin > Salon settings)',
  slot_interval_minutes: 15,
  booking_notice_hours: 2,
  created_at: '2026-01-01T00:00:00.000Z',
};

export const DEFAULT_BUSINESS_HOURS: BusinessHour[] = [
  { id: 'bh-0', weekday: 0, is_open: true, start_time: '10:00:00', end_time: '20:00:00' }, // Sunday
  { id: 'bh-1', weekday: 1, is_open: false, start_time: '10:00:00', end_time: '20:00:00' }, // Monday (Closed)
  { id: 'bh-2', weekday: 2, is_open: true, start_time: '10:00:00', end_time: '20:00:00' }, // Tuesday
  { id: 'bh-3', weekday: 3, is_open: true, start_time: '10:00:00', end_time: '20:00:00' }, // Wednesday
  { id: 'bh-4', weekday: 4, is_open: true, start_time: '10:00:00', end_time: '20:00:00' }, // Thursday
  { id: 'bh-5', weekday: 5, is_open: true, start_time: '10:00:00', end_time: '20:00:00' }, // Friday
  { id: 'bh-6', weekday: 6, is_open: true, start_time: '10:00:00', end_time: '20:00:00' }, // Saturday
];

export const DEFAULT_SITE_TEXTS: SiteTextsMap = {
  hero: {
    line1: 'Look like you',
    line2: 'meant it.',
    accent: 'meant it.',
    subheadline:
      'Four dedicated stations for hair, makeup, nails, and skin—plus a hands-on training academy in Mumbai.',
    primary_cta: 'Reserve your appointment',
    secondary_cta: 'See services',
  },
  announcement: {
    enabled: true,
    text: 'Sample schedule active — reserve a chair online or message us on WhatsApp.',
    link: '/book',
  },
  marquee: {
    phrases: [
      'Haircuts & Restyling',
      'Balayage & Global Colour',
      'Bridal & Event Makeup',
      'Gel Extensions & Nail Art',
      'Hydrating Facials & Skin Prep',
      "Men's Grooming & Beard Sculpt",
      'Keratin & Hair Botox Smoothing',
      'HD & Airbrush Bridal Styling',
      'Luxury Spa Manicures & Pedicures',
      'Bbold Professional Training Academy',
      'Saree & Lehenga Draping',
      'Scalp Detox & Repair Spas',
      'Book Your Chair Online',
    ],
  },
  footer: {
    final_line: 'Make it bold, one station at a time. Bbold Salon & Academy · Mumbai.',
  },
};

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/**
 * Room colour mapping:
 * Hair, Hair Colour, Hair Treatments, Men's Grooming -> crimson ('hair')
 * Makeup, Bridal -> blush ('makeup')
 * Nails -> marigold ('nails')
 * Skin, Waxing & Threading -> sage ('skin')
 * Academy -> ink ('academy')
 */
export function getRoomForCategory(category?: string | null): RoomId {
  if (!category) return 'hair';
  const normalized = category.trim().toLowerCase();
  if (
    normalized.includes('hair') ||
    normalized.includes('colour') ||
    normalized.includes('color') ||
    normalized.includes('treatment') ||
    normalized.includes('men') ||
    normalized.includes('grooming')
  ) {
    return 'hair';
  }
  if (normalized.includes('makeup') || normalized.includes('bridal')) {
    return 'makeup';
  }
  if (normalized.includes('nail')) {
    return 'nails';
  }
  if (normalized.includes('skin') || normalized.includes('wax') || normalized.includes('thread')) {
    return 'skin';
  }
  if (normalized.includes('academy') || normalized.includes('course')) {
    return 'academy';
  }
  return 'hair';
}

export const ROOM_SWATCHES: Record<RoomId, { hex: string; inkHex: string; label: string }> = {
  hair: { hex: '#C4262E', inkHex: '#FFFFFF', label: 'Hair Station (Crimson)' },
  makeup: { hex: '#F2C9C0', inkHex: '#15110F', label: 'Makeup Station (Blush)' },
  nails: { hex: '#E8A317', inkHex: '#15110F', label: 'Nails Station (Marigold)' },
  skin: { hex: '#9AAA94', inkHex: '#15110F', label: 'Skin Station (Sage)' },
  academy: { hex: '#15110F', inkHex: '#F5F0E8', label: 'Bbold Academy (Ink)' },
  neutral: { hex: '#C4262E', inkHex: '#FFFFFF', label: 'Neutral (Crimson Accent)' },
};

/**
 * Formats numbers using Indian digit grouping (e.g., ₹1,200 or ₹20,000)
 */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return '₹—';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

/**
 * Builds a prefilled WhatsApp link to the salon number
 */
export function buildWhatsAppUrl(message?: string, customPhone?: string | null): string {
  const digits = (customPhone || SITE_CONFIG.whatsappNumber).replace(/\D+/g, '');
  const fullPhone = digits.length === 10 ? `91${digits}` : digits || SITE_CONFIG.whatsappNumber;
  if (!message) {
    return `https://wa.me/${fullPhone}`;
  }
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}
