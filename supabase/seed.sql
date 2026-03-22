-- Seed data for OSH StudentHub MVP
-- NOTE: user_id is null in seeds. In development, update user_id to auth.users.id.

-- Events
insert into public.events (id, name, slug, description, location, starts_at, ends_at, is_active)
values
  ('3f1d6b8e-7a43-4f0a-9a8c-3b6b3d6c7f1e', 'Student Connect 2026', 'student-connect-2026', 'Hovedarrangement for studenter og bedrifter.', 'Oslo Kongressenter', '2026-02-12T09:00:00+01:00', '2026-02-12T16:00:00+01:00', true)
on conflict (id) do nothing;

update public.events
set registration_form_url = 'https://eventregister.oslostudenthub.no/student-connect-2026'
where id = '3f1d6b8e-7a43-4f0a-9a8c-3b6b3d6c7f1e';

insert into public.event_registration_campaigns (
  id,
  event_id,
  slug,
  public_title,
  public_subtitle,
  public_description,
  floorplan_image_path,
  is_published,
  opens_at,
  closes_at
)
values
  (
    '77777777-1111-1111-1111-111111111111',
    '3f1d6b8e-7a43-4f0a-9a8c-3b6b3d6c7f1e',
    'student-connect-2026',
    'Registration for Student Hub 2026',
    'Register your company for the fair and request portal access for your team.',
    'Complete the registration to request a stand, package and company portal access. OSH will review and approve the application before access is granted.',
    '/event-register/student-connect-2026-floorplan.png',
    true,
    '2025-09-01T00:00:00+02:00',
    '2026-02-10T23:59:59+01:00'
  )
on conflict (id) do update
set
  public_title = excluded.public_title,
  public_subtitle = excluded.public_subtitle,
  public_description = excluded.public_description,
  floorplan_image_path = excluded.floorplan_image_path,
  is_published = excluded.is_published,
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  updated_at = now();

insert into public.event_registration_packages (
  id,
  campaign_id,
  package_key,
  public_name,
  description,
  mapped_package,
  internal_capacity,
  is_active,
  sort_order
)
values
  (
    '77777777-2222-2222-2222-111111111111',
    '77777777-1111-1111-1111-111111111111',
    'platinum',
    'Platinum',
    'Top-tier placement with maximum visibility.',
    'platinum',
    4,
    true,
    10
  ),
  (
    '77777777-2222-2222-2222-222222222222',
    '77777777-1111-1111-1111-111111111111',
    'gold_career_night',
    'Gold with career night',
    'Gold package with career night add-on.',
    'gold',
    7,
    true,
    20
  ),
  (
    '77777777-2222-2222-2222-333333333333',
    '77777777-1111-1111-1111-111111111111',
    'gold',
    'Gold',
    'Large stand placement with strong event visibility.',
    'gold',
    20,
    true,
    30
  ),
  (
    '77777777-2222-2222-2222-444444444444',
    '77777777-1111-1111-1111-111111111111',
    'silver',
    'Silver',
    'Solid placement and access to the fair.',
    'silver',
    30,
    true,
    40
  ),
  (
    '77777777-2222-2222-2222-555555555555',
    '77777777-1111-1111-1111-111111111111',
    'contact_me',
    'I dont know, contact me!',
    'OSH will follow up and help you choose the right package.',
    null,
    null,
    true,
    50
  )
on conflict (id) do update
set
  public_name = excluded.public_name,
  description = excluded.description,
  mapped_package = excluded.mapped_package,
  internal_capacity = excluded.internal_capacity,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.event_registration_stands (
  campaign_id,
  stand_code,
  display_label,
  package_tier,
  x,
  y,
  width,
  height,
  sort_order,
  status
)
values
  ('77777777-1111-1111-1111-111111111111', 'Platinum 1', 'Platinum 1', 'platinum', 22.0, 46.0, 9.5, 4.4, 10, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Platinum 2', 'Platinum 2', 'platinum', 33.0, 46.0, 9.5, 4.4, 20, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Platinum 3', 'Platinum 3', 'platinum', 44.0, 46.0, 9.5, 4.4, 30, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Platinum 4', 'Platinum 4', 'platinum', 55.0, 46.0, 9.5, 4.4, 40, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Gold 5', 'Gold 5', 'gold', 16.0, 54.0, 8.0, 4.8, 50, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Gold 6', 'Gold 6', 'gold', 25.0, 54.0, 8.0, 4.8, 60, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Gold 7', 'Gold 7', 'gold', 41.0, 54.0, 8.0, 4.8, 70, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Gold 8', 'Gold 8', 'gold', 50.0, 54.0, 8.0, 4.8, 80, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 1', 'Silver 1', 'silver', 5.0, 50.0, 6.5, 4.0, 90, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 2', 'Silver 2', 'silver', 5.0, 55.0, 6.5, 4.0, 100, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 3', 'Silver 3', 'silver', 5.0, 60.0, 6.5, 4.0, 110, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 4', 'Silver 4', 'silver', 5.0, 65.0, 6.5, 4.0, 120, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 5', 'Silver 5', 'silver', 5.0, 70.0, 6.5, 4.0, 130, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 6', 'Silver 6', 'silver', 16.5, 60.0, 6.0, 4.0, 140, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 7', 'Silver 7', 'silver', 25.0, 60.0, 6.0, 4.0, 150, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 8', 'Silver 8', 'silver', 16.5, 65.0, 6.0, 4.0, 160, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 9', 'Silver 9', 'silver', 25.0, 65.0, 6.0, 4.0, 170, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 10', 'Silver 10', 'silver', 41.0, 61.0, 6.0, 4.0, 180, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 11', 'Silver 11', 'silver', 41.0, 66.0, 6.0, 4.0, 190, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 12', 'Silver 12', 'silver', 49.0, 61.0, 6.0, 4.0, 200, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 13', 'Silver 13', 'silver', 49.0, 66.0, 6.0, 4.0, 210, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 14', 'Silver 14', 'silver', 66.0, 50.0, 6.0, 4.2, 220, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 15', 'Silver 15', 'silver', 66.0, 55.0, 6.0, 4.2, 230, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 16', 'Silver 16', 'silver', 66.0, 60.0, 6.0, 4.2, 240, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 17', 'Silver 17', 'silver', 66.0, 65.0, 6.0, 4.2, 250, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Gold 1', 'Gold 1', 'gold', 8.0, 73.5, 11.0, 4.8, 260, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Gold 2', 'Gold 2', 'gold', 24.0, 73.5, 11.0, 4.8, 270, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Gold 3', 'Gold 3', 'gold', 40.0, 73.5, 11.0, 4.8, 280, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Gold 4', 'Gold 4', 'gold', 56.0, 73.5, 11.0, 4.8, 290, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 18', 'Silver 18', 'silver', 46.0, 82.0, 6.0, 3.5, 300, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 19', 'Silver 19', 'silver', 54.0, 82.0, 6.0, 3.5, 310, 'available'),
  ('77777777-1111-1111-1111-111111111111', 'Silver 20', 'Silver 20', 'silver', 66.0, 82.0, 6.0, 3.5, 320, 'available')
on conflict (campaign_id, stand_code) do update
set
  display_label = excluded.display_label,
  package_tier = excluded.package_tier,
  x = excluded.x,
  y = excluded.y,
  width = excluded.width,
  height = excluded.height,
  sort_order = excluded.sort_order,
  status = excluded.status,
  updated_at = now();

-- Companies
insert into public.companies (id, name, industry, size, location, website, recruitment_roles, recruitment_fields, recruitment_levels, recruitment_job_types, recruitment_timing, branding_values, branding_evp, branding_message)
values
  (
    '22222222-2222-2222-2222-222222222222',
    'Nordic Systems',
    'Teknologi',
    '200-500',
    'Oslo',
    'https://nordicsystems.example.com',
    array['Frontendutvikler', 'Backendutvikler'],
    array['Informatikk', 'Data science'],
    array['Bachelor', 'Master'],
    array['Sommerjobb', 'Fulltid'],
    array['Sommer 2026'],
    array['Autonomi', 'Læring', 'Bærekraft'],
    'Bygg teknologi som påvirker hverdagen.',
    'Vi ansetter studenter som vil bygge produkter fra idé til drift.'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Fjord Consulting',
    'Rådgivning',
    '50-200',
    'Bergen',
    'https://fjordconsulting.example.com',
    array['Analytiker', 'Konsulent'],
    array['Økonomi', 'Industriell økonomi', 'Data science'],
    array['Bachelor', 'Master'],
    array['Internship', 'Fulltid', 'Deltid'],
    array['Høst 2026'],
    array['Kundeimpact', 'Teamwork', 'Nysgjerrighet'],
    'Lær raskt i ekte kundeprosjekter.',
    'Hos oss får du ansvar tidlig og jobber tett med erfarne rådgivere.'
  )
on conflict (id) do nothing;

-- Event companies
insert into public.event_companies (id, event_id, company_id, stand_type, goals, kpis, package, access_from, access_until, registered_at)
values
  (
    '44444444-4444-4444-4444-444444444444',
    '3f1d6b8e-7a43-4f0a-9a8c-3b6b3d6c7f1e',
    '22222222-2222-2222-2222-222222222222',
    'Premium',
    array['Bygge pipeline', 'Synlighet'],
    array['150 besøk', '40 leads'],
    'platinum',
    '2026-02-10T00:00:00+01:00',
    '2026-03-01T00:00:00+01:00',
    now()
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '3f1d6b8e-7a43-4f0a-9a8c-3b6b3d6c7f1e',
    '33333333-3333-3333-3333-333333333333',
    'Standard',
    array['Rekruttering'],
    array['80 besøk', '15 leads'],
    'silver',
    null,
    null,
    now()
  )
on conflict (event_id, company_id) do nothing;

-- Students (10)
insert into public.students (id, full_name, email, study_program, study_level, graduation_year, job_types, interests, values, preferred_locations, willing_to_relocate, liked_company_ids)
values
  ('66666666-0000-0000-0000-000000000001', 'Sara Nguyen', 'sara1@example.com', 'Informatikk', 'Bachelor', 2027, array['Sommerjobb'], array['Informatikk', 'Frontend'], array['Læring', 'Autonomi'], array['Oslo'], false, array['22222222-2222-2222-2222-222222222222']::uuid[]),
  ('66666666-0000-0000-0000-000000000002', 'Jonas Berg', 'jonas2@example.com', 'Data science', 'Master', 2026, array['Fulltid'], array['Data science', 'Analyse'], array['Bærekraft'], array['Oslo', 'Trondheim'], true, array['22222222-2222-2222-2222-222222222222']::uuid[]),
  ('66666666-0000-0000-0000-000000000003', 'Maja Olsen', 'maja3@example.com', 'Økonomi', 'Bachelor', 2028, array['Deltid'], array['Økonomi', 'Analyse'], array['Teamwork'], array['Bergen'], false, array['33333333-3333-3333-3333-333333333333']::uuid[]),
  ('66666666-0000-0000-0000-000000000004', 'Filip Larsen', 'filip4@example.com', 'Industriell økonomi', 'Master', 2026, array['Internship', 'Fulltid'], array['Industriell økonomi', 'Strategi'], array['Kundeimpact'], array['Oslo'], true, array['33333333-3333-3333-3333-333333333333']::uuid[]),
  ('66666666-0000-0000-0000-000000000005', 'Emma Sørensen', 'emma5@example.com', 'Informatikk', 'Bachelor', 2027, array['Sommerjobb', 'Internship'], array['Backend', 'Informatikk'], array['Autonomi'], array['Oslo'], false, array['22222222-2222-2222-2222-222222222222']::uuid[]),
  ('66666666-0000-0000-0000-000000000006', 'Noah Hansen', 'noah6@example.com', 'Data science', 'Bachelor', 2028, array['Sommerjobb'], array['Data science'], array['Bærekraft', 'Teamwork'], array['Trondheim'], true, array['22222222-2222-2222-2222-222222222222']::uuid[]),
  ('66666666-0000-0000-0000-000000000007', 'Ingrid Johansen', 'ingrid7@example.com', 'Økonomi', 'Master', 2026, array['Fulltid'], array['Økonomi', 'Konsulent'], array['Kundeimpact'], array['Bergen', 'Oslo'], true, array['33333333-3333-3333-3333-333333333333']::uuid[]),
  ('66666666-0000-0000-0000-000000000008', 'Ali Reza', 'ali8@example.com', 'Informatikk', 'Master', 2026, array['Fulltid'], array['Informatikk', 'Backend'], array['Læring'], array['Oslo'], false, array['22222222-2222-2222-2222-222222222222']::uuid[]),
  ('66666666-0000-0000-0000-000000000009', 'Sofie Dahl', 'sofie9@example.com', 'Industriell økonomi', 'Bachelor', 2027, array['Internship'], array['Strategi', 'Analyse'], array['Teamwork', 'Nysgjerrighet'], array['Oslo'], true, array['33333333-3333-3333-3333-333333333333']::uuid[]),
  ('66666666-0000-0000-0000-000000000010', 'Kristian Moe', 'kristian10@example.com', 'Data science', 'Master', 2026, array['Fulltid'], array['Data science', 'Maskinlæring'], array['Autonomi', 'Bærekraft'], array['Oslo'], true, array['22222222-2222-2222-2222-222222222222']::uuid[])
on conflict (id) do nothing;

-- Visits
insert into public.stand_visits (event_id, company_id, student_id, source, metadata)
values
  ('3f1d6b8e-7a43-4f0a-9a8c-3b6b3d6c7f1e', '22222222-2222-2222-2222-222222222222', '66666666-0000-0000-0000-000000000001', 'qr', '{"duration":"5m"}'),
  ('3f1d6b8e-7a43-4f0a-9a8c-3b6b3d6c7f1e', '22222222-2222-2222-2222-222222222222', '66666666-0000-0000-0000-000000000002', 'qr', '{"duration":"2m"}'),
  ('3f1d6b8e-7a43-4f0a-9a8c-3b6b3d6c7f1e', '33333333-3333-3333-3333-333333333333', '66666666-0000-0000-0000-000000000004', 'qr', '{"duration":"7m"}'),
  ('3f1d6b8e-7a43-4f0a-9a8c-3b6b3d6c7f1e', '33333333-3333-3333-3333-333333333333', '66666666-0000-0000-0000-000000000007', 'qr', '{"duration":"4m"}');

-- Consents
insert into public.consents (event_id, company_id, student_id, consent, scope)
values
  ('3f1d6b8e-7a43-4f0a-9a8c-3b6b3d6c7f1e', '22222222-2222-2222-2222-222222222222', '66666666-0000-0000-0000-000000000001', true, 'contact'),
  ('3f1d6b8e-7a43-4f0a-9a8c-3b6b3d6c7f1e', '22222222-2222-2222-2222-222222222222', '66666666-0000-0000-0000-000000000002', true, 'contact'),
  ('3f1d6b8e-7a43-4f0a-9a8c-3b6b3d6c7f1e', '33333333-3333-3333-3333-333333333333', '66666666-0000-0000-0000-000000000004', true, 'contact')
on conflict (student_id, company_id) do nothing;

-- Leads
insert into public.leads (event_id, company_id, student_id, interests, job_types, study_level, study_year, field_of_study, source)
values
  ('3f1d6b8e-7a43-4f0a-9a8c-3b6b3d6c7f1e', '22222222-2222-2222-2222-222222222222', '66666666-0000-0000-0000-000000000001', array['Frontend'], array['Sommerjobb'], 'Bachelor', 2027, 'Informatikk', 'stand'),
  (null, '33333333-3333-3333-3333-333333333333', '66666666-0000-0000-0000-000000000004', array['Strategi'], array['Fulltid'], 'Master', 2026, 'Industriell økonomi', 'student_portal')
on conflict do nothing;

-- Survey responses
insert into public.survey_responses (event_id, company_id, student_id, answers)
values
  ('3f1d6b8e-7a43-4f0a-9a8c-3b6b3d6c7f1e', '22222222-2222-2222-2222-222222222222', '66666666-0000-0000-0000-000000000001', '{"motivation":"Frontend", "timing":"Sommer"}'),
  ('3f1d6b8e-7a43-4f0a-9a8c-3b6b3d6c7f1e', '33333333-3333-3333-3333-333333333333', '66666666-0000-0000-0000-000000000004', '{"motivation":"Strategi", "timing":"Fulltid"}');
