update public.company_opportunities
set application_url = null
where application_url = '';

alter table public.company_opportunities
  alter column application_url drop not null;
