-- Extend Student Connect 2026 registration campaign deadline
-- closes_at was set to 2026-02-10 which has passed; set to null (open-ended) until further notice

update public.event_registration_campaigns
set
  closes_at = null,
  updated_at = now()
where slug = 'student-connect-2026';
