with suppressed_companies as (
  select distinct c.id
  from public.email_contact_companies c
  left join public.email_contact_cases ec on ec.contact_company_id = c.id
  left join public.email_contact_case_messages m on m.case_id = ec.id
  where lower(coalesce(c.primary_email, '')) = 'dmarcreport@microsoft.com'
     or lower(coalesce(ec.contact_email, '')) = 'dmarcreport@microsoft.com'
     or lower(coalesce(m.from_email, '')) = 'dmarcreport@microsoft.com'
)
update public.email_contact_cases
set
  status = 'archived',
  archived_at = coalesce(archived_at, now()),
  updated_at = now()
where contact_company_id in (select id from suppressed_companies);

with suppressed_companies as (
  select distinct c.id
  from public.email_contact_companies c
  left join public.email_contact_cases ec on ec.contact_company_id = c.id
  left join public.email_contact_case_messages m on m.case_id = ec.id
  where lower(coalesce(c.primary_email, '')) = 'dmarcreport@microsoft.com'
     or lower(coalesce(ec.contact_email, '')) = 'dmarcreport@microsoft.com'
     or lower(coalesce(m.from_email, '')) = 'dmarcreport@microsoft.com'
)
update public.email_contact_companies
set
  archived_at = coalesce(archived_at, now()),
  updated_at = now()
where id in (select id from suppressed_companies);
