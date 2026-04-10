-- Demo company for company portal guides.
-- Creates an Oslo Student Hub company record for Student Connect 2026
-- with ROI and Leads access enabled.

insert into public.companies (
  name,
  org_number,
  size,
  location,
  address,
  postal_code,
  city,
  country,
  website,
  recruitment_fields,
  recruitment_levels,
  recruitment_years_bachelor,
  recruitment_years_master,
  recruitment_job_types,
  branding_values,
  branding_evp,
  branding_message,
  work_style,
  social_profile
)
select
  'Oslo Student Hub',
  '999999999',
  '10-50',
  'Oslo, Norway',
  'Pilestredet 1',
  '0164',
  'Oslo',
  'Norway',
  'https://www.oslostudenthub.no',
  array['Data/IT', 'Ledelse', 'Økonomi'],
  array['Bachelor', 'Master'],
  array[1, 2, 3],
  array[1, 2, 3, 4, 5],
  array['Fast jobb', 'Sommerjobb', 'Bacheloroppgave', 'Masteroppgave'],
  array['Studentfokus', 'Innovativt', 'Samarbeid'],
  'Demo-bedrift for guider og opplæring.',
  'Brukes til guider, skjermbilder og onboarding-testing i bedriftsportalen.',
  'Hybrid hverdag',
  'Høy sosial faktor'
where not exists (
  select 1
  from public.companies
  where lower(name) = lower('Oslo Student Hub')
    and org_number = '999999999'
);

update public.companies c
set
  size = '10-50',
  location = 'Oslo, Norway',
  address = 'Pilestredet 1',
  postal_code = '0164',
  city = 'Oslo',
  country = 'Norway',
  website = 'https://www.oslostudenthub.no',
  recruitment_fields = array['Data/IT', 'Ledelse', 'Økonomi'],
  recruitment_levels = array['Bachelor', 'Master'],
  recruitment_years_bachelor = array[1, 2, 3],
  recruitment_years_master = array[1, 2, 3, 4, 5],
  recruitment_job_types = array['Fast jobb', 'Sommerjobb', 'Bacheloroppgave', 'Masteroppgave'],
  branding_values = array['Studentfokus', 'Innovativt', 'Samarbeid'],
  branding_evp = 'Demo-bedrift for guider og opplæring.',
  branding_message = 'Brukes til guider, skjermbilder og onboarding-testing i bedriftsportalen.',
  work_style = 'Hybrid hverdag',
  social_profile = 'Høy sosial faktor',
  updated_at = now()
where lower(c.name) = lower('Oslo Student Hub')
  and c.org_number = '999999999';

insert into public.company_domains (company_id, domain)
select c.id, 'oslostudenthub.no'
from public.companies c
where lower(c.name) = lower('Oslo Student Hub')
  and c.org_number = '999999999'
on conflict (domain) do nothing;

insert into public.event_companies (
  event_id,
  company_id,
  stand_type,
  goals,
  kpis,
  package,
  can_view_roi,
  can_view_leads,
  access_from,
  access_until,
  registered_at
)
select
  te.id,
  dc.id,
  'Platinum',
  array['Bygge employer branding', 'Samle leads', 'Få innsikt i studieretninger'],
  array['Antall standbesøk', 'Antall leads', 'Topp studieretninger'],
  'platinum',
  true,
  true,
  now() - interval '30 days',
  now() + interval '2 years',
  now()
from public.events te
cross join public.companies dc
where te.slug = 'student-connect-2026'
  and lower(dc.name) = lower('Oslo Student Hub')
  and dc.org_number = '999999999'
on conflict (event_id, company_id) do update
set
  stand_type = excluded.stand_type,
  goals = excluded.goals,
  kpis = excluded.kpis,
  package = excluded.package,
  can_view_roi = true,
  can_view_leads = true,
  access_from = excluded.access_from,
  access_until = excluded.access_until,
  registered_at = coalesce(public.event_companies.registered_at, excluded.registered_at),
  updated_at = now();
