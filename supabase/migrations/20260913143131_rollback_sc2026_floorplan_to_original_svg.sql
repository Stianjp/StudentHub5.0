update public.event_registration_campaigns
set
  floorplan_image_path = '/event-register/student-connect-2026-floorplan.svg',
  updated_at = now()
where slug = 'student-connect-2026';
