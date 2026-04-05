with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
)
update public.event_registration_stands
set
  status = 'disabled',
  updated_at = now()
where campaign_id = (select id from campaign)
  and stand_code in (
    'Standard 1',
    'Standard 2',
    'Standard 3',
    'Standard 4',
    'Standard 5',
    'Standard 6',
    'Standard 7'
  );

with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
)
update public.event_registration_stands
set
  status = 'assigned',
  updated_at = now()
where campaign_id = (select id from campaign)
  and stand_code = 'Standard 20';
