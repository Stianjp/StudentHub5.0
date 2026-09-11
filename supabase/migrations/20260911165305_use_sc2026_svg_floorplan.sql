update public.event_registration_campaigns
set
  floorplan_image_path = '/StudentConnect-site/Floorplan%20OSH.svg',
  updated_at = now()
where slug = 'student-connect-2026';
