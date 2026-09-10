-- Event-scoped gala dinner pipeline with explicit company membership and attendees.

alter table public.crm_pipelines
add column kind text not null default 'generic',
add column event_id uuid references public.events(id) on delete cascade;

alter table public.crm_pipelines
add constraint crm_pipelines_kind_check
check (kind in ('generic', 'gala_dinner')),
add constraint crm_pipelines_gala_dinner_event_check
check (kind <> 'gala_dinner' or event_id is not null);

create unique index idx_crm_pipelines_gala_dinner_event
  on public.crm_pipelines (event_id)
  where kind = 'gala_dinner';

create table public.crm_gala_dinner_companies (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.crm_pipelines(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  stage_id uuid not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pipeline_id, company_id),
  foreign key (pipeline_id, stage_id)
    references public.crm_pipeline_stages(pipeline_id, id)
);

create table public.crm_gala_dinner_attendees (
  id uuid primary key default gen_random_uuid(),
  dinner_company_id uuid not null references public.crm_gala_dinner_companies(id) on delete cascade,
  full_name text not null,
  allergens text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_gala_dinner_attendees_name_check
    check (char_length(trim(full_name)) between 1 and 120),
  constraint crm_gala_dinner_attendees_allergens_check
    check (allergens is null or char_length(allergens) <= 500)
);

create index idx_crm_gala_dinner_companies_pipeline_stage
  on public.crm_gala_dinner_companies(pipeline_id, stage_id)
  where is_active;

create index idx_crm_gala_dinner_companies_company
  on public.crm_gala_dinner_companies(company_id);

create index idx_crm_gala_dinner_attendees_company
  on public.crm_gala_dinner_attendees(dinner_company_id);

create trigger trg_crm_gala_dinner_companies_updated_at
before update on public.crm_gala_dinner_companies
for each row execute function public.set_updated_at();

create trigger trg_crm_gala_dinner_attendees_updated_at
before update on public.crm_gala_dinner_attendees
for each row execute function public.set_updated_at();

alter table public.crm_gala_dinner_companies enable row level security;
alter table public.crm_gala_dinner_attendees enable row level security;

revoke all on table public.crm_gala_dinner_companies from anon;
revoke all on table public.crm_gala_dinner_attendees from anon;
grant select, insert, update, delete on table public.crm_gala_dinner_companies to authenticated, service_role;
grant select, insert, update, delete on table public.crm_gala_dinner_attendees to authenticated, service_role;

create policy "CrmGalaDinnerCompanies: admin full access"
on public.crm_gala_dinner_companies
for all
to authenticated
using ((select public.is_admin(auth.uid())))
with check ((select public.is_admin(auth.uid())));

create policy "CrmGalaDinnerAttendees: admin full access"
on public.crm_gala_dinner_attendees
for all
to authenticated
using ((select public.is_admin(auth.uid())))
with check ((select public.is_admin(auth.uid())));

with target_event as (
  select id
  from public.events
  where slug = 'student-connect-2026'
  limit 1
)
insert into public.crm_pipelines (name, position, is_default, kind, event_id)
select
  'Gallamiddag - Student Connect 2026',
  (select coalesce(max(position), -1) + 1 from public.crm_pipelines),
  false,
  'gala_dinner',
  target_event.id
from target_event
where not exists (
  select 1
  from public.crm_pipelines
  where kind = 'gala_dinner'
    and event_id = target_event.id
);

insert into public.crm_pipeline_stages (pipeline_id, name, position)
select pipeline.id, stage.name, stage.position
from public.crm_pipelines pipeline
cross join (
  values
    ('Ikke påmeldt', 0),
    ('Påmeldt', 1)
) as stage(name, position)
join public.events event on event.id = pipeline.event_id
where pipeline.kind = 'gala_dinner'
  and event.slug = 'student-connect-2026'
on conflict (pipeline_id, position) do nothing;

insert into public.crm_gala_dinner_companies (pipeline_id, company_id, stage_id)
select pipeline.id, event_company.company_id, first_stage.id
from public.crm_pipelines pipeline
join public.events event on event.id = pipeline.event_id
join public.crm_pipeline_stages first_stage
  on first_stage.pipeline_id = pipeline.id
  and first_stage.position = 0
join public.event_companies event_company
  on event_company.event_id = event.id
where pipeline.kind = 'gala_dinner'
  and event.slug = 'student-connect-2026'
  and event_company.package in ('gold', 'platinum')
on conflict (pipeline_id, company_id) do nothing;
