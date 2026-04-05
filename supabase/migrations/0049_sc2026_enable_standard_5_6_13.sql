with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
)
update public.event_registration_stands
set
  status = 'available',
  updated_at = now()
where campaign_id = (select id from campaign)
  and stand_code in ('Standard 5', 'Standard 6', 'Standard 13')
  and assigned_application_id is null;
