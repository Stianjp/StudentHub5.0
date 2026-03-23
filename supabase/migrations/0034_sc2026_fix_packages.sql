-- Replace Student Connect 2026 packages with: Platinum, Gold, Silver, Standard

with campaign as (
  select id from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
)
delete from public.event_registration_packages
where campaign_id = (select id from campaign);

with campaign as (
  select id from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
)
insert into public.event_registration_packages (
  campaign_id, package_key, public_name, description,
  mapped_package, internal_capacity, is_active, sort_order
)
select
  campaign.id,
  p.package_key,
  p.public_name,
  p.description,
  p.mapped_package,
  p.internal_capacity,
  true,
  p.sort_order
from campaign
cross join (
  values
    ('platinum', 'Platinum',  'Top-tier placement with maximum visibility.',            'platinum'::public.package_tier,  4,    10),
    ('gold',     'Gold',      'Large stand placement with strong event visibility.',     'gold'::public.package_tier,      20,   20),
    ('silver',   'Silver',    'Solid placement and access to the fair.',                 'silver'::public.package_tier,    30,   30),
    ('standard', 'Standard',  'Standard package for participating companies.',           'standard'::public.package_tier,  null, 40)
) as p(package_key, public_name, description, mapped_package, internal_capacity, sort_order);
