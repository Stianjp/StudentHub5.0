-- Fine tune Student Connect 2026 stand overlays against the visible floorplan logos.

with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
)
update public.event_registration_stands as stand
set
  x = next_values.x,
  y = next_values.y,
  width = next_values.width,
  height = next_values.height,
  updated_at = now()
from (
  values
    ('Standard 14', 41.31, 70.35, 5.61, 1.83),
    ('Standard 15', 47.25, 70.35, 5.61, 1.78),
    ('Standard 16', 53.18, 70.35, 5.61, 1.78),
    ('Standard 17', 59.11, 70.35, 5.61, 1.78),
    ('Standard 23', 57.60, 68.55, 5.61, 2.20)
) as next_values(stand_code, x, y, width, height)
where stand.campaign_id = (select id from campaign)
  and stand.stand_code = next_values.stand_code;
