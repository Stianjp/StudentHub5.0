-- Use the latest Student Connect 2026 floorplan and replace CapaSystems with
-- Gründerskolen on Standard 21. CapaSystems is kept as a company record so
-- existing leads, consents and portal users are not deleted.

with campaign as (
  select id, event_id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
)
update public.event_registration_campaigns
set
  floorplan_image_path = '/StudentConnect-site/FloorPlan_New_3.png',
  updated_at = now()
where id = (select id from campaign);

with upsert_company as (
  insert into public.companies (
    name,
    org_number,
    industry,
    recruitment_fields,
    recruitment_levels,
    recruitment_job_types,
    recruitment_timing,
    branding_values,
    representation_text,
    created_at,
    updated_at
  )
  select
    'Gründerskolen',
    null,
    'Ledelse',
    array['Ledelse']::text[],
    array['Bachelor', 'Master']::text[],
    array['Fast jobb', 'Internship']::text[],
    '{}'::text[],
    '{}'::text[],
    'Gründerskolen møter studenter og unge profesjonelle på Student Connect 2026.',
    now(),
    now()
  where not exists (
    select 1
    from public.companies
    where lower(name) in ('gründerskolen', 'grunderskolen')
  )
  returning id
),
grunderskolen as (
  select id
  from upsert_company
  union all
  select id
  from public.companies
  where lower(name) in ('gründerskolen', 'grunderskolen')
  order by id
  limit 1
),
campaign as (
  select id, event_id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
),
capa_application as (
  select application.id, application.event_company_id
  from public.event_registration_applications application
  join campaign on campaign.id = application.campaign_id
  where application.company_name = 'CapaSystems A/S'
     or application.company_id = '2e451b1c-13eb-40c4-ad9e-16ed3fc2bc40'::uuid
  order by application.updated_at desc
  limit 1
),
standard_stand as (
  select stand.id
  from public.event_registration_stands stand
  join campaign on campaign.id = stand.campaign_id
  where stand.stand_code = 'Standard 21'
  limit 1
),
standard_package as (
  select package.id
  from public.event_registration_packages package
  join campaign on campaign.id = package.campaign_id
  where package.mapped_package = 'standard'
  order by package.sort_order asc
  limit 1
)
update public.event_registration_applications application
set
  company_id = (select id from grunderskolen),
  company_name = 'Gründerskolen',
  org_number = 'GRUNDERSKOLEN',
  logo_path = null,
  approved_package_id = (select id from standard_package),
  approved_stand_id = (select id from standard_stand),
  requested_package_id = coalesce(application.requested_package_id, (select id from standard_package)),
  requested_stand_id = coalesce(application.requested_stand_id, (select id from standard_stand)),
  updated_at = now()
from capa_application
where application.id = capa_application.id;

with grunderskolen as (
  select id
  from public.companies
  where lower(name) in ('gründerskolen', 'grunderskolen')
  order by id
  limit 1
),
campaign as (
  select id, event_id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
),
grunder_application as (
  select application.id, application.event_company_id
  from public.event_registration_applications application
  join campaign on campaign.id = application.campaign_id
  where application.company_name = 'Gründerskolen'
  order by application.updated_at desc
  limit 1
),
standard_stand as (
  select stand.id
  from public.event_registration_stands stand
  join campaign on campaign.id = stand.campaign_id
  where stand.stand_code = 'Standard 21'
  limit 1
)
update public.event_companies event_company
set
  company_id = (select id from grunderskolen),
  stand_type = 'Standard',
  package = 'standard',
  stand_code = 'Standard 21',
  updated_at = now()
from grunder_application
where event_company.id = grunder_application.event_company_id;

with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
),
grunder_application as (
  select application.id
  from public.event_registration_applications application
  join campaign on campaign.id = application.campaign_id
  where application.company_name = 'Gründerskolen'
  order by application.updated_at desc
  limit 1
)
update public.event_registration_stands stand
set
  assigned_application_id = (select id from grunder_application),
  status = 'assigned',
  updated_at = now()
where stand.campaign_id = (select id from campaign)
  and stand.stand_code = 'Standard 21';
