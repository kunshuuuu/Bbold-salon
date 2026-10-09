-- =============================================================================
-- Bbold Salon & Academy — Complete Database Schema, Additive Extension, RLS & RPCs
-- Run this first in the Supabase SQL Editor, then run supabase/seed.sql.
-- =============================================================================

create extension if not exists pgcrypto;

-- =============================================================================
-- 1. CORE SCHEMA (Frozen exact table & column definitions)
-- =============================================================================

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  price numeric(10, 2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  service_id uuid not null references public.services(id) on delete restrict,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  weekday integer not null unique check (weekday >= 0 and weekday <= 6), -- 0=Sunday ... 6=Saturday
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

-- =============================================================================
-- 2. ADDITIVE EXTENSION (Core tables extended; extra tables added)
-- =============================================================================

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

alter table public.appointments
  add column if not exists stylist_id uuid null references public.stylists(id) on delete set null;

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
  -- A real (non-sample) testimonial cannot be active unless consent is true
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

-- Helpful indexes
create index if not exists idx_appointments_date_status on public.appointments(appointment_date, status);
create index if not exists idx_appointments_stylist_date on public.appointments(stylist_id, appointment_date);
create index if not exists idx_services_active_sort on public.services(is_active, category, sort_order);
create index if not exists idx_stylists_active_sort on public.stylists(is_active, sort_order);

-- =============================================================================
-- 3. SECURITY, SINGLE-ADMIN PROVISIONING & ROW LEVEL SECURITY (RLS)
--    Single Authorized Admin:
--      UID   : 94ea72fb-56f0-4b7c-9d5f-9a944ce358b0
--      Email : bboldmumbaisalon@gmail.com
--      Pass  : bbold@2026
-- =============================================================================

do $$
declare
  v_admin_uid constant uuid := '94ea72fb-56f0-4b7c-9d5f-9a944ce358b0'::uuid;
  v_admin_email constant text := 'bboldmumbaisalon@gmail.com';
  v_admin_pass constant text := 'bbold@2026';
  v_existing_uid uuid;
begin
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
             updated_at = now()
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

  delete from public.admin_users
   where user_id <> coalesce(v_existing_uid, v_admin_uid);

  insert into public.admin_users (user_id)
  select id from auth.users
   where id = v_admin_uid or lower(email) = v_admin_email
  on conflict (user_id) do nothing;
end
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    auth.uid() = '94ea72fb-56f0-4b7c-9d5f-9a944ce358b0'::uuid
    or (
      lower(coalesce(auth.jwt() ->> 'email', '')) = 'bboldmumbaisalon@gmail.com'
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
        and user_id = '94ea72fb-56f0-4b7c-9d5f-9a944ce358b0'::uuid
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

-- services: public SELECT where is_active; admin ALL
drop policy if exists "services_public_select" on public.services;
create policy "services_public_select" on public.services
  for select using (is_active = true or public.is_admin());

drop policy if exists "services_admin_all" on public.services;
create policy "services_admin_all" on public.services
  for all using (public.is_admin()) with check (public.is_admin());

-- stylists: public SELECT where is_active; admin ALL
drop policy if exists "stylists_public_select" on public.stylists;
create policy "stylists_public_select" on public.stylists
  for select using (is_active = true or public.is_admin());

drop policy if exists "stylists_admin_all" on public.stylists;
create policy "stylists_admin_all" on public.stylists
  for all using (public.is_admin()) with check (public.is_admin());

-- courses: public SELECT where is_active; admin ALL
drop policy if exists "courses_public_select" on public.courses;
create policy "courses_public_select" on public.courses
  for select using (is_active = true or public.is_admin());

drop policy if exists "courses_admin_all" on public.courses;
create policy "courses_admin_all" on public.courses
  for all using (public.is_admin()) with check (public.is_admin());

-- testimonials: public SELECT where is_active; admin ALL
drop policy if exists "testimonials_public_select" on public.testimonials;
create policy "testimonials_public_select" on public.testimonials
  for select using (is_active = true or public.is_admin());

drop policy if exists "testimonials_admin_all" on public.testimonials;
create policy "testimonials_admin_all" on public.testimonials
  for all using (public.is_admin()) with check (public.is_admin());

-- gallery_items: public SELECT where is_active; admin ALL
drop policy if exists "gallery_items_public_select" on public.gallery_items;
create policy "gallery_items_public_select" on public.gallery_items
  for select using (is_active = true or public.is_admin());

drop policy if exists "gallery_items_admin_all" on public.gallery_items;
create policy "gallery_items_admin_all" on public.gallery_items
  for all using (public.is_admin()) with check (public.is_admin());

-- faqs: public SELECT where is_active; admin ALL
drop policy if exists "faqs_public_select" on public.faqs;
create policy "faqs_public_select" on public.faqs
  for select using (is_active = true or public.is_admin());

drop policy if exists "faqs_admin_all" on public.faqs;
create policy "faqs_admin_all" on public.faqs
  for all using (public.is_admin()) with check (public.is_admin());

-- business_hours, blocked_dates, salon_settings, site_images, site_texts: public SELECT; admin write
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

-- appointments: NO public access; admin ALL
drop policy if exists "appointments_admin_all" on public.appointments;
create policy "appointments_admin_all" on public.appointments
  for all using (public.is_admin()) with check (public.is_admin());

-- academy_enquiries: public INSERT only (length-limited); admin ALL
drop policy if exists "academy_enquiries_public_insert" on public.academy_enquiries;
create policy "academy_enquiries_public_insert" on public.academy_enquiries
  for insert with check (
    char_length(trim(full_name)) between 2 and 80
    and phone ~ '^[6-9][0-9]{9}$'
    and char_length(trim(email)) between 5 and 120
    and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    and coalesce(char_length(message), 0) <= 1000
    and status = 'new'
  );

drop policy if exists "academy_enquiries_admin_all" on public.academy_enquiries;
create policy "academy_enquiries_admin_all" on public.academy_enquiries
  for all using (public.is_admin()) with check (public.is_admin());

-- admin_users: a user may select only their own row; no client writes
drop policy if exists "admin_users_select_own" on public.admin_users;
create policy "admin_users_select_own" on public.admin_users
  for select using (auth.uid() = user_id);

-- =============================================================================
-- 4. PUBLIC AVAILABILITY & BOOKING FUNCTIONS (SECURITY DEFINER)
-- =============================================================================

-- Availability without exposing personal client data
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

-- Public booking RPC with advisory lock, Asia/Kolkata enforcement & overlap check
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
  v_clean_phone text := regexp_replace(trim(coalesce(p_phone, '')), '\s+', '', 'g');
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
  -- 1. Serialize bookings on the target date
  perform pg_advisory_xact_lock(hashtext('bbold_appt_' || coalesce(p_date::text, 'none')));

  -- 2. Validate personal inputs
  if p_date is null or p_start is null or p_service_id is null then
    raise exception 'invalid_input';
  end if;

  if char_length(v_clean_name) < 2 or char_length(v_clean_name) > 80 then
    raise exception 'invalid_input';
  end if;

  if v_clean_phone !~ '^[6-9][0-9]{9}$' then
    raise exception 'invalid_input';
  end if;

  if char_length(v_clean_email) < 5 or char_length(v_clean_email) > 120 or v_clean_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_input';
  end if;

  if v_clean_notes is not null and char_length(v_clean_notes) > 500 then
    raise exception 'invalid_input';
  end if;

  -- 3. Load active service & compute end time (reject if passes midnight)
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

  -- 4. Load salon settings
  select slot_interval_minutes, booking_notice_hours
    into v_settings
    from public.salon_settings
   order by created_at asc
   limit 1;

  if found then
    v_interval_mins := coalesce(v_settings.slot_interval_minutes, 15);
    v_notice_hours := coalesce(v_settings.booking_notice_hours, 2);
  end if;

  -- 5. Check blocked dates
  if exists (select 1 from public.blocked_dates where blocked_date = p_date) then
    raise exception 'blocked';
  end if;

  -- 6. Check weekday open & inside business hours
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

  -- 7. Check slot alignment with slot_interval_minutes
  v_minutes_from_open := extract(epoch from (p_start - v_hours.start_time)) / 60.0;
  if v_minutes_from_open < 0 or mod(v_minutes_from_open, v_interval_mins) <> 0 then
    raise exception 'invalid_input';
  end if;

  -- 8. Check notice window & 60-day horizon in Asia/Kolkata
  v_now_ist := (now() at time zone 'Asia/Kolkata');
  v_today_ist := v_now_ist::date;
  v_slot_ts := p_date + p_start;

  if v_slot_ts < (v_now_ist + make_interval(hours => v_notice_hours)) then
    raise exception 'too_soon';
  end if;

  if p_date > (v_today_ist + 60) then
    raise exception 'invalid_input';
  end if;

  -- 9. Reject if the same phone has 3 or more future pending appointments
  select count(*)
    into v_pending_count
    from public.appointments
   where phone = v_clean_phone
     and status = 'pending'
     and (appointment_date + start_time) >= v_now_ist;

  if v_pending_count >= 3 then
    raise exception 'invalid_input';
  end if;

  -- 10. Overlap check & stylist assignment
  -- Overlap rule: new_start < existing_end AND new_end > existing_start
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
    -- Verify chosen stylist is active
    if not exists (select 1 from public.stylists where id = p_stylist_id and is_active = true) then
      raise exception 'invalid_input';
    end if;

    -- Check direct overlap for this stylist
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

    -- Also ensure unassigned overlapping bookings haven't exhausted all free active stylists
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
    -- "Any stylist" selected
    if v_active_stylist_count = 0 then
      -- With zero active stylists, total capacity is 1
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

      -- Assign the first active stylist (by sort_order) with no overlap
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

  -- 11. Insert appointment with status 'pending'
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
-- 5. STORAGE BUCKET "media" (Public read, Admin write)
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
