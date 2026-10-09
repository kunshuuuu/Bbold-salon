export type RoomId = 'hair' | 'makeup' | 'nails' | 'skin' | 'academy' | 'neutral';

export type AudienceType = 'women' | 'men' | 'all';

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export type EnquiryStatus = 'new' | 'contacted' | 'enrolled' | 'closed';

export type IllustrationKey =
  | 'profile-bob'
  | 'profile-long-waves'
  | 'profile-updo'
  | 'man-profile-fade'
  | 'comb-and-scissors'
  | 'hair-dryer'
  | 'lipstick-and-mirror'
  | 'makeup-brushes'
  | 'nail-polish-bottles'
  | 'hand-with-nails'
  | 'facial-jar-and-leaf'
  | 'bridal-veil-and-flowers'
  | 'razor-and-brush'
  | 'salon-chair';

export type ImageMask = 'capsule' | 'arch' | 'oval' | 'circle' | 'rounded' | 'none';

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  created_at: string;
  // Additive extension columns
  category: string;
  audience: AudienceType;
  is_featured: boolean;
  sort_order: number;
  is_sample: boolean;
}

export interface Stylist {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  specialties: string[];
  is_active: boolean;
  sort_order: number;
  is_sample: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  service_id: string;
  stylist_id: string | null;
  appointment_date: string; // 'yyyy-MM-dd'
  start_time: string;       // 'HH:mm:ss'
  end_time: string;         // 'HH:mm:ss'
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
}

export interface BusySlot {
  stylist_id: string | null;
  start_time: string; // 'HH:mm:ss'
  end_time: string;   // 'HH:mm:ss'
}

export interface BusinessHour {
  id: string;
  weekday: number; // 0=Sunday ... 6=Saturday
  is_open: boolean;
  start_time: string; // 'HH:mm:ss'
  end_time: string;   // 'HH:mm:ss'
}

export interface BlockedDate {
  id: string;
  blocked_date: string; // 'yyyy-MM-dd'
  reason: string | null;
  created_at: string;
}

export interface SalonSettings {
  id: string;
  salon_name: string;
  salon_email: string | null;
  salon_phone: string | null;
  salon_address: string | null;
  slot_interval_minutes: 15 | 30 | 45 | 60;
  booking_notice_hours: number;
  created_at: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  description: string | null;
  duration_text: string | null;
  fee: number | null;
  is_active: boolean;
  sort_order: number;
  is_sample: boolean;
  created_at: string;
}

export interface AcademyEnquiry {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  course_id: string | null;
  message: string | null;
  status: EnquiryStatus;
  notes?: string | null;
  created_at: string;
}

export interface Testimonial {
  id: string;
  name: string;
  quote: string;
  service_label: string | null;
  consent: boolean;
  is_active: boolean;
  is_sample: boolean;
  created_at: string;
}

export interface GalleryItem {
  id: string;
  image_url: string | null;
  before_image_url: string | null;
  caption: string | null;
  category: string | null;
  sort_order: number;
  is_active: boolean;
  is_sample: boolean;
  created_at: string;
}

export interface SiteImageRow {
  slot: string;
  image_url: string | null;
  alt: string | null;
  updated_at: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_active: boolean;
  is_sample: boolean;
  created_at: string;
}

export interface HeroSiteText {
  line1: string;
  line2: string;
  accent: string;
  subheadline: string;
  primary_cta: string;
  secondary_cta: string;
}

export interface AnnouncementSiteText {
  enabled: boolean;
  text: string;
  link: string;
}

export interface MarqueeSiteText {
  phrases: string[];
}

export interface FooterSiteText {
  final_line: string;
}

export interface StationCardDetailItem {
  label: string;
  value: string;
}

export interface HomepageStationCard {
  id: string;
  num: string;
  title: string;
  description: string;
  categoryKey: string;
  room: RoomId;
  slot: string;
  image_url: string | null;
  image_alt?: string | null;
  details: StationCardDetailItem[];
  linkTo: string;
  linkLabel: string;
  is_active: boolean;
  sort_order: number;
}

export interface HomepageStationsSection {
  eyebrow: string;
  heading: string;
  cards: HomepageStationCard[];
}

export interface HomepageBeforeAfterConfig {
  before_image_url: string | null;
  after_image_url: string | null;
  category: string;
  title: string;
  caption: string;
  detail_note?: string;
}

export interface HomepageTransformationCard {
  id: string;
  title: string;
  description: string;
  category: string;
  detail_tag?: string;
  image_url: string | null;
  before_image_url?: string | null;
  slot?: string;
  linkTo: string;
  is_active: boolean;
  sort_order: number;
}

export interface HomepageTransformationsSection {
  eyebrow: string;
  heading: string;
  ctaLabel: string;
  ctaLink: string;
  beforeAfter: HomepageBeforeAfterConfig;
  cards: HomepageTransformationCard[];
}

export interface SiteTextsMap {
  hero: HeroSiteText;
  announcement: AnnouncementSiteText;
  marquee: MarqueeSiteText;
  footer: FooterSiteText;
  stations?: HomepageStationsSection;
  transformations?: HomepageTransformationsSection;
}

export interface SampleContentCounts {
  services: number;
  stylists: number;
  courses: number;
  testimonials: number;
  gallery_items: number;
  faqs: number;
  total: number;
}
