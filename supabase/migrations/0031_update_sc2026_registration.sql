-- Update Student Connect 2026 registration campaign title and package names

update public.event_registration_campaigns
set
  public_title = 'Registration for Student Hub 2026',
  updated_at = now()
where slug = 'student-connect-2026';

update public.event_registration_packages
set
  public_name = 'I dont know, contact me!',
  updated_at = now()
where campaign_id = (
  select id from public.event_registration_campaigns where slug = 'student-connect-2026'
)
and package_key = 'contact_me';
