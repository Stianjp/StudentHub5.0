-- Approve Circle Consult for Student Connect 2026 so they are included in the
-- public confirmed companies list and linked to their assigned Standard 23 stand.

with campaign as (
  select id, event_id
  from event_registration_campaigns
  where slug = 'student-connect-2026'
), circle_application as (
  select application.id, application.company_id, application.approved_package_id, application.approved_stand_id
  from event_registration_applications application
  join campaign on campaign.id = application.campaign_id
  where application.id = '1c7a5c7e-b3fc-406b-a37d-9693e6e7e25b'
    and application.company_name ilike 'Circle Consult%'
), approved_application as (
  update event_registration_applications application
  set
    status = 'approved',
    approved_at = coalesce(application.approved_at, now()),
    updated_at = now()
  from circle_application circle
  where application.id = circle.id
  returning application.id, application.company_id, application.event_id, application.approved_package_id, application.approved_stand_id
), assigned_stand as (
  update event_registration_stands stand
  set
    status = 'assigned',
    assigned_application_id = approved.id,
    updated_at = now()
  from approved_application approved
  where stand.id = approved.approved_stand_id
    and stand.stand_code = 'Standard 23'
  returning stand.id, stand.stand_code
)
update event_companies event_company
set
  package = 'standard',
  stand_type = 'Standard',
  stand_code = 'Standard 23',
  updated_at = now()
from approved_application approved
where event_company.event_id = approved.event_id
  and event_company.company_id = approved.company_id;
