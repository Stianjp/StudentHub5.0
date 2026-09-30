-- Adjust Student Connect 2026 public stand overlays for the updated floorplan.
-- Punkt Oslo is a component overlay; Standard 21-23 are the live stand boxes for
-- CapaSystems, Hult Business School and Circle Consult.

with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
)
update public.event_registration_stands as stand
set
  height = next_values.height,
  updated_at = now()
from (
  values
    ('Standard 21', 2.20),
    ('Standard 22', 2.20),
    ('Standard 23', 2.20)
) as next_values(stand_code, height)
where stand.campaign_id = (select id from campaign)
  and stand.stand_code = next_values.stand_code;
