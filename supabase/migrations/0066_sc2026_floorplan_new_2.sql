-- Use the updated Student Connect 2026 floorplan image.

update public.event_registration_campaigns
set
  floorplan_image_path = '/StudentConnect-site/FloorPlan_New_2.png',
  updated_at = now()
where slug = 'student-connect-2026';
