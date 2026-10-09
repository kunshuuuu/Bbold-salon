import { supabase, isSupabaseConfigured, supabaseUrl } from './supabase';
import {
  adminGetServices,
  adminGetStylists,
  adminGetCourses,
  adminGetTestimonials,
  adminGetGalleryItems,
  adminGetFaqs,
} from './adminApi';
import {
  getPublicSalonSettings,
  getPublicBusinessHours,
  getPublicSiteTexts,
  getPublicSiteImages,
} from './content';
import {
  DEFAULT_HOMEPAGE_STATIONS_SECTION,
  DEFAULT_HOMEPAGE_TRANSFORMATIONS_SECTION,
} from '../config/site';

export const ADMIN_ALLOWED_UID = '94ea72fb-56f0-4b7c-9d5f-9a944ce358b0';
export const ADMIN_ALLOWED_EMAIL = 'bboldmumbaisalon@gmail.com';
export const ADMIN_ALLOWED_PASS = 'bbold@2026';

export type ConnectionOverallState = 'connected' | 'partial' | 'not_connected';

export interface ConnectionStepStatus {
  id: string;
  label: string;
  description: string;
  status: 'done' | 'pending' | 'error';
  detail: string;
}

export interface SupabaseConnectionReport {
  overallState: ConnectionOverallState;
  statusLabel: 'Fully Connected' | 'Partially Connected' | 'Not Connected';
  progressPercent: number;
  checkedAt: string;
  steps: ConnectionStepStatus[];
  summaryMessage: string;
}

function sqlString(val: string | null | undefined): string {
  if (val === null || val === undefined) return 'null';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function sqlTextArray(arr: string[] | null | undefined): string {
  if (!arr || arr.length === 0) return "array[]::text[]";
  return `array[${arr.map((item) => sqlString(item)).join(', ')}]::text[]`;
}

/**
 * Checks live connection progress between the Admin Panel and Supabase.
 */
export async function checkSupabaseConnectionProgress(): Promise<SupabaseConnectionReport> {
  const checkedAt = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const envConfigured = isSupabaseConfigured();

  const steps: ConnectionStepStatus[] = [
    {
      id: 'env',
      label: '1. Supabase Project URL & Anon Key',
      description: 'Checks VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.',
      status: envConfigured ? 'done' : 'pending',
      detail: envConfigured
        ? `Supabase client configured and ready (${supabaseUrl}).`
        : 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set in environment.',
    },
    {
      id: 'core_tables',
      label: '2. Core Salon & Booking Tables',
      description: 'Verifies services, stylists, appointments, business_hours, blocked_dates, and salon_settings.',
      status: 'pending',
      detail: 'Waiting for connection check...',
    },
    {
      id: 'content_tables',
      label: '3. Website Content & Media Tables',
      description: 'Verifies courses, academy_enquiries, testimonials, gallery_items, site_images, faqs, and site_texts.',
      status: 'pending',
      detail: 'Waiting for connection check...',
    },
    {
      id: 'rpc_functions',
      label: '4. Booking & Availability RPC Functions',
      description: 'Verifies get_busy_slots(), create_appointment(), and public.is_admin() in Supabase.',
      status: 'pending',
      detail: 'Waiting for connection check...',
    },
    {
      id: 'admin_lock',
      label: '5. Single-Admin Lock (UID: 94ea72fb-56f0-4b7c-9d5f-9a944ce358b0)',
      description: 'Verifies bboldmumbaisalon@gmail.com (UID 94ea72fb-56f0-4b7c-9d5f-9a944ce358b0) is authorized.',
      status: 'pending',
      detail: 'Waiting for connection check...',
    },
  ];

  if (!envConfigured) {
    steps[1].detail = 'Configure Supabase URL & Anon Key and run the SQL script in Supabase SQL Editor.';
    steps[2].detail = 'Configure Supabase URL & Anon Key and run the SQL script in Supabase SQL Editor.';
    steps[3].detail = 'Configure Supabase URL & Anon Key and run the SQL script in Supabase SQL Editor.';
    steps[4].detail = 'Local Admin guard active for UID 94ea72fb-56f0-4b7c-9d5f-9a944ce358b0 (bboldmumbaisalon@gmail.com).';
    return {
      overallState: 'not_connected',
      statusLabel: 'Not Connected',
      progressPercent: 0,
      checkedAt,
      steps,
      summaryMessage:
        'Supabase is not connected yet. Download or copy the SQL below, paste and run it in your Supabase SQL Editor, ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set, and click Refresh.',
    };
  }

  // Step 2: Check Core Tables
  const coreTables = [
    'services',
    'stylists',
    'appointments',
    'business_hours',
    'blocked_dates',
    'salon_settings',
  ] as const;

  const coreResults = await Promise.all(
    coreTables.map(async (table) => {
      try {
        // appointments has RLS for admin only, so we check if table exists (even 0 rows is fine if no 42P01 missing-table error)
        const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
          return { table, ok: false, reason: error.message };
        }
        if (error && error.message.toLowerCase().includes('fetch')) {
          return { table, ok: false, reason: 'Network / project URL unreachable' };
        }
        return { table, ok: true, reason: '' };
      } catch (err) {
        return { table, ok: false, reason: err instanceof Error ? err.message : 'Error' };
      }
    })
  );

  const missingCore = coreResults.filter((r) => !r.ok);
  if (missingCore.length === 0) {
    steps[1].status = 'done';
    steps[1].detail = 'All 6 core tables verified in Supabase.';
  } else {
    steps[1].status = 'error';
    steps[1].detail = `Missing or unreachable tables: ${missingCore.map((m) => m.table).join(', ')}. Run the SQL in Supabase SQL Editor.`;
  }

  // Step 3: Check Content & Media Tables
  const contentTables = [
    'courses',
    'academy_enquiries',
    'testimonials',
    'gallery_items',
    'site_images',
    'faqs',
    'site_texts',
  ] as const;

  const contentResults = await Promise.all(
    contentTables.map(async (table) => {
      try {
        const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error && (error.code === '42P01' || error.message.includes('does not exist'))) {
          return { table, ok: false, reason: error.message };
        }
        if (error && error.message.toLowerCase().includes('fetch')) {
          return { table, ok: false, reason: 'Network / project URL unreachable' };
        }
        return { table, ok: true, reason: '' };
      } catch (err) {
        return { table, ok: false, reason: err instanceof Error ? err.message : 'Error' };
      }
    })
  );

  const missingContent = contentResults.filter((r) => !r.ok);
  if (missingContent.length === 0) {
    steps[2].status = 'done';
    steps[2].detail = 'All 7 website content & media tables verified in Supabase.';
  } else {
    steps[2].status = 'error';
    steps[2].detail = `Missing or unreachable tables: ${missingContent.map((m) => m.table).join(', ')}. Run the SQL in Supabase SQL Editor.`;
  }

  // Step 4: Check RPC Functions
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const [busyRpc, isAdminRpc] = await Promise.all([
      supabase.rpc('get_busy_slots', { p_date: todayStr }),
      supabase.rpc('is_admin'),
    ]);

    if (!busyRpc.error && !isAdminRpc.error) {
      steps[3].status = 'done';
      steps[3].detail = 'get_busy_slots(), create_appointment(), and is_admin() RPCs active.';
    } else {
      steps[3].status = 'error';
      steps[3].detail =
        busyRpc.error?.message ||
        isAdminRpc.error?.message ||
        'RPC functions not found. Paste and run the SQL script in Supabase SQL Editor.';
    }
  } catch {
    steps[3].status = 'error';
    steps[3].detail = 'Could not verify RPC functions. Paste and run the SQL script in Supabase SQL Editor.';
  }

  // Step 5: Check Single-Admin Lock (UID: 94ea72fb-56f0-4b7c-9d5f-9a944ce358b0)
  try {
    let {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const signInRes = await supabase.auth.signInWithPassword({
        email: ADMIN_ALLOWED_EMAIL,
        password: ADMIN_ALLOWED_PASS,
      });
      session = signInRes.data.session;
    }

    const sessionUid = session?.user?.id || '';
    const sessionEmail = (session?.user?.email || '').trim().toLowerCase();
    const { data: isAdminVal, error: isAdminErr } = await supabase.rpc('is_admin');

    if (
      session &&
      (sessionUid === ADMIN_ALLOWED_UID || sessionEmail === ADMIN_ALLOWED_EMAIL) &&
      !isAdminErr &&
      Boolean(isAdminVal)
    ) {
      steps[4].status = 'done';
      steps[4].detail = `Authenticated as ${ADMIN_ALLOWED_EMAIL} (UID: ${sessionUid}) with full admin RLS permissions.`;
    } else if (session && (sessionUid === ADMIN_ALLOWED_UID || sessionEmail === ADMIN_ALLOWED_EMAIL)) {
      steps[4].status = 'error';
      steps[4].detail = `Signed in as ${ADMIN_ALLOWED_EMAIL}, but admin_users RLS row is missing. Run the SQL script in Supabase SQL Editor.`;
    } else {
      steps[4].status = 'error';
      steps[4].detail = `Admin user (${ADMIN_ALLOWED_EMAIL} / UID ${ADMIN_ALLOWED_UID}) not authenticated in Supabase yet. Run the SQL script in Supabase SQL Editor.`;
    }
  } catch {
    steps[4].status = 'error';
    steps[4].detail = `Could not verify admin session for UID ${ADMIN_ALLOWED_UID}.`;
  }

  const completedSteps = steps.filter((s) => s.status === 'done').length;
  const progressPercent = Math.round((completedSteps / steps.length) * 100);

  if (completedSteps === steps.length) {
    return {
      overallState: 'connected',
      statusLabel: 'Fully Connected',
      progressPercent: 100,
      checkedAt,
      steps,
      summaryMessage: `Supabase is 100% connected and verified. Admin access is locked exclusively to ${ADMIN_ALLOWED_EMAIL} (UID: ${ADMIN_ALLOWED_UID}).`,
    };
  }

  return {
    overallState: 'partial',
    statusLabel: 'Partially Connected',
    progressPercent,
    checkedAt,
    steps,
    summaryMessage: `Supabase connection is ${progressPercent}% complete (${completedSteps}/${steps.length} checks passed). Paste and run the downloaded SQL in the Supabase SQL Editor, then click Refresh.`,
  };
}

/**
 * Generates the complete, idempotent SQL script for the Supabase SQL Editor.
 * Includes schema, RLS, strict admin UID 94ea72fb-56f0-4b7c-9d5f-9a944ce358b0 setup,
 * RPC functions, storage bucket, and all current salon data.
 */
export async function generateCompleteSupabaseSql(): Promise<string> {
  const [
    services,
    stylists,
    courses,
    testimonials,
    galleryItems,
    faqs,
    salonSettings,
    businessHours,
    siteTexts,
    siteImages,
  ] = await Promise.all([
    adminGetServices(),
    adminGetStylists(),
    adminGetCourses(),
    adminGetTestimonials(),
    adminGetGalleryItems(),
    adminGetFaqs(),
    getPublicSalonSettings(),
    getPublicBusinessHours(),
    getPublicSiteTexts(),
    getPublicSiteImages(),
  ]);

  const servicesSql = services
    .map(
      (s) =>
        `  (${sqlString(s.id)}, ${sqlString(s.name)}, ${sqlString(s.description)}, ${Number(
          s.duration_minutes
        )}, ${Number(s.price)}, ${sqlString(s.category || 'Hair')}, ${sqlString(
          s.audience || 'all'
        )}, ${Boolean(s.is_featured)}, ${Number(s.sort_order ?? 0)}, ${Boolean(
          s.is_active
        )}, ${Boolean(s.is_sample)})`
    )
    .join(',\n');

  const stylistsSql = stylists
    .map(
      (st) =>
        `  (${sqlString(st.id)}, ${sqlString(st.name)}, ${sqlString(st.title)}, ${sqlString(
          st.bio
        )}, ${sqlString(st.photo_url)}, ${sqlTextArray(st.specialties)}, ${Boolean(
          st.is_active
        )}, ${Number(st.sort_order ?? 0)}, ${Boolean(st.is_sample)})`
    )
    .join(',\n');

  const coursesSql = courses
    .map(
      (c) =>
        `  (${sqlString(c.id)}, ${sqlString(c.name)}, ${sqlString(c.description)}, ${sqlString(
          c.duration_text
        )}, ${c.fee === null || c.fee === undefined ? 'null' : Number(c.fee)}, ${Boolean(
          c.is_active
        )}, ${Number(c.sort_order ?? 0)}, ${Boolean(c.is_sample)})`
    )
    .join(',\n');

  const testimonialsSql = testimonials
    .map(
      (t) =>
        `  (${sqlString(t.id)}, ${sqlString(t.name)}, ${sqlString(t.quote)}, ${sqlString(
          t.service_label
        )}, ${Boolean(t.consent)}, ${Boolean(t.is_active)}, ${Boolean(t.is_sample)})`
    )
    .join(',\n');

  const gallerySql = galleryItems
    .map(
      (g) =>
        `  (${sqlString(g.id)}, ${sqlString(g.image_url)}, ${sqlString(
          g.before_image_url ? g.before_image_url.trim() : null
        )}, ${sqlString(g.caption)}, ${sqlString(g.category)}, ${Number(
          g.sort_order ?? 0
        )}, ${Boolean(g.is_active)}, ${Boolean(g.is_sample)})`
    )
    .join(',\n');

  const faqsSql = faqs
    .map(
      (f) =>
        `  (${sqlString(f.id)}, ${sqlString(f.question)}, ${sqlString(f.answer)}, ${sqlString(
          f.category
        )}, ${Number(f.sort_order ?? 0)}, ${Boolean(f.is_active)}, ${Boolean(f.is_sample)})`
    )
    .join(',\n');

  const hoursSql = businessHours
    .map(
      (h) =>
        `  (${Number(h.weekday)}, ${Boolean(h.is_open)}, ${sqlString(h.start_time)}, ${sqlString(
          h.end_time
        )})`
    )
    .join(',\n');

  const siteImageEntries = Object.values(siteImages || {});
  const siteImagesBlock =
    siteImageEntries.length > 0
      ? `insert into public.site_images (slot, image_url, alt, updated_at) values\n` +
        siteImageEntries
          .map(
            (img) =>
              `  (${sqlString(img.slot)}, ${sqlString(img.image_url)}, ${sqlString(
                img.alt
              )}, now())`
          )
          .join(',\n') +
        `\non conflict (slot) do update set\n  image_url = excluded.image_url,\n  alt = excluded.alt,\n  updated_at = now();\n`
      : `-- No custom site_images rows to seed yet\n`;

  return `-- =============================================================================
-- BBOLD SALON & ACADEMY (MUMBAI) — COMPLETE SUPABASE SQL SETUP & SEED SCRIPT
-- Generated from Admin Panel -> Data Tools
--
-- Single Authorized Admin Account:
--   UID      : ${ADMIN_ALLOWED_UID}
--   Email    : ${ADMIN_ALLOWED_EMAIL}
--   Password : ${ADMIN_ALLOWED_PASS}
--
-- HOW TO USE:
-- 1. Open your Supabase Dashboard -> SQL Editor -> New Query.
-- 2. Paste this entire file and click "Run".
-- 3. Return to the Bbold Admin Panel -> Data Tools and click "Refresh Connection".
-- =============================================================================

begin;

create extension if not exists pgcrypto;

-- =============================================================================
-- 1. CORE & ADDITIVE TABLES
-- =============================================================================

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  price numeric(10, 2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  category text not null default 'Hair',
  audience text not null default 'all' check (audience in ('women', 'men', 'all')),
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  is_sample boolean not null default false
);

alter table public.services
  add column if not exists category text not null default 'Hair',
  add column if not exists audience text not null default 'all' check (audience in ('women', 'men', 'all')),
  add column if not exists is_featured boolean not null default false,
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_sample boolean not null default false;

create table if not exists public.stylists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  bio text,
  photo_url text null,
  specialties text[] not null default '{}',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  service_id uuid not null references public.services(id) on delete restrict,
  stylist_id uuid null references public.stylists(id) on delete set null,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.appointments
  add column if not exists stylist_id uuid null references public.stylists(id) on delete set null;

create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  weekday integer not null unique check (weekday >= 0 and weekday <= 6),
  is_open boolean not null default true,
  start_time time not null default '10:00:00',
  end_time time not null default '20:00:00',
  check (end_time > start_time)
);

create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null unique,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.salon_settings (
  id uuid primary key default gen_random_uuid(),
  salon_name text not null default 'Bbold Salon & Academy',
  salon_email text,
  salon_phone text,
  salon_address text,
  slot_interval_minutes integer not null default 15 check (slot_interval_minutes in (15, 30, 45, 60)),
  booking_notice_hours integer not null default 2 check (booking_notice_hours >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_text text,
  fee numeric(10, 2) check (fee is null or fee >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.academy_enquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text not null,
  course_id uuid null references public.courses(id) on delete set null,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'enrolled', 'closed')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  quote text not null,
  service_label text,
  consent boolean not null default false,
  is_active boolean not null default true,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  constraint testimonials_real_consent_check check (is_sample = true or is_active = false or consent = true)
);

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  image_url text null,
  before_image_url text null,
  caption text,
  category text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.site_images (
  slot text primary key,
  image_url text,
  alt text,
  updated_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.site_texts (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_date_status on public.appointments(appointment_date, status);
create index if not exists idx_appointments_stylist_date on public.appointments(stylist_id, appointment_date);
create index if not exists idx_services_active_sort on public.services(is_active, category, sort_order);
create index if not exists idx_stylists_active_sort on public.stylists(is_active, sort_order);

-- =============================================================================
-- 2. PROVISION & LOCK SINGLE ADMIN USER
--    UID      : ${ADMIN_ALLOWED_UID}
--    Email    : ${ADMIN_ALLOWED_EMAIL}
--    Password : ${ADMIN_ALLOWED_PASS}
-- =============================================================================

do $$
declare
  v_admin_uid constant uuid := '${ADMIN_ALLOWED_UID}'::uuid;
  v_admin_email constant text := '${ADMIN_ALLOWED_EMAIL}';
  v_admin_pass constant text := '${ADMIN_ALLOWED_PASS}';
  v_existing_uid uuid;
begin
  -- Ensure the admin account exists in auth.users with the exact UID, email, and password
  begin
    select id into v_existing_uid
      from auth.users
     where id = v_admin_uid or lower(email) = v_admin_email
     limit 1;

    if v_existing_uid is not null then
      update auth.users
         set email = v_admin_email,
             encrypted_password = crypt(v_admin_pass, gen_salt('bf')),
             email_confirmed_at = coalesce(email_confirmed_at, now()),
             updated_at = now(),
             raw_app_meta_data = coalesce(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
             raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
       where id = v_existing_uid;
    else
      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000',
        v_admin_uid,
        'authenticated',
        'authenticated',
        v_admin_email,
        crypt(v_admin_pass, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"role":"admin"}'::jsonb,
        now(),
        now(),
        '',
        '',
        '',
        ''
      );
      v_existing_uid := v_admin_uid;
    end if;

    -- Ensure auth.identities entry exists for email login
    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    select
      gen_random_uuid(),
      v_existing_uid,
      v_existing_uid::text,
      jsonb_build_object('sub', v_existing_uid::text, 'email', v_admin_email, 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    where not exists (
      select 1 from auth.identities where user_id = v_existing_uid and provider = 'email'
    );
  exception when others then
    raise notice 'auth.users check completed: %', sqlerrm;
  end;

  -- Remove any other user from public.admin_users so ONLY this admin can access the panel
  delete from public.admin_users
   where user_id <> coalesce(v_existing_uid, v_admin_uid);

  -- Register the single authorized admin in public.admin_users
  insert into public.admin_users (user_id)
  select id from auth.users
   where id = v_admin_uid or lower(email) = v_admin_email
  on conflict (user_id) do nothing;
end
$$;

-- =============================================================================
-- 3. ROW LEVEL SECURITY (RLS) & STRICT SINGLE-ADMIN CHECK
-- =============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    auth.uid() = '${ADMIN_ALLOWED_UID}'::uuid
    or (
      lower(coalesce(auth.jwt() ->> 'email', '')) = '${ADMIN_ALLOWED_EMAIL}'
      and exists (
        select 1
        from public.admin_users
        where user_id = auth.uid()
      )
    )
    or exists (
      select 1
      from public.admin_users
      where user_id = auth.uid()
        and user_id = '${ADMIN_ALLOWED_UID}'::uuid
    )
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.business_hours enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.salon_settings enable row level security;
alter table public.admin_users enable row level security;
alter table public.stylists enable row level security;
alter table public.courses enable row level security;
alter table public.academy_enquiries enable row level security;
alter table public.testimonials enable row level security;
alter table public.gallery_items enable row level security;
alter table public.site_images enable row level security;
alter table public.faqs enable row level security;
alter table public.site_texts enable row level security;

drop policy if exists "services_public_select" on public.services;
create policy "services_public_select" on public.services
  for select using (is_active = true or public.is_admin());

drop policy if exists "services_admin_all" on public.services;
create policy "services_admin_all" on public.services
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "stylists_public_select" on public.stylists;
create policy "stylists_public_select" on public.stylists
  for select using (is_active = true or public.is_admin());

drop policy if exists "stylists_admin_all" on public.stylists;
create policy "stylists_admin_all" on public.stylists
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "courses_public_select" on public.courses;
create policy "courses_public_select" on public.courses
  for select using (is_active = true or public.is_admin());

drop policy if exists "courses_admin_all" on public.courses;
create policy "courses_admin_all" on public.courses
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "testimonials_public_select" on public.testimonials;
create policy "testimonials_public_select" on public.testimonials
  for select using (is_active = true or public.is_admin());

drop policy if exists "testimonials_admin_all" on public.testimonials;
create policy "testimonials_admin_all" on public.testimonials
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "gallery_items_public_select" on public.gallery_items;
create policy "gallery_items_public_select" on public.gallery_items
  for select using (is_active = true or public.is_admin());

drop policy if exists "gallery_items_admin_all" on public.gallery_items;
create policy "gallery_items_admin_all" on public.gallery_items
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "faqs_public_select" on public.faqs;
create policy "faqs_public_select" on public.faqs
  for select using (is_active = true or public.is_admin());

drop policy if exists "faqs_admin_all" on public.faqs;
create policy "faqs_admin_all" on public.faqs
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "business_hours_public_select" on public.business_hours;
create policy "business_hours_public_select" on public.business_hours
  for select using (true);

drop policy if exists "business_hours_admin_all" on public.business_hours;
create policy "business_hours_admin_all" on public.business_hours
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "blocked_dates_public_select" on public.blocked_dates;
create policy "blocked_dates_public_select" on public.blocked_dates
  for select using (true);

drop policy if exists "blocked_dates_admin_all" on public.blocked_dates;
create policy "blocked_dates_admin_all" on public.blocked_dates
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "salon_settings_public_select" on public.salon_settings;
create policy "salon_settings_public_select" on public.salon_settings
  for select using (true);

drop policy if exists "salon_settings_admin_all" on public.salon_settings;
create policy "salon_settings_admin_all" on public.salon_settings
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "site_images_public_select" on public.site_images;
create policy "site_images_public_select" on public.site_images
  for select using (true);

drop policy if exists "site_images_admin_all" on public.site_images;
create policy "site_images_admin_all" on public.site_images
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "site_texts_public_select" on public.site_texts;
create policy "site_texts_public_select" on public.site_texts
  for select using (true);

drop policy if exists "site_texts_admin_all" on public.site_texts;
create policy "site_texts_admin_all" on public.site_texts
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "appointments_admin_all" on public.appointments;
create policy "appointments_admin_all" on public.appointments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "academy_enquiries_public_insert" on public.academy_enquiries;
create policy "academy_enquiries_public_insert" on public.academy_enquiries
  for insert with check (
    char_length(trim(full_name)) between 2 and 80
    and phone ~ '^[6-9][0-9]{9}$'
    and char_length(trim(email)) between 5 and 120
    and email ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
    and coalesce(char_length(message), 0) <= 1000
    and status = 'new'
  );

drop policy if exists "academy_enquiries_admin_all" on public.academy_enquiries;
create policy "academy_enquiries_admin_all" on public.academy_enquiries
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_users_select_own" on public.admin_users;
create policy "admin_users_select_own" on public.admin_users
  for select using (auth.uid() = user_id or public.is_admin());

-- =============================================================================
-- 4. PUBLIC AVAILABILITY & BOOKING FUNCTIONS (SECURITY DEFINER)
-- =============================================================================

create or replace function public.get_busy_slots(p_date date)
returns table(stylist_id uuid, start_time time, end_time time)
language sql
stable
security definer
set search_path = public
as $$
  select stylist_id, start_time, end_time
  from public.appointments
  where appointment_date = p_date
    and status <> 'cancelled';
$$;

grant execute on function public.get_busy_slots(date) to anon, authenticated;

create or replace function public.create_appointment(
  p_full_name text,
  p_email text,
  p_phone text,
  p_service_id uuid,
  p_stylist_id uuid,
  p_date date,
  p_start time,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean_name text := trim(coalesce(p_full_name, ''));
  v_clean_email text := lower(trim(coalesce(p_email, '')));
  v_clean_phone text := regexp_replace(trim(coalesce(p_phone, '')), '\\s+', '', 'g');
  v_clean_notes text := nullif(trim(coalesce(p_notes, '')), '');
  v_service record;
  v_settings record;
  v_hours record;
  v_end_interval interval;
  v_end time;
  v_now_ist timestamp;
  v_today_ist date;
  v_slot_ts timestamp;
  v_interval_mins int := 15;
  v_notice_hours int := 2;
  v_minutes_from_open numeric;
  v_pending_count int;
  v_active_stylist_count int;
  v_free_stylist_count int;
  v_null_overlap_count int;
  v_assigned_stylist uuid;
  v_new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('bbold_appt_' || coalesce(p_date::text, 'none')));

  if p_date is null or p_start is null or p_service_id is null then
    raise exception 'invalid_input';
  end if;

  if char_length(v_clean_name) < 2 or char_length(v_clean_name) > 80 then
    raise exception 'invalid_input';
  end if;

  if v_clean_phone !~ '^[6-9][0-9]{9}$' then
    raise exception 'invalid_input';
  end if;

  if char_length(v_clean_email) < 5 or char_length(v_clean_email) > 120 or v_clean_email !~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' then
    raise exception 'invalid_input';
  end if;

  if v_clean_notes is not null and char_length(v_clean_notes) > 500 then
    raise exception 'invalid_input';
  end if;

  select id, duration_minutes, is_active
    into v_service
    from public.services
   where id = p_service_id;

  if not found or not v_service.is_active or v_service.duration_minutes <= 0 then
    raise exception 'invalid_input';
  end if;

  v_end_interval := (p_start - time '00:00:00') + make_interval(mins => v_service.duration_minutes);
  if v_end_interval >= interval '24 hours' then
    raise exception 'invalid_input';
  end if;

  v_end := time '00:00:00' + v_end_interval;
  if v_end <= p_start then
    raise exception 'invalid_input';
  end if;

  select slot_interval_minutes, booking_notice_hours
    into v_settings
    from public.salon_settings
   order by created_at asc
   limit 1;

  if found then
    v_interval_mins := coalesce(v_settings.slot_interval_minutes, 15);
    v_notice_hours := coalesce(v_settings.booking_notice_hours, 2);
  end if;

  if exists (select 1 from public.blocked_dates where blocked_date = p_date) then
    raise exception 'blocked';
  end if;

  select is_open, start_time, end_time
    into v_hours
    from public.business_hours
   where weekday = extract(dow from p_date)::int;

  if not found or not v_hours.is_open then
    raise exception 'closed';
  end if;

  if p_start < v_hours.start_time or v_end > v_hours.end_time then
    raise exception 'closed';
  end if;

  v_minutes_from_open := extract(epoch from (p_start - v_hours.start_time)) / 60.0;
  if v_minutes_from_open < 0 or mod(v_minutes_from_open, v_interval_mins) <> 0 then
    raise exception 'invalid_input';
  end if;

  v_now_ist := (now() at time zone 'Asia/Kolkata');
  v_today_ist := v_now_ist::date;
  v_slot_ts := p_date + p_start;

  if v_slot_ts < (v_now_ist + make_interval(hours => v_notice_hours)) then
    raise exception 'too_soon';
  end if;

  if p_date > (v_today_ist + 60) then
    raise exception 'invalid_input';
  end if;

  select count(*)
    into v_pending_count
    from public.appointments
   where phone = v_clean_phone
     and status = 'pending'
     and (appointment_date + start_time) >= v_now_ist;

  if v_pending_count >= 3 then
    raise exception 'invalid_input';
  end if;

  select count(*)
    into v_active_stylist_count
    from public.stylists
   where is_active = true;

  select count(*)
    into v_null_overlap_count
    from public.appointments a
   where a.appointment_date = p_date
     and a.status <> 'cancelled'
     and a.stylist_id is null
     and p_start < a.end_time
     and v_end > a.start_time;

  if p_stylist_id is not null then
    if not exists (select 1 from public.stylists where id = p_stylist_id and is_active = true) then
      raise exception 'invalid_input';
    end if;

    if exists (
      select 1
        from public.appointments a
       where a.appointment_date = p_date
         and a.status <> 'cancelled'
         and a.stylist_id = p_stylist_id
         and p_start < a.end_time
         and v_end > a.start_time
    ) then
      raise exception 'slot_taken';
    end if;

    select count(*)
      into v_free_stylist_count
      from public.stylists s
     where s.is_active = true
       and not exists (
         select 1
           from public.appointments a
          where a.appointment_date = p_date
            and a.status <> 'cancelled'
            and a.stylist_id = s.id
            and p_start < a.end_time
            and v_end > a.start_time
       );

    if v_free_stylist_count <= v_null_overlap_count then
      raise exception 'slot_taken';
    end if;

    v_assigned_stylist := p_stylist_id;
  else
    if v_active_stylist_count = 0 then
      if exists (
        select 1
          from public.appointments a
         where a.appointment_date = p_date
           and a.status <> 'cancelled'
           and p_start < a.end_time
           and v_end > a.start_time
      ) then
        raise exception 'slot_taken';
      end if;
      v_assigned_stylist := null;
    else
      select count(*)
        into v_free_stylist_count
        from public.stylists s
       where s.is_active = true
         and not exists (
           select 1
             from public.appointments a
            where a.appointment_date = p_date
              and a.status <> 'cancelled'
              and a.stylist_id = s.id
              and p_start < a.end_time
              and v_end > a.start_time
         );

      if v_free_stylist_count <= v_null_overlap_count then
        raise exception 'slot_taken';
      end if;

      select s.id
        into v_assigned_stylist
        from public.stylists s
       where s.is_active = true
         and not exists (
           select 1
             from public.appointments a
            where a.appointment_date = p_date
              and a.status <> 'cancelled'
              and a.stylist_id = s.id
              and p_start < a.end_time
              and v_end > a.start_time
         )
       order by s.sort_order asc, s.created_at asc
       limit 1;

      if v_assigned_stylist is null then
        raise exception 'slot_taken';
      end if;
    end if;
  end if;

  insert into public.appointments (
    full_name,
    email,
    phone,
    service_id,
    stylist_id,
    appointment_date,
    start_time,
    end_time,
    status,
    notes
  ) values (
    v_clean_name,
    v_clean_email,
    v_clean_phone,
    p_service_id,
    v_assigned_stylist,
    p_date,
    p_start,
    v_end,
    'pending',
    v_clean_notes
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

grant execute on function public.create_appointment(text, text, text, uuid, uuid, date, time, text) to anon, authenticated;

-- =============================================================================
-- 5. STORAGE BUCKET "media" (Public Read, Single-Admin Write)
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media_admin_insert" on storage.objects;
create policy "media_admin_insert" on storage.objects
  for insert with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_admin_update" on storage.objects;
create policy "media_admin_update" on storage.objects
  for update using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_admin_delete" on storage.objects;
create policy "media_admin_delete" on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());

-- =============================================================================
-- 6. SEED DATA (Idempotent Upserts for Settings, Hours, Texts, Services, Team, etc.)
-- =============================================================================

insert into public.salon_settings (
  id,
  salon_name,
  salon_email,
  salon_phone,
  salon_address,
  slot_interval_minutes,
  booking_notice_hours
) values (
  '00000000-0000-0000-0000-000000000001',
  ${sqlString(salonSettings.salon_name || 'Bbold Salon & Academy')},
  ${sqlString(salonSettings.salon_email)},
  ${sqlString(salonSettings.salon_phone || '8928837509')},
  ${sqlString(salonSettings.salon_address)},
  ${Number(salonSettings.slot_interval_minutes || 15)},
  ${Number(salonSettings.booking_notice_hours ?? 2)}
)
on conflict (id) do update set
  salon_name = excluded.salon_name,
  salon_email = excluded.salon_email,
  salon_phone = excluded.salon_phone,
  salon_address = excluded.salon_address,
  slot_interval_minutes = excluded.slot_interval_minutes,
  booking_notice_hours = excluded.booking_notice_hours;

insert into public.business_hours (weekday, is_open, start_time, end_time) values
${hoursSql}
on conflict (weekday) do update set
  is_open = excluded.is_open,
  start_time = excluded.start_time,
  end_time = excluded.end_time;

insert into public.site_texts (key, value) values
  ('hero', ${sqlString(JSON.stringify(siteTexts.hero))}::jsonb),
  ('announcement', ${sqlString(JSON.stringify(siteTexts.announcement))}::jsonb),
  ('marquee', ${sqlString(JSON.stringify(siteTexts.marquee))}::jsonb),
  ('footer', ${sqlString(JSON.stringify(siteTexts.footer))}::jsonb),
  ('stations', ${sqlString(JSON.stringify(siteTexts.stations || DEFAULT_HOMEPAGE_STATIONS_SECTION))}::jsonb),
  ('transformations', ${sqlString(JSON.stringify(siteTexts.transformations || DEFAULT_HOMEPAGE_TRANSFORMATIONS_SECTION))}::jsonb)
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();

${siteImagesBlock}

insert into public.services (
  id, name, description, duration_minutes, price, category, audience, is_featured, sort_order, is_active, is_sample
) values
${servicesSql}
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  duration_minutes = excluded.duration_minutes,
  price = excluded.price,
  category = excluded.category,
  audience = excluded.audience,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  is_sample = excluded.is_sample;

insert into public.stylists (
  id, name, title, bio, photo_url, specialties, is_active, sort_order, is_sample
) values
${stylistsSql}
on conflict (id) do update set
  name = excluded.name,
  title = excluded.title,
  bio = excluded.bio,
  photo_url = coalesce(excluded.photo_url, public.stylists.photo_url),
  specialties = excluded.specialties,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  is_sample = excluded.is_sample;

insert into public.courses (
  id, name, description, duration_text, fee, is_active, sort_order, is_sample
) values
${coursesSql}
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  duration_text = excluded.duration_text,
  fee = excluded.fee,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  is_sample = excluded.is_sample;

insert into public.testimonials (
  id, name, quote, service_label, consent, is_active, is_sample
) values
${testimonialsSql}
on conflict (id) do update set
  name = excluded.name,
  quote = excluded.quote,
  service_label = excluded.service_label,
  consent = excluded.consent,
  is_active = excluded.is_active,
  is_sample = excluded.is_sample;

insert into public.gallery_items (
  id, image_url, before_image_url, caption, category, sort_order, is_active, is_sample
) values
${gallerySql}
on conflict (id) do update set
  image_url = coalesce(excluded.image_url, public.gallery_items.image_url),
  before_image_url = coalesce(excluded.before_image_url, public.gallery_items.before_image_url),
  caption = excluded.caption,
  category = excluded.category,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  is_sample = excluded.is_sample;

insert into public.faqs (
  id, question, answer, category, sort_order, is_active, is_sample
) values
${faqsSql}
on conflict (id) do update set
  question = excluded.question,
  answer = excluded.answer,
  category = excluded.category,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  is_sample = excluded.is_sample;

commit;
`;
}
