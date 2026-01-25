-- Seed data for OSH StudentHub MVP
-- NOTE: user_id is null in seeds. In development, update user_id to auth.users.id.

-- Events
insert into public.events (id, name, slug, description, location, starts_at, ends_at, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'Karrieredag Oslo 2026', 'karrieredag-oslo-2026', 'Hovedarrangement for studenter og bedrifter.', 'Oslo Kongressenter', '2026-02-12T09:00:00+01:00', '2026-02-12T16:00:00+01:00', true)
on conflict (id) do nothing;

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
    '11111111-1111-1111-1111-111111111111',
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
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'Standard',
    array['Rekruttering'],
    array['80 besøk', '15 leads'],
    'pro',
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
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '66666666-0000-0000-0000-000000000001', 'qr', '{"duration":"5m"}'),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '66666666-0000-0000-0000-000000000002', 'qr', '{"duration":"2m"}'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '66666666-0000-0000-0000-000000000004', 'qr', '{"duration":"7m"}'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '66666666-0000-0000-0000-000000000007', 'qr', '{"duration":"4m"}');

-- Consents
insert into public.consents (event_id, company_id, student_id, consent, scope)
values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '66666666-0000-0000-0000-000000000001', true, 'contact'),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '66666666-0000-0000-0000-000000000002', true, 'contact'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '66666666-0000-0000-0000-000000000004', true, 'contact')
on conflict (event_id, company_id, student_id) do nothing;

-- Survey responses
insert into public.survey_responses (event_id, company_id, student_id, answers)
values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '66666666-0000-0000-0000-000000000001', '{"motivation":"Frontend", "timing":"Sommer"}'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '66666666-0000-0000-0000-000000000004', '{"motivation":"Strategi", "timing":"Fulltid"}');
