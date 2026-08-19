-- Independent, configurable CRM pipelines for company follow-up.

create table if not exists public.crm_pipelines (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  position integer not null default 0 check (position >= 0),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_crm_pipelines_single_default
  on public.crm_pipelines (is_default)
  where is_default;

create table if not exists public.crm_pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.crm_pipelines(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pipeline_id, position),
  unique (pipeline_id, id)
);

create table if not exists public.crm_pipeline_company_positions (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.crm_pipelines(id) on delete cascade,
  stage_id uuid not null,
  company_key text not null check (char_length(trim(company_key)) > 0),
  company_id uuid references public.companies(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  company_name text not null,
  event_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pipeline_id, company_key),
  foreign key (pipeline_id, stage_id)
    references public.crm_pipeline_stages(pipeline_id, id)
    on delete cascade
);

create index if not exists idx_crm_pipeline_stages_pipeline
  on public.crm_pipeline_stages(pipeline_id, position);

create index if not exists idx_crm_pipeline_positions_pipeline_stage
  on public.crm_pipeline_company_positions(pipeline_id, stage_id);

drop trigger if exists trg_crm_pipelines_updated_at on public.crm_pipelines;
create trigger trg_crm_pipelines_updated_at
before update on public.crm_pipelines
for each row execute function public.set_updated_at();

drop trigger if exists trg_crm_pipeline_stages_updated_at on public.crm_pipeline_stages;
create trigger trg_crm_pipeline_stages_updated_at
before update on public.crm_pipeline_stages
for each row execute function public.set_updated_at();

drop trigger if exists trg_crm_pipeline_positions_updated_at on public.crm_pipeline_company_positions;
create trigger trg_crm_pipeline_positions_updated_at
before update on public.crm_pipeline_company_positions
for each row execute function public.set_updated_at();

alter table public.crm_pipelines enable row level security;
alter table public.crm_pipeline_stages enable row level security;
alter table public.crm_pipeline_company_positions enable row level security;

drop policy if exists "CrmPipelines: admin full access" on public.crm_pipelines;
create policy "CrmPipelines: admin full access"
on public.crm_pipelines
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "CrmPipelineStages: admin full access" on public.crm_pipeline_stages;
create policy "CrmPipelineStages: admin full access"
on public.crm_pipeline_stages
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "CrmPipelinePositions: admin full access" on public.crm_pipeline_company_positions;
create policy "CrmPipelinePositions: admin full access"
on public.crm_pipeline_company_positions
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

insert into public.crm_pipelines (name, position, is_default)
select 'Betalings- og kontraktstatus', 0, true
where not exists (
  select 1 from public.crm_pipelines where is_default
);

insert into public.crm_pipeline_stages (pipeline_id, name, position)
select pipeline.id, stage.name, stage.position
from public.crm_pipelines pipeline
cross join (
  values
    ('Påmeldt', 0),
    ('Venter kontrakt', 1),
    ('Venter faktura', 2),
    ('Betalt', 3)
) as stage(name, position)
where pipeline.is_default
on conflict (pipeline_id, position) do nothing;

insert into public.crm_pipelines (name, position, is_default)
select 'Mailfrister - Bord/stoler', 1, false
where not exists (
  select 1
  from public.crm_pipelines
  where lower(trim(name)) = lower('Mailfrister - Bord/stoler')
);

insert into public.crm_pipeline_stages (pipeline_id, name, position)
select pipeline.id, stage.name, stage.position
from public.crm_pipelines pipeline
cross join (
  values
    ('Bedrift', 0),
    ('Sendt mail', 1),
    ('Mottatt svar på bord', 2),
    ('Mottatt svar på stoler', 3),
    ('Alt ok', 4)
) as stage(name, position)
where lower(trim(pipeline.name)) = lower('Mailfrister - Bord/stoler')
on conflict (pipeline_id, position) do nothing;
