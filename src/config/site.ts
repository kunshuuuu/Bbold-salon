import type {
  RoomId,
  SalonSettings,
  BusinessHour,
  SiteTextsMap,
  HomepageStationsSection,
  HomepageTransformationsSection,
} from '../types/database';

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

export const DEFAULT_HOMEPAGE_STATIONS_SECTION: HomepageStationsSection = {
  eyebrow: '02 / Six Stations Under One Roof',
  heading: 'Pick Your Chair or Classroom',
  cards: [
    {
      id: 'station-card-01',
      num: '01',
      title: 'Hair Salon',
      description:
        'Precision cuts, dimensional balayage, root touch-ups, keratin smoothing, and restorative hair spas.',
      categoryKey: 'Hair',
      room: 'hair',
      slot: 'station_1',
      image_url: null,
      image_alt: 'Station 01: Hair Salon at Bbold Mumbai',
      details: [
        { label: "Women's Haircut", value: 'from ₹1,200' },
        { label: "Kids' Haircut", value: 'from ₹600' },
        { label: 'Trim & Fringe', value: 'from ₹600' },
        { label: 'Wash & Blow-dry', value: 'from ₹700' },
      ],
      linkTo: '/services?category=Hair',
      linkLabel: 'Explore Hair Menu →',
      is_active: true,
      sort_order: 1,
    },
    {
      id: 'station-card-02',
      num: '02',
      title: "Men's Grooming",
      description:
        'Sharp haircut & styling, beard trim and hot-towel shave, express detan, and grey blending.',
      categoryKey: "Men's Grooming",
      room: 'hair',
      slot: 'station_2',
      image_url: null,
      image_alt: "Station 02: Men's Grooming at Bbold Mumbai",
      details: [
        { label: "Men's Haircut", value: 'from ₹600' },
        { label: 'Haircut & Styling', value: 'from ₹800' },
        { label: 'Beard Trim & Shape', value: 'from ₹400' },
        { label: 'Clean Shave', value: 'from ₹350' },
      ],
      linkTo: '/services?category=Men',
      linkLabel: "Explore Men's Menu →",
      is_active: true,
      sort_order: 2,
    },
    {
      id: 'station-card-03',
      num: '03',
      title: 'Nail Studio',
      description:
        'Gel polish manicures, soft-gel & acrylic extensions, custom nail art, and spa pedicures.',
      categoryKey: 'Nails',
      room: 'nails',
      slot: 'station_3',
      image_url: null,
      image_alt: 'Station 03: Nail Studio at Bbold Mumbai',
      details: [
        { label: 'Classic Manicure', value: 'from ₹500' },
        { label: 'Spa Pedicure', value: 'from ₹1,100' },
        { label: 'Gel Polish Application', value: 'from ₹900' },
        { label: 'Nail Extensions (Gel / Acrylic)', value: 'from ₹2,800' },
      ],
      linkTo: '/services?category=Nails',
      linkLabel: 'Explore Nail Studio →',
      is_active: true,
      sort_order: 3,
    },
    {
      id: 'station-card-04',
      num: '04',
      title: 'Makeup & Bridal',
      description:
        'Cocktail & party glam, pre-bridal trials, HD & airbrush bridal styling, and saree draping.',
      categoryKey: 'Makeup',
      room: 'makeup',
      slot: 'station_4',
      image_url: null,
      image_alt: 'Station 04: Makeup & Bridal Studio at Bbold Mumbai',
      details: [
        { label: 'Party Makeup', value: 'from ₹3,500' },
        { label: 'Party Makeup & Hairstyle', value: 'from ₹5,000' },
        { label: 'Engagement Makeup', value: 'from ₹9,000' },
        { label: 'Bridal Makeup', value: 'from ₹20,000' },
      ],
      linkTo: '/bridal',
      linkLabel: 'Explore Bridal Studio →',
      is_active: true,
      sort_order: 4,
    },
    {
      id: 'station-card-05',
      num: '05',
      title: 'Skin & Facials',
      description:
        'Classic clean-ups, brightening & hydrating facials, chemical peels, waxing, and threading.',
      categoryKey: 'Skin',
      room: 'skin',
      slot: 'station_5',
      image_url: null,
      image_alt: 'Station 05: Skin & Facials at Bbold Mumbai',
      details: [
        { label: 'Classic Clean-Up', value: 'from ₹900' },
        { label: 'Hydrating Facial', value: 'from ₹2,000' },
        { label: 'Brightening / Detan Facial', value: 'from ₹2,200' },
        { label: 'Anti-ageing Facial', value: 'from ₹3,000' },
      ],
      linkTo: '/services?category=Skin',
      linkLabel: 'Explore Skin Menu →',
      is_active: true,
      sort_order: 5,
    },
    {
      id: 'station-card-06',
      num: '06',
      title: 'Bbold Academy',
      description:
        'Hands-on professional courses in hairdressing, bridal makeup, nail extensions, and cosmetology.',
      categoryKey: 'Academy',
      room: 'academy',
      slot: 'station_6',
      image_url: null,
      image_alt: 'Station 06: Bbold Academy in Mumbai',
      details: [
        { label: 'Professional Hairdressing Course', value: '12 Weeks' },
        { label: 'Bridal & Event Makeup Artistry', value: '8 Weeks' },
        { label: 'Nail Art & Extension Technician', value: '4 Weeks' },
      ],
      linkTo: '/academy',
      linkLabel: 'Explore Courses →',
      is_active: true,
      sort_order: 6,
    },
  ],
};

export const DEFAULT_HOMEPAGE_TRANSFORMATIONS_SECTION: HomepageTransformationsSection = {
  eyebrow: '04 / Real Transformations',
  heading: 'Before & After Lookbook',
  ctaLabel: 'Open full gallery →',
  ctaLink: '/gallery',
  beforeAfter: {
    before_image_url: null,
    after_image_url: null,
    category: 'Hair Colour',
    title: 'Dimensional Caramel Balayage & Gloss Finish',
    caption:
      'Warm caramel balayage blended from natural dark roots with a bond-protecting gloss toner — drag handle to compare.',
    detail_note: 'Freehand Balayage · Gloss Toner · Precision Blow-Dry',
  },
  cards: [
    {
      id: 'transform-card-01',
      title: 'Long Layered Blow-Dry & Curtain Fringe',
      description:
        'Section-by-section layered haircut with face-framing curtain fringe and a bouncy round-brush blowout.',
      category: 'Hair',
      detail_tag: 'Cut & Blow-Dry',
      image_url: null,
      before_image_url: null,
      slot: 'transform_card_1',
      linkTo: '/gallery',
      is_active: true,
      sort_order: 1,
    },
    {
      id: 'transform-card-02',
      title: 'Soft-Matte Bridal & Reception Glam',
      description:
        'HD skin preparation, warm bronze eye detailing, custom lash placement, and sculpted reception hairstyling.',
      category: 'Makeup',
      detail_tag: 'Bridal & Makeup',
      image_url: null,
      before_image_url: null,
      slot: 'transform_card_2',
      linkTo: '/gallery',
      is_active: true,
      sort_order: 2,
    },
    {
      id: 'transform-card-03',
      title: 'Almond Gel Extensions & Micro-French Art',
      description:
        'Custom soft-gel extensions shaped to a clean almond silhouette with glossy crimson micro-French tips.',
      category: 'Nails',
      detail_tag: 'Nail Studio',
      image_url: null,
      before_image_url: null,
      slot: 'transform_card_3',
      linkTo: '/gallery',
      is_active: true,
      sort_order: 3,
    },
  ],
};

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
  stations: DEFAULT_HOMEPAGE_STATIONS_SECTION,
  transformations: DEFAULT_HOMEPAGE_TRANSFORMATIONS_SECTION,
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
