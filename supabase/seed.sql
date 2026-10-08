-- SAMPLE DATA: replace or delete in the dashboard before launch
-- =============================================================================
-- Bbold Salon & Academy — Seed Data (all sample content marked is_sample = true)
-- Run after supabase/schema.sql in the Supabase SQL Editor.
-- =============================================================================

begin;

-- 1. Salon Settings (Static placeholders marked TODO until edited in Admin)
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
  'Bbold Salon & Academy',
  'TODO: confirm salon email in Admin > Salon settings',
  '8928837509',
  'TODO: confirm full studio address, Mumbai (edit in Admin > Salon settings)',
  15,
  2
)
on conflict (id) do update set
  salon_name = excluded.salon_name,
  slot_interval_minutes = excluded.slot_interval_minutes,
  booking_notice_hours = excluded.booking_notice_hours;

-- 2. Business Hours (0=Sunday ... 6=Saturday; Monday closed by default for testing)
insert into public.business_hours (weekday, is_open, start_time, end_time) values
  (0, true,  '10:00:00', '20:00:00'), -- Sunday
  (1, false, '10:00:00', '20:00:00'), -- Monday (Closed)
  (2, true,  '10:00:00', '20:00:00'), -- Tuesday
  (3, true,  '10:00:00', '20:00:00'), -- Wednesday
  (4, true,  '10:00:00', '20:00:00'), -- Thursday
  (5, true,  '10:00:00', '20:00:00'), -- Friday
  (6, true,  '10:00:00', '20:00:00')  -- Saturday
on conflict (weekday) do update set
  is_open = excluded.is_open,
  start_time = excluded.start_time,
  end_time = excluded.end_time;

-- 3. Default Site Texts
insert into public.site_texts (key, value) values
  (
    'hero',
    '{
      "line1": "Look like you",
      "line2": "meant it.",
      "accent": "meant it.",
      "subheadline": "Four dedicated stations for hair, makeup, nails, and skin—plus a hands-on training academy in Mumbai.",
      "primary_cta": "Reserve your appointment",
      "secondary_cta": "See services"
    }'::jsonb
  ),
  (
    'announcement',
    '{
      "enabled": true,
      "text": "Sample schedule active — reserve a chair online or message us on WhatsApp.",
      "link": "/book"
    }'::jsonb
  ),
  (
    'marquee',
    '{
      "phrases": [
        "Haircuts & Restyling",
        "Balayage & Global Colour",
        "Bridal & Event Makeup",
        "Gel Extensions & Nail Art",
        "Hydrating Facials & Skin Prep",
        "Men''s Grooming & Beard Shape",
        "Bbold Training Academy",
        "Book your visit"
      ]
    }'::jsonb
  ),
  (
    'footer',
    '{
      "final_line": "Make it bold, one station at a time. Bbold Salon & Academy · Mumbai."
    }'::jsonb
  )
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();

-- Clear existing sample rows before re-seeding
delete from public.services where is_sample = true and id not in (select distinct service_id from public.appointments);
delete from public.stylists where is_sample = true and id not in (select distinct stylist_id from public.appointments where stylist_id is not null);
delete from public.courses where is_sample = true;
delete from public.testimonials where is_sample = true;
delete from public.gallery_items where is_sample = true;
delete from public.faqs where is_sample = true;

-- 4. Services (55 sample rows across 9 categories)
insert into public.services (
  id, name, description, duration_minutes, price, category, audience, is_featured, sort_order, is_active, is_sample
) values
  -- Hair (1..7)
  ('10000000-0000-0000-0000-000000000001', 'Women''s Haircut', 'Includes a consultation, wash, section-by-section cut, and a blow-dry finish.', 60, 1200, 'Hair', 'women', true, 1, true, true),
  ('10000000-0000-0000-0000-000000000002', 'Kids'' Haircut', 'A gentle haircut and neat comb finish for children at a dedicated styling chair.', 30, 600, 'Hair', 'all', false, 2, true, true),
  ('10000000-0000-0000-0000-000000000003', 'Trim & Fringe', 'Maintenance trim for split ends or fringe reshaping to keep your current length tidy.', 30, 600, 'Hair', 'women', false, 3, true, true),
  ('10000000-0000-0000-0000-000000000004', 'Wash & Blow-dry', 'Shampoo, conditioning rinse, and a round-brush blow-dry tailored to your hair length.', 45, 700, 'Hair', 'women', false, 4, true, true),
  ('10000000-0000-0000-0000-000000000005', 'Blow-dry & Styling', 'Full wash and blow-dry followed by structured volume, waves, or sleek styling.', 60, 900, 'Hair', 'women', false, 5, true, true),
  ('10000000-0000-0000-0000-000000000006', 'Curls / Straightening Finish', 'Heat styling with tongs or flat irons on clean, dry hair for defined curls or straight lengths.', 60, 1100, 'Hair', 'women', false, 6, true, true),
  ('10000000-0000-0000-0000-000000000007', 'Party Hairstyle & Updo', 'Pinned updos, braided arrangements, or occasion hairstyling built to hold through events.', 60, 2000, 'Hair', 'women', false, 7, true, true),

  -- Men's Grooming (8..14)
  ('10000000-0000-0000-0000-000000000008', 'Men''s Haircut', 'Scissor and clipper haircut with neckline cleanup and a quick rinse.', 45, 600, 'Men''s Grooming', 'men', true, 8, true, true),
  ('10000000-0000-0000-0000-000000000009', 'Haircut & Styling', 'Precision cut, wash, and blow-dry styling suited to your daily routine.', 45, 800, 'Men''s Grooming', 'men', false, 9, true, true),
  ('10000000-0000-0000-0000-000000000010', 'Beard Trim & Shape', 'Beard length balancing, cheek and neckline edging, and towel finish.', 30, 400, 'Men''s Grooming', 'men', false, 10, true, true),
  ('10000000-0000-0000-0000-000000000011', 'Clean Shave', 'Warm towel prep, straight-razor shave, and soothing post-shave compress.', 30, 350, 'Men''s Grooming', 'men', false, 11, true, true),
  ('10000000-0000-0000-0000-000000000012', 'Haircut + Beard Combo', 'Full haircut paired with beard shaping and warm towel detailing in one sitting.', 60, 900, 'Men''s Grooming', 'men', false, 12, true, true),
  ('10000000-0000-0000-0000-000000000013', 'Head Massage', 'Seated scalp, neck, and shoulder massage with oil or dry pressure techniques.', 30, 500, 'Men''s Grooming', 'men', false, 13, true, true),
  ('10000000-0000-0000-0000-000000000014', 'Men''s Facial', 'Cleansing, exfoliation, steam, and mask session tailored for men''s skin.', 45, 1500, 'Men''s Grooming', 'men', false, 14, true, true),

  -- Hair Colour (15..20)
  ('10000000-0000-0000-0000-000000000015', 'Root Touch-up', 'Colour application focused on new root growth up to two centimetres, followed by a wash and dry.', 90, 2200, 'Hair Colour', 'women', false, 15, true, true),
  ('10000000-0000-0000-0000-000000000016', 'Global Colour', 'Single-shade colour applied from roots to ends with a post-colour wash and blow-dry.', 150, 4500, 'Hair Colour', 'all', true, 16, true, true),
  ('10000000-0000-0000-0000-000000000017', 'Highlights', 'Foil-placed lighter sections woven through the hair for tonal contrast and dimension.', 150, 5500, 'Hair Colour', 'all', false, 17, true, true),
  ('10000000-0000-0000-0000-000000000018', 'Balayage / Ombre', 'Freehand-painted colour transitions from softer roots to lighter mid-lengths and ends.', 210, 9500, 'Hair Colour', 'women', false, 18, true, true),
  ('10000000-0000-0000-0000-000000000019', 'Fashion Colour', 'Pre-lightening and vivid or pastel shade placement, including a consultation on upkeep.', 210, 8500, 'Hair Colour', 'all', false, 19, true, true),
  ('10000000-0000-0000-0000-000000000020', 'Men''s Colour', 'Full-head colour or grey blending for short hair, finished with a wash and style.', 75, 2200, 'Hair Colour', 'men', false, 20, true, true),

  -- Hair Treatments (21..25)
  ('10000000-0000-0000-0000-000000000021', 'Deep Conditioning Spa', 'Wash, conditioning mask application, gentle steam, scalp massage, and rinse.', 60, 1500, 'Hair Treatments', 'all', false, 21, true, true),
  ('10000000-0000-0000-0000-000000000022', 'Anti-dandruff Scalp Treatment', 'Targeted scalp exfoliation, wash, and soothing lotion application for flaky scalps.', 60, 1800, 'Hair Treatments', 'all', false, 22, true, true),
  ('10000000-0000-0000-0000-000000000023', 'Protein Treatment', 'Conditioning treatment designed for dry or heat-styled hair, followed by a gentle blow-dry.', 90, 3000, 'Hair Treatments', 'all', false, 23, true, true),
  ('10000000-0000-0000-0000-000000000024', 'Keratin Treatment', 'Multi-step smoothing treatment sealed with flat-iron passes to reduce daily frizz.', 180, 7000, 'Hair Treatments', 'all', true, 24, true, true),
  ('10000000-0000-0000-0000-000000000025', 'Smoothening', 'Chemical restructuring and heat-sealing process for sleeker, straighter hair texture.', 210, 6000, 'Hair Treatments', 'women', false, 25, true, true),

  -- Makeup (26..31)
  ('10000000-0000-0000-0000-000000000026', 'Party Makeup', 'Full-face occasion makeup including skin prep, base, eye detailing, and lip colour.', 90, 3500, 'Makeup', 'women', true, 26, true, true),
  ('10000000-0000-0000-0000-000000000027', 'Party Makeup & Hairstyle', 'Combined event makeup application and coordinated hairstyling in one appointment.', 120, 5000, 'Makeup', 'women', false, 27, true, true),
  ('10000000-0000-0000-0000-000000000028', 'Engagement Makeup', 'Detailed ceremony makeup with lash application and outfit-matched tones.', 120, 9000, 'Makeup', 'women', false, 28, true, true),
  ('10000000-0000-0000-0000-000000000029', 'Eye Makeup Only', 'Focused eye shadow, liner, brow shaping, and mascara or lash placement.', 45, 1500, 'Makeup', 'women', false, 29, true, true),
  ('10000000-0000-0000-0000-000000000030', 'Saree Draping', 'Pleating and secure pinning of your saree or dupatta in the style you choose.', 30, 800, 'Makeup', 'women', false, 30, true, true),
  ('10000000-0000-0000-0000-000000000031', 'Makeup Trial', 'Consultation and test makeup session to plan shades and finishes ahead of an event.', 60, 2000, 'Makeup', 'women', false, 31, true, true),

  -- Bridal (32..36)
  ('10000000-0000-0000-0000-000000000032', 'Bridal Makeup', 'Complete wedding-day makeup session including skin preparation, lashes, and dupatta setting.', 180, 20000, 'Bridal', 'women', true, 32, true, true),
  ('10000000-0000-0000-0000-000000000033', 'Bridal Trial', 'Hands-on trial session to test foundation shades, eye looks, and hair ideas before the wedding.', 120, 4500, 'Bridal', 'women', false, 33, true, true),
  ('10000000-0000-0000-0000-000000000034', 'Bridal Hairstyle', 'Structured bridal bun, braids, or waves with placement of floral or hair accessories.', 90, 5000, 'Bridal', 'women', false, 34, true, true),
  ('10000000-0000-0000-0000-000000000035', 'Pre-bridal Skin Prep', 'Scheduled facial cleansing, exfoliation, and mask session ahead of wedding functions.', 90, 6000, 'Bridal', 'women', false, 35, true, true),
  ('10000000-0000-0000-0000-000000000036', 'Groom Grooming Package', 'Haircut, beard styling, facial clean-up, and manicure prepared for wedding events.', 120, 6000, 'Bridal', 'men', false, 36, true, true),

  -- Nails (37..43)
  ('10000000-0000-0000-0000-000000000037', 'Classic Manicure', 'Nail shaping, cuticle care, hand soak, light massage, and regular polish application.', 45, 700, 'Nails', 'all', false, 37, true, true),
  ('10000000-0000-0000-0000-000000000038', 'Classic Pedicure', 'Warm foot soak, nail trimming, cuticle tidy, heel scrub, massage, and regular polish.', 60, 900, 'Nails', 'all', false, 38, true, true),
  ('10000000-0000-0000-0000-000000000039', 'Spa Pedicure', 'Extended pedicure with exfoliation scrub, hydrating foot mask, warm towel wrap, and polish.', 75, 1400, 'Nails', 'all', false, 39, true, true),
  ('10000000-0000-0000-0000-000000000040', 'Gel Polish', 'Nail prep, cuticle tidy, and lamp-cured gel colour application on natural nails.', 45, 1000, 'Nails', 'all', true, 40, true, true),
  ('10000000-0000-0000-0000-000000000041', 'Nail Art (per hand)', 'Custom hand-painted lines, French tips, chrome, or minimal decals across five nails.', 60, 1200, 'Nails', 'women', false, 41, true, true),
  ('10000000-0000-0000-0000-000000000042', 'Nail Extensions', 'Full-set nail length extensions shaped to your preference and finished with gel polish.', 120, 2800, 'Nails', 'women', false, 42, true, true),
  ('10000000-0000-0000-0000-000000000043', 'Nail Removal & Refresh', 'Safe soak-off or filing removal of existing gel or extensions followed by nail buffing and oil.', 30, 500, 'Nails', 'all', false, 43, true, true),

  -- Skin (44..48)
  ('10000000-0000-0000-0000-000000000044', 'Clean-up', 'Cleansing, mild scrub, steam, blackhead removal, and a calming face pack.', 45, 1000, 'Skin', 'all', false, 44, true, true),
  ('10000000-0000-0000-0000-000000000045', 'Hydrating Facial', 'Multi-step facial with cleansing, gentle massage, and a moisture-replenishing mask.', 60, 1800, 'Skin', 'all', true, 45, true, true),
  ('10000000-0000-0000-0000-000000000046', 'Deep Cleansing Facial', 'Pore-focused cleansing, steam extraction, facial massage, and balancing mask.', 60, 2200, 'Skin', 'all', false, 46, true, true),
  ('10000000-0000-0000-0000-000000000047', 'Brightening Facial', 'Exfoliation, facial massage, and mask treatment aimed at evening out surface dullness.', 60, 2500, 'Skin', 'all', false, 47, true, true),
  ('10000000-0000-0000-0000-000000000048', 'Face & Neck De-tan', 'Cleansing and de-tan pack applied across the face and neck, followed by a cool rinse.', 30, 800, 'Skin', 'all', false, 48, true, true),

  -- Waxing & Threading (49..55)
  ('10000000-0000-0000-0000-000000000049', 'Eyebrow Threading', 'Cotton-thread shaping of the eyebrows with a soothing post-thread gel.', 15, 80, 'Waxing & Threading', 'women', false, 49, true, true),
  ('10000000-0000-0000-0000-000000000050', 'Upper Lip Threading', 'Quick cotton-thread hair removal for the upper lip area.', 15, 50, 'Waxing & Threading', 'women', false, 50, true, true),
  ('10000000-0000-0000-0000-000000000051', 'Full Face Threading', 'Threading across the forehead, brows, upper lip, chin, and sideburns.', 30, 300, 'Waxing & Threading', 'women', false, 51, true, true),
  ('10000000-0000-0000-0000-000000000052', 'Underarm Wax', 'Warm wax hair removal for both underarms with pre-cleanse and after-lotion.', 15, 200, 'Waxing & Threading', 'women', false, 52, true, true),
  ('10000000-0000-0000-0000-000000000053', 'Full Arms Wax', 'Full-arm waxing from shoulders to wrists, including hands and fingers.', 30, 500, 'Waxing & Threading', 'women', false, 53, true, true),
  ('10000000-0000-0000-0000-000000000054', 'Full Legs Wax', 'Full-leg waxing from thighs to ankles with post-wax cleansing.', 45, 800, 'Waxing & Threading', 'women', false, 54, true, true),
  ('10000000-0000-0000-0000-000000000055', 'Full Body Wax', 'Full arms, full legs, underarms, back, and stomach waxing in a private treatment room.', 90, 2800, 'Waxing & Threading', 'women', false, 55, true, true)
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

-- 5. Stylists (7 sample rows; 40-60 word bios with NO years, awards, or claims)
insert into public.stylists (
  id, name, title, bio, photo_url, specialties, is_active, sort_order, is_sample
) values
  (
    '20000000-0000-0000-0000-000000000001',
    'Riya',
    'Creative Director & Senior Stylist',
    'Riya focuses on structured haircuts, wearable movement, and dimensional colour planning. Every appointment begins with a practical conversation about how you part, dry, and wear your hair on ordinary mornings so the cut holds its shape long after you leave the chair.',
    null,
    array['Hair', 'Hair Colour'],
    true,
    1,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'Imran',
    'Colour Specialist',
    'Imran handles balayage, foil highlights, global shade changes, and restorative hair treatments. He maps placement around natural hair fall and curl pattern, pairing every colour service with clear home-care guidance so tone and softness stay balanced between visits.',
    null,
    array['Hair Colour', 'Hair Treatments'],
    true,
    2,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'Sanya',
    'Lead Makeup Artist',
    'Sanya specialises in bridal, engagement, and occasion makeup that reads cleanly both in person and under camera lighting. She builds breathable base layers matched to undertone and coordinates eye, lip, and draping details around your outfit and schedule.',
    null,
    array['Makeup', 'Bridal'],
    true,
    3,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    'Natasha',
    'Nail Artist',
    'Natasha works at the nail bar on cuticle care, gel polish, extensions, and hand-painted nail art. Whether you prefer clean short neutrals or detailed graphic tips, she focuses on careful nail preparation and comfortable, balanced shaping.',
    null,
    array['Nails'],
    true,
    4,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    'Kiran',
    'Skin & Facial Therapist',
    'Kiran leads the quiet skin room, offering facials, clean-ups, de-tan sessions, threading, and waxing. She checks skin sensitivity before every step and keeps treatments unhurried, hygienic, and straightforward.',
    null,
    array['Skin', 'Waxing & Threading'],
    true,
    5,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000006',
    'Dev',
    'Men''s Grooming Specialist',
    'Dev specialises in scissor cuts, skin fades, beard geometry, and classic wet shaves. He pays close attention to crown growth direction and jawline balance so haircuts grow out cleanly between appointments.',
    null,
    array['Men''s Grooming', 'Hair'],
    true,
    6,
    true
  ),
  (
    '20000000-0000-0000-0000-000000000007',
    'Farah',
    'Academy Lead Trainer',
    'Farah coordinates classroom demonstrations and supervised floor practice at the Bbold Academy. She breaks complex cutting, colouring, and styling routines into repeatable steps for beginners and working stylists.',
    null,
    array['Academy'],
    true,
    7,
    true
  )
on conflict (id) do update set
  name = excluded.name,
  title = excluded.title,
  bio = excluded.bio,
  photo_url = excluded.photo_url,
  specialties = excluded.specialties,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  is_sample = excluded.is_sample;

-- 6. Courses (7 sample rows; 2-sentence description + 5-line syllabus marked TODO)
insert into public.courses (
  id, name, description, duration_text, fee, is_active, sort_order, is_sample
) values
  (
    '30000000-0000-0000-0000-000000000001',
    'Hair Styling Foundation',
    'A practical introduction to sectioning, scissor control, blow-drying, and core salon haircuts on mannequins and supervised live models. Designed for beginners entering salon work who want structured daily practice (TODO: confirm with the salon).' || E'\n' ||
    'Syllabus (TODO: confirm with the salon):' || E'\n' ||
    '1. Tool hygiene, posture, comb and scissor control' || E'\n' ||
    '2. Head anatomy, sectioning maps, and elevation angles' || E'\n' ||
    '3. One-length, graduated, and layered haircut structures' || E'\n' ||
    '4. Wash-house technique and round-brush blow-dry finishes' || E'\n' ||
    '5. Client consultation and supervised model floor sessions',
    '3 months',
    45000,
    true,
    1,
    true
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'Colour & Chemical Services',
    'Covers colour theory, shade numbering, foil placement, freehand painting, and smoothing or keratin workflows. Students practice formulation, strand testing, and timing discipline for salon colour menus (TODO: confirm with the salon).' || E'\n' ||
    'Syllabus (TODO: confirm with the salon):' || E'\n' ||
    '1. Natural pigment levels, undertones, and peroxide selection' || E'\n' ||
    '2. Root touch-ups, grey coverage, and global application' || E'\n' ||
    '3. Classic weaving, slicing, and foil highlight patterns' || E'\n' ||
    '4. Balayage blending, toning, and colour-safe aftercare' || E'\n' ||
    '5. Smoothing, keratin procedures, and strand safety checks',
    '2 months',
    40000,
    true,
    2,
    true
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    'Professional Makeup Artistry',
    'Hands-on training in skin preparation, undertone matching, corrective base work, and day-to-evening eye and lip techniques. Built for aspiring makeup artists working across salon and event briefs (TODO: confirm with the salon).' || E'\n' ||
    'Syllabus (TODO: confirm with the salon):' || E'\n' ||
    '1. Brush sanitation, kit setup, and skin-type assessment' || E'\n' ||
    '2. Undertone matching, colour correction, and foundation blending' || E'\n' ||
    '3. Contour, highlight, and blush placement for varied face shapes' || E'\n' ||
    '4. Classic, smokey, and shimmer eye makeup with lash application' || E'\n' ||
    '5. Longevity setting for humid weather and studio lighting',
    '2 months',
    55000,
    true,
    3,
    true
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    'Bridal Makeup Masterclass',
    'Focused intensive on multi-event Indian bridal looks, coordinated hairstyling, jewellery setting, and saree or dupatta draping. Ideal for artists expanding into wedding bookings and bridal trials (TODO: confirm with the salon).' || E'\n' ||
    'Syllabus (TODO: confirm with the salon):' || E'\n' ||
    '1. Bridal trial planning, lighting checks, and schedule management' || E'\n' ||
    '2. High-definition base layering for long ceremony hours' || E'\n' ||
    '3. Traditional and contemporary bridal eye and lip palettes' || E'\n' ||
    '4. Bridal buns, floral pinning, and hairpiece anchoring' || E'\n' ||
    '5. Regional saree pleating and dupatta pinning techniques',
    '3 weeks',
    35000,
    true,
    4,
    true
  ),
  (
    '30000000-0000-0000-0000-000000000005',
    'Nail Technician & Nail Art',
    'Teaches natural nail anatomy, manicure and pedicure hygiene, gel polish curing, tip extensions, and brush nail art. Students practice safe filing, shaping, and removal without damaging the nail plate (TODO: confirm with the salon).' || E'\n' ||
    'Syllabus (TODO: confirm with the salon):' || E'\n' ||
    '1. Nail anatomy, tool sterilisation, and cuticle preparation' || E'\n' ||
    '2. Filing shapes: square, squoval, almond, coffin, and oval' || E'\n' ||
    '3. Gel polish prep, apex building, and lamp curing protocols' || E'\n' ||
    '4. Nail extensions, infill maintenance, and safe soak-off removal' || E'\n' ||
    '5. French line work, chrome powders, dotting, and fine-brush art',
    '1 month',
    30000,
    true,
    5,
    true
  ),
  (
    '30000000-0000-0000-0000-000000000006',
    'Skin & Aesthetics Basics',
    'Covers facial room hygiene, skin analysis, cleansing and extraction steps, massage movements, and waxing or threading technique. Structured for therapists preparing for daily salon treatment rooms (TODO: confirm with the salon).' || E'\n' ||
    'Syllabus (TODO: confirm with the salon):' || E'\n' ||
    '1. Skin barrier basics, sensitivity screening, and room sanitation' || E'\n' ||
    '2. Cleansing, exfoliation, steam timing, and gentle extraction' || E'\n' ||
    '3. Effleurage, petrissage, and pressure-point facial massage' || E'\n' ||
    '4. Mask selection, de-tan packs, and post-facial soothing' || E'\n' ||
    '5. Cotton threading control and warm wax temperature safety',
    '2 months',
    38000,
    true,
    6,
    true
  ),
  (
    '30000000-0000-0000-0000-000000000007',
    'Salon Management Essentials',
    'Short practical course on appointment scheduling, front-desk communication, stock tracking, and station hygiene standards. Suited for salon coordinators, floor managers, and future studio owners (TODO: confirm with the salon).' || E'\n' ||
    'Syllabus (TODO: confirm with the salon):' || E'\n' ||
    '1. Appointment column planning, buffer times, and walk-in handling' || E'\n' ||
    '2. Client check-in, consultation handoff, and transparent billing' || E'\n' ||
    '3. Daily station checklists, towel laundry, and tool hygiene logs' || E'\n' ||
    '4. Backbar inventory tracking and supplier reorder sheets' || E'\n' ||
    '5. Team rosters, feedback handling, and service menu pricing',
    '2 weeks',
    15000,
    true,
    7,
    true
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  duration_text = excluded.duration_text,
  fee = excluded.fee,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  is_sample = excluded.is_sample;

-- 7. Testimonials (6 sample rows; short, service-specific, plainly worded)
insert into public.testimonials (
  id, name, quote, service_label, consent, is_active, is_sample
) values
  (
    '40000000-0000-0000-0000-000000000001',
    'Meera K.',
    'Booked a women''s haircut with Riya. She asked how much time I actually spend styling in the morning and cut layers that sit properly even when air-dried.',
    'Women''s Haircut',
    true,
    true,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'Rohan S.',
    'Came in for the haircut and beard combo before a family wedding. Clean fade, neat beard line, and the appointment started right on time.',
    'Haircut + Beard Combo',
    true,
    true,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    'Ananya D.',
    'Sanya did my engagement makeup and saree draping. The base felt light through four hours of photos and nothing budged in the Mumbai humidity.',
    'Engagement Makeup',
    true,
    true,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    'Priyanka M.',
    'Got gel polish and minimal French tips with Natasha. Very gentle cuticle prep and the shape across all ten nails was super consistent.',
    'Gel Polish',
    true,
    true,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000005',
    'Zoya A.',
    'Imran talked me through warm versus neutral tones before starting my highlights. The colour blended smoothly without any harsh root line.',
    'Highlights',
    true,
    true,
    true
  ),
  (
    '40000000-0000-0000-0000-000000000006',
    'Kavita P.',
    'Had a hydrating facial with Kiran on a quiet weekday afternoon. No rushed steps and my skin felt calm and comfortable afterwards.',
    'Hydrating Facial',
    true,
    true,
    true
  )
on conflict (id) do update set
  name = excluded.name,
  quote = excluded.quote,
  service_label = excluded.service_label,
  consent = excluded.consent,
  is_active = excluded.is_active,
  is_sample = excluded.is_sample;

-- 8. Gallery Items (18 sample rows; 3 each for Hair, Hair Colour, Makeup, Bridal, Nails, Skin; image_url null; 3 before/after items)
insert into public.gallery_items (
  id, image_url, before_image_url, caption, category, sort_order, is_active, is_sample
) values
  -- Hair (3; item 1 is before/after)
  ('50000000-0000-0000-0000-000000000001', null, ' ILLUSTRATION_BEFORE', 'Collarbone bob reshape and textured ends (Before / After sample)', 'Hair', 1, true, true),
  ('50000000-0000-0000-0000-000000000002', null, null, 'Long layered blow-dry with soft face-framing curtain fringe', 'Hair', 2, true, true),
  ('50000000-0000-0000-0000-000000000003', null, null, 'Low sculpted updo with clean parting for an evening reception', 'Hair', 3, true, true),

  -- Hair Colour (3; item 4 is before/after)
  ('50000000-0000-0000-0000-000000000004', null, 'ILLUSTRATION_BEFORE', 'Warm caramel balayage blended from natural dark roots (Before / After sample)', 'Hair Colour', 4, true, true),
  ('50000000-0000-0000-0000-000000000005', null, null, 'Fine foil highlights toned to espresso and toasted almond', 'Hair Colour', 5, true, true),
  ('50000000-0000-0000-0000-000000000006', null, null, 'Single-process rich burgundy global colour with gloss blow-dry', 'Hair Colour', 6, true, true),

  -- Makeup (3)
  ('50000000-0000-0000-0000-000000000007', null, null, 'Soft-matte evening makeup with winged liner and muted rose lip', 'Makeup', 7, true, true),
  ('50000000-0000-0000-0000-000000000008', null, null, 'Dewy engagement look with bronze lid wash and individual lashes', 'Makeup', 8, true, true),
  ('50000000-0000-0000-0000-000000000009', null, null, 'Classic kohl-rimmed eye makeup paired with sleek middle-parted hair', 'Makeup', 9, true, true),

  -- Bridal (3)
  ('50000000-0000-0000-0000-000000000010', null, null, 'Bridal trial look with traditional red lip and jasmine-pinned bun', 'Bridal', 10, true, true),
  ('50000000-0000-0000-0000-000000000011', null, null, 'Daytime wedding makeup in warm peach tones with veil draping', 'Bridal', 11, true, true),
  ('50000000-0000-0000-0000-000000000012', null, null, 'Bridal braided hairstyle with fresh floral work and maang tikka setting', 'Bridal', 12, true, true),

  -- Nails (3; item 13 is before/after)
  ('50000000-0000-0000-0000-000000000013', null, 'ILLUSTRATION_BEFORE', 'Almond gel extensions with micro-French crimson tips (Before / After sample)', 'Nails', 13, true, true),
  ('50000000-0000-0000-0000-000000000014', null, null, 'Short squoval manicure in sheer blush with marigold line accents', 'Nails', 14, true, true),
  ('50000000-0000-0000-0000-000000000015', null, null, 'Classic glossy crimson gel polish after cuticle tidy', 'Nails', 15, true, true),

  -- Skin (3)
  ('50000000-0000-0000-0000-000000000016', null, null, 'Skin station setup for a 60-minute hydrating facial session', 'Skin', 16, true, true),
  ('50000000-0000-0000-0000-000000000017', null, null, 'Fresh towel compress and botanical mask preparation', 'Skin', 17, true, true),
  ('50000000-0000-0000-0000-000000000018', null, null, 'Precision brow threading and soothing gel finish', 'Skin', 18, true, true)
on conflict (id) do update set
  image_url = excluded.image_url,
  before_image_url = excluded.before_image_url,
  caption = excluded.caption,
  category = excluded.category,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  is_sample = excluded.is_sample;

-- 9. FAQs (12 sample rows; marked confirm with the salon)
insert into public.faqs (
  id, question, answer, category, sort_order, is_active, is_sample
) values
  ('60000000-0000-0000-0000-000000000001', 'Do I need to book an appointment in advance, or do you take walk-ins?', 'We recommend reserving your slot online so your preferred time and stylist are held for you. Walk-ins are welcome whenever a chair is free (TODO: confirm with the salon).', 'Booking', 1, true, true),
  ('60000000-0000-0000-0000-000000000002', 'Is my online booking confirmed immediately?', 'When you submit a booking request, we hold the slot as pending and our front desk confirms it shortly via call or WhatsApp (TODO: confirm with the salon).', 'Booking', 2, true, true),
  ('60000000-0000-0000-0000-000000000003', 'How can I reschedule or cancel my appointment?', 'Please message us on WhatsApp or call the salon at least a few hours before your scheduled time so we can release the chair for another client (TODO: confirm with the salon).', 'Booking', 3, true, true),
  ('60000000-0000-0000-0000-000000000004', 'Do you offer services for both women and men?', 'Yes. Our menu covers haircuts, colour, treatments, skin care, and nails for women and men, plus a dedicated men''s grooming section (TODO: confirm with the salon).', 'Services', 4, true, true),
  ('60000000-0000-0000-0000-000000000005', 'Are the prices listed on the website final?', 'Listed prices are base estimates for standard hair length and thickness. For colour, smoothing, or nail art, your stylist will confirm the exact price before starting (TODO: confirm with the salon).', 'Services', 5, true, true),
  ('60000000-0000-0000-0000-000000000006', 'Should I wash my hair before coming in for a haircut or colour?', 'Most haircuts and treatments include a wash at the salon. If you are coming in for global colour, highlights, or updo styling, clean dry hair from the previous day works well (TODO: confirm with the salon).', 'Services', 6, true, true),
  ('60000000-0000-0000-0000-000000000007', 'How early should I book bridal makeup or a bridal trial?', 'We suggest booking a bridal trial 3 to 6 weeks before your wedding dates so we can lock in your schedule, look details, and pre-bridal skin prep (TODO: confirm with the salon).', 'Bridal', 7, true, true),
  ('60000000-0000-0000-0000-000000000008', 'Do your makeup artists travel to wedding venues in Mumbai?', 'Bridal sessions can be arranged at the studio or at your venue depending on date availability and travel logistics—message us on WhatsApp with your date and area (TODO: confirm with the salon).', 'Bridal', 8, true, true),
  ('60000000-0000-0000-0000-000000000009', 'Who can join the courses at Bbold Academy?', 'Our foundation courses are open to beginners with no prior salon background, while masterclasses suit working stylists and makeup artists (TODO: confirm with the salon).', 'Academy', 9, true, true),
  ('60000000-0000-0000-0000-000000000010', 'Are practice tools and products provided during academy classes?', 'Classroom demonstration kits and practice requirements vary by course—submit an academy enquiry or visit the studio to review the kit checklist and batch timings (TODO: confirm with the salon).', 'Academy', 10, true, true),
  ('60000000-0000-0000-0000-000000000011', 'What payment methods do you accept at the salon?', 'We accept UPI, major credit and debit cards, and cash at the front desk (TODO: confirm with the salon).', 'General', 11, true, true),
  ('60000000-0000-0000-0000-000000000012', 'Is parking available near the salon?', 'Please check the Contact page or message us on WhatsApp for landmark and street parking guidance near our Mumbai studio (TODO: confirm with the salon).', 'General', 12, true, true)
on conflict (id) do update set
  question = excluded.question,
  answer = excluded.answer,
  category = excluded.category,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  is_sample = excluded.is_sample;

commit;
