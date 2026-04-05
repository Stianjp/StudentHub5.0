with latest_by_company as (
  select distinct on (company_id)
    company_id,
    candidate_level
  from public.event_registration_applications
  where company_id is not null
  order by company_id, created_at desc
),
latest_by_org as (
  select distinct on (regexp_replace(org_number, '\s+', '', 'g'))
    regexp_replace(org_number, '\s+', '', 'g') as org_key,
    candidate_level
  from public.event_registration_applications
  where company_id is null
    and nullif(regexp_replace(org_number, '\s+', '', 'g'), '') is not null
  order by regexp_replace(org_number, '\s+', '', 'g'), created_at desc
),
resolved_levels as (
  select
    companies.id,
    case coalesce(latest_by_company.candidate_level, latest_by_org.candidate_level)
      when 'bachelor' then array['Bachelor']::text[]
      when 'master' then array['Master']::text[]
      else array['Bachelor', 'Master']::text[]
    end as recruitment_levels
  from public.companies
  left join latest_by_company on latest_by_company.company_id = companies.id
  left join latest_by_org on latest_by_org.org_key = regexp_replace(coalesce(companies.org_number, ''), '\s+', '', 'g')
  where coalesce(array_length(companies.recruitment_levels, 1), 0) = 0
    and coalesce(latest_by_company.candidate_level, latest_by_org.candidate_level) is not null
)
update public.companies
set
  recruitment_levels = resolved_levels.recruitment_levels,
  updated_at = now()
from resolved_levels
where resolved_levels.id = public.companies.id;
