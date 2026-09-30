-- Align live Student Connect 2026 data with Floorplan_new.png.
-- The new floorplan removes the standard stands in the far-right room and converts the old
-- Silver 18-20 positions into Standard 21-23.

with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
)
update public.event_registration_campaigns
set
  floorplan_image_path = '/StudentConnect-site/Floorplan_new.png',
  updated_at = now()
where id = (select id from campaign);

with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
)
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
select
  campaign.id,
  stand.stand_code,
  stand.display_label,
  stand.package_tier::public.package_tier,
  stand.x,
  stand.y,
  stand.width,
  stand.height,
  stand.sort_order,
  'available'
from campaign
cross join (
  values
    ('Standard 21', 'Standard 21', 'standard', 41.21, 68.06, 5.61, 3.00, 210),
    ('Standard 22', 'Standard 22', 'standard', 47.35, 68.06, 5.72, 3.00, 220),
    ('Standard 23', 'Standard 23', 'standard', 59.00, 68.11, 5.61, 3.00, 230)
) as stand(stand_code, display_label, package_tier, x, y, width, height, sort_order)
on conflict (campaign_id, stand_code) do update
set
  display_label = excluded.display_label,
  package_tier = excluded.package_tier,
  x = excluded.x,
  y = excluded.y,
  width = excluded.width,
  height = excluded.height,
  sort_order = excluded.sort_order,
  status = case
    when public.event_registration_stands.assigned_application_id is null then excluded.status
    else public.event_registration_stands.status
  end,
  updated_at = now();

with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
)
update public.event_registration_stands
set
  status = 'disabled',
  assigned_application_id = null,
  updated_at = now()
where campaign_id = (select id from campaign)
  and stand_code in (
    'Standard 1',
    'Standard 2',
    'Standard 3',
    'Standard 4',
    'Standard 5',
    'Standard 6',
    'Standard 7',
    'Standard 8',
    'Standard 9',
    'Standard 10',
    'Standard 11',
    'Standard 12',
    'Standard 13',
    'Silver 18',
    'Silver 19',
    'Silver 20'
  );

with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
),
package_moves as (
  select *
  from (
    values
      ('Forsvaret', 'silver', 'Silver 3', 'Silver'),
      ('ABB', 'gold', 'Gold 2', 'Gold'),
      ('CapaSystems A/S', 'standard', 'Standard 21', 'Standard'),
      ('Hult Business School', 'standard', 'Standard 22', 'Standard'),
      ('Circle Consult', 'standard', 'Standard 23', 'Standard')
  ) as move(company_name, package_tier, stand_code, stand_type)
),
resolved as (
  select
    application.id as application_id,
    application.event_company_id,
    pkg.id as package_id,
    stand.id as stand_id,
    move.package_tier,
    move.stand_type,
    move.stand_code
  from campaign
  join package_moves move on true
  join public.event_registration_applications application
    on application.campaign_id = campaign.id
   and application.company_name = move.company_name
  join public.event_registration_packages pkg
    on pkg.campaign_id = campaign.id
   and pkg.mapped_package = move.package_tier::public.package_tier
  join public.event_registration_stands stand
    on stand.campaign_id = campaign.id
   and stand.stand_code = move.stand_code
)
update public.event_registration_stands stand
set
  status = 'available',
  assigned_application_id = null,
  updated_at = now()
from resolved
where stand.campaign_id = (select id from campaign)
  and stand.assigned_application_id = resolved.application_id
  and stand.id <> resolved.stand_id;

with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
),
package_moves as (
  select *
  from (
    values
      ('Forsvaret', 'silver', 'Silver 3', 'Silver'),
      ('ABB', 'gold', 'Gold 2', 'Gold'),
      ('CapaSystems A/S', 'standard', 'Standard 21', 'Standard'),
      ('Hult Business School', 'standard', 'Standard 22', 'Standard'),
      ('Circle Consult', 'standard', 'Standard 23', 'Standard')
  ) as move(company_name, package_tier, stand_code, stand_type)
),
resolved as (
  select
    application.id as application_id,
    application.event_company_id,
    pkg.id as package_id,
    stand.id as stand_id,
    move.package_tier,
    move.stand_type,
    move.stand_code
  from campaign
  join package_moves move on true
  join public.event_registration_applications application
    on application.campaign_id = campaign.id
   and application.company_name = move.company_name
  join public.event_registration_packages pkg
    on pkg.campaign_id = campaign.id
   and pkg.mapped_package = move.package_tier::public.package_tier
  join public.event_registration_stands stand
    on stand.campaign_id = campaign.id
   and stand.stand_code = move.stand_code
)
update public.event_registration_stands stand
set
  status = 'assigned',
  assigned_application_id = resolved.application_id,
  updated_at = now()
from resolved
where stand.id = resolved.stand_id;

with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
),
package_moves as (
  select *
  from (
    values
      ('Forsvaret', 'silver', 'Silver 3', 'Silver'),
      ('ABB', 'gold', 'Gold 2', 'Gold'),
      ('CapaSystems A/S', 'standard', 'Standard 21', 'Standard'),
      ('Hult Business School', 'standard', 'Standard 22', 'Standard'),
      ('Circle Consult', 'standard', 'Standard 23', 'Standard')
  ) as move(company_name, package_tier, stand_code, stand_type)
),
resolved as (
  select
    application.id as application_id,
    application.event_company_id,
    pkg.id as package_id,
    stand.id as stand_id,
    move.package_tier,
    move.stand_type,
    move.stand_code
  from campaign
  join package_moves move on true
  join public.event_registration_applications application
    on application.campaign_id = campaign.id
   and application.company_name = move.company_name
  join public.event_registration_packages pkg
    on pkg.campaign_id = campaign.id
   and pkg.mapped_package = move.package_tier::public.package_tier
  join public.event_registration_stands stand
    on stand.campaign_id = campaign.id
   and stand.stand_code = move.stand_code
)
update public.event_registration_applications application
set
  approved_package_id = resolved.package_id,
  approved_stand_id = resolved.stand_id,
  updated_at = now()
from resolved
where application.id = resolved.application_id;

with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
),
package_moves as (
  select *
  from (
    values
      ('Forsvaret', 'silver', 'Silver 3', 'Silver'),
      ('ABB', 'gold', 'Gold 2', 'Gold'),
      ('CapaSystems A/S', 'standard', 'Standard 21', 'Standard'),
      ('Hult Business School', 'standard', 'Standard 22', 'Standard'),
      ('Circle Consult', 'standard', 'Standard 23', 'Standard')
  ) as move(company_name, package_tier, stand_code, stand_type)
),
resolved as (
  select
    application.id as application_id,
    application.event_company_id,
    pkg.id as package_id,
    stand.id as stand_id,
    move.package_tier,
    move.stand_type,
    move.stand_code
  from campaign
  join package_moves move on true
  join public.event_registration_applications application
    on application.campaign_id = campaign.id
   and application.company_name = move.company_name
  join public.event_registration_packages pkg
    on pkg.campaign_id = campaign.id
   and pkg.mapped_package = move.package_tier::public.package_tier
  join public.event_registration_stands stand
    on stand.campaign_id = campaign.id
   and stand.stand_code = move.stand_code
)
update public.event_companies event_company
set
  package = resolved.package_tier::public.package_tier,
  stand_type = resolved.stand_type,
  stand_code = resolved.stand_code,
  updated_at = now()
from resolved
where event_company.id = resolved.event_company_id;
