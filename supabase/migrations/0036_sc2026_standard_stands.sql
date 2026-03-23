-- Add Standard stands for Student Connect 2026
-- Positioned in the right-side corridor (two vertical columns)

-- First ensure 'standard' exists in package_tier enum (added in 0035 if not already present)
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'standard'
      and enumtypid = 'public.package_tier'::regtype
  ) then
    alter type public.package_tier add value 'standard';
  end if;
end $$;

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
select c.id, s.stand_code, s.display_label, 'standard'::public.package_tier, s.x, s.y, s.width, s.height, s.sort_order, 'available'
from campaign c
cross join (
  values
    -- Left column of Standard stands (right corridor, x ≈ 74)
    ('Standard 1',  'Standard 1',  74.0, 23.0, 4.5, 3.5, 310),
    ('Standard 2',  'Standard 2',  74.0, 27.5, 4.5, 3.5, 320),
    ('Standard 3',  'Standard 3',  74.0, 32.0, 4.5, 3.5, 330),
    ('Standard 4',  'Standard 4',  74.0, 36.5, 4.5, 3.5, 340),
    ('Standard 5',  'Standard 5',  74.0, 41.0, 4.5, 3.5, 350),
    ('Standard 6',  'Standard 6',  74.0, 45.5, 4.5, 3.5, 360),
    ('Standard 7',  'Standard 7',  74.0, 50.0, 4.5, 3.5, 370),
    ('Standard 8',  'Standard 8',  74.0, 54.5, 4.5, 3.5, 380),
    ('Standard 9',  'Standard 9',  74.0, 59.0, 4.5, 3.5, 390),
    -- Right column of Standard stands (x ≈ 79.5)
    ('Standard 10', 'Standard 10', 79.5, 23.0, 4.5, 3.5, 400),
    ('Standard 11', 'Standard 11', 79.5, 27.5, 4.5, 3.5, 410),
    ('Standard 12', 'Standard 12', 79.5, 32.0, 4.5, 3.5, 420),
    ('Standard 13', 'Standard 13', 79.5, 36.5, 4.5, 3.5, 430),
    ('Standard 14', 'Standard 14', 79.5, 41.0, 4.5, 3.5, 440),
    ('Standard 15', 'Standard 15', 79.5, 45.5, 4.5, 3.5, 450),
    ('Standard 16', 'Standard 16', 79.5, 50.0, 4.5, 3.5, 460),
    ('Standard 17', 'Standard 17', 79.5, 54.5, 4.5, 3.5, 470)
) as s(stand_code, display_label, x, y, width, height, sort_order)
on conflict (campaign_id, stand_code) do update
set
  display_label = excluded.display_label,
  package_tier  = excluded.package_tier,
  x             = excluded.x,
  y             = excluded.y,
  width         = excluded.width,
  height        = excluded.height,
  sort_order    = excluded.sort_order,
  updated_at    = now();
