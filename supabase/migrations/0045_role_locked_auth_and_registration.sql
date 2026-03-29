alter table public.students
  add column if not exists school text;

alter table public.companies
  add column if not exists address text,
  add column if not exists postal_code text,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists logo_path text;

with latest_application as (
  select distinct on (application.company_id)
    application.company_id,
    application.address,
    application.postal_code,
    application.city,
    application.country,
    application.logo_path,
    application.candidate_fields
  from public.event_registration_applications as application
  where application.company_id is not null
  order by application.company_id, application.created_at desc
)
update public.companies as company
set
  address = coalesce(company.address, latest_application.address),
  postal_code = coalesce(company.postal_code, latest_application.postal_code),
  city = coalesce(company.city, latest_application.city),
  country = coalesce(company.country, latest_application.country),
  logo_path = coalesce(company.logo_path, latest_application.logo_path),
  recruitment_fields = case
    when coalesce(array_length(company.recruitment_fields, 1), 0) = 0 then coalesce(latest_application.candidate_fields, company.recruitment_fields)
    else company.recruitment_fields
  end,
  location = coalesce(
    nullif(company.location, ''),
    nullif(trim(concat_ws(', ', latest_application.city, latest_application.country)), ''),
    company.location
  ),
  updated_at = now()
from latest_application
where company.id = latest_application.company_id;
