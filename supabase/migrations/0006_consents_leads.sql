-- Make consents per-company (event optional) and add leads table.

do $$ begin
  create type public.consent_source as enum ('stand', 'student_portal');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.lead_source as enum ('stand', 'student_portal');
exception when duplicate_object then null;
end $$;

-- Consents: event_id becomes nullable + unique per student/company.
alter table public.consents
  alter column event_id drop not null;

alter table public.consents
  add column if not exists source public.consent_source not null default 'student_portal',
  add column if not exists consent_text_version text default 'v1',
  add column if not exists revoked_at timestamptz;

-- Remove old unique constraint if it exists and recreate new one.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'consents_event_id_company_id_student_id_key'
  ) then
    alter table public.consents drop constraint consents_event_id_company_id_student_id_key;
  end if;
exception when undefined_object then null;
end $$;

-- Remove duplicate consents per (student_id, company_id), keep latest by consented_at.
delete from public.consents c
using public.consents d
where c.ctid < d.ctid
  and c.student_id = d.student_id
  and c.company_id = d.company_id
  and c.consented_at <= d.consented_at;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'consents_student_company_unique'
  ) then
    alter table public.consents
      add constraint consents_student_company_unique unique (student_id, company_id);
  end if;
exception when duplicate_object then null;
end $$;

create index if not exists idx_consents_company on public.consents(company_id);
create index if not exists idx_consents_student_company on public.consents(student_id, company_id);

-- Ensure student email uniqueness (case-insensitive) when present.
create unique index if not exists students_email_unique
  on public.students (lower(email))
  where email is not null;

-- Leads table
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  interests text[] not null default '{}',
  job_types text[] not null default '{}',
  study_level text,
  study_year int,
  field_of_study text,
  source public.lead_source not null default 'student_portal',
  created_at timestamptz not null default now()
);

create index if not exists idx_leads_company on public.leads(company_id);
create index if not exists idx_leads_student on public.leads(student_id);
create index if not exists idx_leads_event on public.leads(event_id);

-- Leads RLS
alter table public.leads enable row level security;

create policy "Leads: student insert own"
on public.leads
for insert
to authenticated
with check (
  exists (
    select 1
    from public.students s
    where s.id = student_id and s.user_id = auth.uid()
  )
);

create policy "Leads: student select own"
on public.leads
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = student_id and s.user_id = auth.uid()
  )
);

create policy "Leads: company select own"
on public.leads
for select
to authenticated
using (
  public.is_admin(auth.uid()) or
  exists (
    select 1
    from public.companies c
    where c.id = company_id and c.user_id = auth.uid()
  )
);
