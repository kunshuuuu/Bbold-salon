# Bbold Salon & Academy — Website, Booking Engine & Admin Dashboard

Multipage website, real-time chair availability & booking system, and admin dashboard for **Bbold Salon & Academy** (Mumbai).

## Stack
- **Frontend**: React 19, TypeScript, Vite, React Router, Tailwind CSS
- **Motion & Scroll**: Framer Motion, GSAP ScrollTrigger, Lenis
- **Backend / Database**: Supabase (PostgreSQL, Row Level Security, Auth, Storage, RPC Functions)
- **Date / Time**: `date-fns` (all salon scheduling calculated in `Asia/Kolkata`)

---

## 1. Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-public-key"
VITE_SHOW_SAMPLE_CONTENT="true"
```

- Never put a `service_role` key in client code or `.env`.
- Keep `VITE_SHOW_SAMPLE_CONTENT="true"` while reviewing design and sample services/stylists/courses.
- Set `VITE_SHOW_SAMPLE_CONTENT="false"` in production (or click **Remove all sample content** in the Admin Overview page).

---

## 2. Database & Storage Setup (Supabase SQL Editor)

Run these two SQL scripts in order inside the **Supabase SQL Editor**:

1. **`supabase/schema.sql`**:
   - Creates the core schema (`services`, `appointments`, `business_hours`, `blocked_dates`, `salon_settings`, `admin_users`).
   - Applies the additive extension (`stylists`, `courses`, `academy_enquiries`, `testimonials`, `gallery_items`, `site_images`, `faqs`, `site_texts`, and additional columns on `services` and `appointments`).
   - Enables Row Level Security (RLS) on every table.
   - Creates `public.is_admin()`, `public.get_busy_slots(p_date)`, and the transactional booking function `public.create_appointment(...)` with `pg_advisory_xact_lock`.
   - Creates the public-read / admin-write `"media"` Storage bucket.
2. **`supabase/seed.sql`**:
   - Inserts sample services (55 across 9 categories), 7 stylists, 7 academy courses, 6 testimonials, 18 gallery items, 12 FAQs, default business hours, salon settings, and homepage text (`is_sample = true`).

---

## 3. Creating the Owner Admin Account (Mandatory)

Admin access is verified strictly by checking `admin_users.user_id = auth.uid()` (never by email or client-side flags).

1. In your Supabase dashboard, go to **Authentication → Providers → Email** (or User Signups settings) and **turn OFF "Allow new users to sign up"** so the public cannot create auth accounts.
2. Go to **Authentication → Users** and click **Add user → Create new user** with the salon owner's email and strong password (check **Auto Confirm User**).
3. Copy the newly created user's **User UID** and run this in the **SQL Editor**:

```sql
insert into public.admin_users (user_id)
values ('<paste-owner-user-uuid-here>');
```

4. Sign in at `/admin/login`.
