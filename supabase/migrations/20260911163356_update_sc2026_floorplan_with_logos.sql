update public.event_registration_campaigns
set
  floorplan_image_path = '/StudentConnect-site/Floorplan_With_Logos.webp',
  updated_at = now()
where slug = 'student-connect-2026';
