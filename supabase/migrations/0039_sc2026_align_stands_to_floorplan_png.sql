-- Align Student Connect 2026 stand coordinates to the current floorplan PNG.
-- Coordinate system: top-left x/y plus width/height percentages of 944x1800 image dimensions.
-- Keeps existing assigned/available state for active stands and disables extra standard stand codes
-- that do not have a matching green stand box in the PNG.

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
  c.id,
  s.stand_code,
  s.display_label,
  s.package_tier::public.package_tier,
  s.x,
  s.y,
  s.width,
  s.height,
  s.sort_order,
  'available'
from campaign c
cross join (
  values
    ('Platinum 1', 'Platinum 1', 'platinum', 13.98, 39.89, 12.50, 3.94,  10),
    ('Platinum 2', 'Platinum 2', 'platinum', 27.44, 39.94, 13.14, 3.94,  20),
    ('Platinum 3', 'Platinum 3', 'platinum', 41.31, 39.94, 13.56, 4.00,  30),
    ('Platinum 4', 'Platinum 4', 'platinum', 55.30, 40.00, 13.67, 4.00,  40),

    ('Gold 5', 'Gold 5', 'gold', 20.44, 46.44, 7.63, 5.56,  50),
    ('Gold 6', 'Gold 6', 'gold', 28.50, 46.39, 7.63, 5.61,  60),
    ('Gold 7', 'Gold 7', 'gold', 42.37, 46.44, 7.63, 5.61,  70),
    ('Gold 8', 'Gold 8', 'gold', 50.32, 46.44, 7.63, 5.56,  80),
    ('Gold 1', 'Gold 1', 'gold',  7.63, 61.56, 10.70, 4.00, 260),
    ('Gold 2', 'Gold 2', 'gold', 22.78, 61.39, 10.70, 4.00, 270),
    ('Gold 3', 'Gold 3', 'gold', 39.09, 61.44, 10.70, 4.00, 280),
    ('Gold 4', 'Gold 4', 'gold', 55.93, 61.44, 10.70, 4.00, 290),

    ('Silver 1', 'Silver 1', 'silver',  8.26, 45.78, 5.72, 2.89,  90),
    ('Silver 2', 'Silver 2', 'silver',  8.26, 48.78, 5.61, 3.00, 100),
    ('Silver 3', 'Silver 3', 'silver',  8.26, 51.89, 5.61, 2.94, 110),
    ('Silver 4', 'Silver 4', 'silver',  8.16, 54.94, 5.72, 3.00, 120),
    ('Silver 5', 'Silver 5', 'silver',  8.16, 58.06, 5.72, 2.94, 130),
    ('Silver 6', 'Silver 6', 'silver', 22.25, 52.22, 5.72, 3.00, 140),
    ('Silver 7', 'Silver 7', 'silver', 28.28, 52.17, 5.72, 3.00, 150),
    ('Silver 8', 'Silver 8', 'silver', 22.25, 55.33, 5.72, 3.00, 160),
    ('Silver 9', 'Silver 9', 'silver', 28.28, 55.28, 5.61, 2.94, 170),
    ('Silver 10', 'Silver 10', 'silver', 44.28, 52.11, 5.72, 2.94, 180),
    ('Silver 11', 'Silver 11', 'silver', 44.28, 55.17, 5.61, 3.00, 190),
    ('Silver 12', 'Silver 12', 'silver', 50.42, 52.11, 5.61, 3.00, 200),
    ('Silver 13', 'Silver 13', 'silver', 50.32, 55.22, 5.72, 2.94, 210),
    ('Silver 14', 'Silver 14', 'silver', 66.00, 46.00, 5.61, 2.94, 220),
    ('Silver 15', 'Silver 15', 'silver', 66.00, 49.06, 5.61, 3.00, 230),
    ('Silver 16', 'Silver 16', 'silver', 66.00, 52.28, 5.72, 3.00, 240),
    ('Silver 17', 'Silver 17', 'silver', 66.00, 55.39, 5.72, 2.94, 250),
    ('Silver 18', 'Silver 18', 'silver', 41.21, 68.06, 5.61, 3.00, 300),
    ('Silver 19', 'Silver 19', 'silver', 47.35, 68.06, 5.72, 3.00, 310),
    ('Silver 20', 'Silver 20', 'silver', 59.00, 68.11, 5.61, 3.00, 320),

    ('Standard 1', 'Standard 1', 'standard', 78.18, 19.61, 5.61, 1.83,  10),
    ('Standard 2', 'Standard 2', 'standard', 84.22, 19.67, 5.72, 1.78,  20),
    ('Standard 3', 'Standard 3', 'standard', 90.47, 21.56, 3.50, 2.94,  30),
    ('Standard 4', 'Standard 4', 'standard', 90.47, 24.78, 3.39, 3.00,  40),
    ('Standard 5', 'Standard 5', 'standard', 80.08, 26.56, 3.50, 3.00,  50),
    ('Standard 6', 'Standard 6', 'standard', 90.57, 29.17, 3.60, 3.00,  60),
    ('Standard 7', 'Standard 7', 'standard', 90.57, 32.33, 3.50, 3.00,  70),
    ('Standard 8', 'Standard 8', 'standard', 79.98, 35.17, 3.39, 3.00,  80),
    ('Standard 9', 'Standard 9', 'standard', 90.36, 37.39, 3.60, 2.94,  90),
    ('Standard 10', 'Standard 10', 'standard', 90.36, 40.44, 3.50, 2.94, 100),
    ('Standard 11', 'Standard 11', 'standard', 79.98, 43.67, 3.50, 3.00, 110),
    ('Standard 12', 'Standard 12', 'standard', 90.15, 45.89, 3.50, 3.00, 120),
    ('Standard 13', 'Standard 13', 'standard', 90.15, 49.11, 3.50, 3.00, 130),
    ('Standard 14', 'Standard 14', 'standard', 41.31, 71.22, 5.61, 1.83, 140),
    ('Standard 15', 'Standard 15', 'standard', 47.25, 71.28, 5.61, 1.78, 150),
    ('Standard 16', 'Standard 16', 'standard', 53.18, 71.28, 5.61, 1.78, 160),
    ('Standard 17', 'Standard 17', 'standard', 59.11, 71.28, 5.61, 1.78, 170),
    ('Standard 18', 'Standard 18', 'standard', 66.84, 74.56, 3.60, 3.06, 180),
    ('Standard 19', 'Standard 19', 'standard', 66.53, 77.67, 3.60, 3.06, 190),
    ('Standard 20', 'Standard 20', 'standard', 56.14, 81.72, 6.46, 3.06, 200)
) as s(stand_code, display_label, package_tier, x, y, width, height, sort_order)
on conflict (campaign_id, stand_code) do update
set
  display_label = excluded.display_label,
  package_tier = excluded.package_tier,
  x = excluded.x,
  y = excluded.y,
  width = excluded.width,
  height = excluded.height,
  sort_order = excluded.sort_order,
  updated_at = now();

with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
)
update public.event_registration_stands
set
  status = case
    when assigned_application_id is null then 'disabled'
    else status
  end,
  updated_at = now()
where campaign_id = (select id from campaign)
  and stand_code in ('Standard 21', 'Standard 22', 'Standard 23', 'Standard 24', 'Standard 25', 'Standard 26');
