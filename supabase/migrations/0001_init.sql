-- OSH StudentHub MVP schema
-- Run in Supabase SQL editor or via supabase CLI migrations.

create extension if not exists pgcrypto;

-- Enums
create type public.app_role as enum ('student', 'company', 'admin');
create type public.package_tier as enum ('basic', 'pro', 'platinum');
create type public.visit_source as enum ('qr', 'kiosk');

-- Helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  org_number text,
  industry text,
  size text,
  location text,
  website text,
  recruitment_roles text[] not null default '{}',
  recruitment_fields text[] not null default '{}',
  recruitment_levels text[] not null default '{}',
  recruitment_job_types text[] not null default '{}',
  recruitment_timing text[] not null default '{}',
  branding_values text[] not null default '{}',
  branding_evp text,
  branding_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text,
  email text,
  phone text,
  study_program text,
  study_level text,
  graduation_year int,
  job_types text[] not null default '{}',
  interests text[] not null default '{}',
  values text[] not null default '{}',
  preferred_locations text[] not null default '{}',
  willing_to_relocate boolean not null default false,
  liked_company_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_public_profiles (
  student_id uuid primary key references public.students(id) on delete cascade,
  study_program text,
  study_level text,
  graduation_year int,
  job_types text[] not null default '{}',
  interests text[] not null default '{}',
  values text[] not null default '{}',
  preferred_locations text[] not null default '{}',
  willing_to_relocate boolean not null default false,
  liked_company_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_companies (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  stand_type text,
  goals text[] not null default '{}',
  kpis text[] not null default '{}',
  package public.package_tier not null default 'basic',
  access_from timestamptz,
  access_until timestamptz,
  invited_email text,
  invited_at timestamptz,
  registered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, company_id)
);

create table if not exists public.stand_visits (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  source public.visit_source not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  consent boolean not null,
  scope text not null default 'contact',
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (event_id, company_id, student_id)
);

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.match_scores (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  score numeric(5,2) not null check (score >= 0),
  reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, company_id, student_id)
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  type text not null,
  subject text,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function public.sync_student_public_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_public_profiles (
    student_id,
    study_program,
    study_level,
    graduation_year,
    job_types,
    interests,
    values,
    preferred_locations,
    willing_to_relocate,
    liked_company_ids,
    updated_at
  ) values (
    new.id,
    new.study_program,
    new.study_level,
    new.graduation_year,
    new.job_types,
    new.interests,
    new.values,
    new.preferred_locations,
    new.willing_to_relocate,
    new.liked_company_ids,
    now()
  )
  on conflict (student_id) do update
  set
    study_program = excluded.study_program,
    study_level = excluded.study_level,
    graduation_year = excluded.graduation_year,
    job_types = excluded.job_types,
    interests = excluded.interests,
    values = excluded.values,
    preferred_locations = excluded.preferred_locations,
    willing_to_relocate = excluded.willing_to_relocate,
    liked_company_ids = excluded.liked_company_ids,
    updated_at = now();

  return new;
end;
$$;

insert into public.student_public_profiles (
  student_id,
  study_program,
  study_level,
  graduation_year,
  job_types,
  interests,
  values,
  preferred_locations,
  willing_to_relocate,
  liked_company_ids,
  updated_at
)
select
  s.id,
  s.study_program,
  s.study_level,
  s.graduation_year,
  s.job_types,
  s.interests,
  s.values,
  s.preferred_locations,
  s.willing_to_relocate,
  s.liked_company_ids,
  now()
from public.students s
on conflict (student_id) do update
set
  study_program = excluded.study_program,
  study_level = excluded.study_level,
  graduation_year = excluded.graduation_year,
  job_types = excluded.job_types,
  interests = excluded.interests,
  values = excluded.values,
  preferred_locations = excluded.preferred_locations,
  willing_to_relocate = excluded.willing_to_relocate,
  liked_company_ids = excluded.liked_company_ids,
  updated_at = now();

-- Indexes
create index if not exists idx_event_companies_event on public.event_companies(event_id);
create index if not exists idx_event_companies_company on public.event_companies(company_id);
create index if not exists idx_visits_event_company on public.stand_visits(event_id, company_id);
create index if not exists idx_consents_event_company on public.consents(event_id, company_id);
create index if not exists idx_consents_student on public.consents(student_id);
create index if not exists idx_match_company_score on public.match_scores(company_id, score desc);
create index if not exists idx_match_event_company on public.match_scores(event_id, company_id);

-- Triggers
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trg_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create trigger trg_students_updated_at
before update on public.students
for each row execute function public.set_updated_at();

create trigger trg_students_public_profile
after insert or update on public.students
for each row execute function public.sync_student_public_profile();

create trigger trg_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger trg_event_companies_updated_at
before update on public.event_companies
for each row execute function public.set_updated_at();

create trigger trg_match_scores_updated_at
before update on public.match_scores
for each row execute function public.set_updated_at();

-- Access helper for premium features
create or replace function public.has_platinum_access(uid uuid, event_uuid uuid, company_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_companies ec
    join public.companies c on c.id = ec.company_id
    where ec.event_id = event_uuid
      and ec.company_id = company_uuid
      and ec.package = 'platinum'
      and (ec.access_from is null or ec.access_from <= now())
      and (ec.access_until is null or ec.access_until >= now())
      and (c.user_id = uid or public.is_admin(uid))
  );
$$;

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.students enable row level security;
alter table public.student_public_profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_companies enable row level security;
alter table public.stand_visits enable row level security;
alter table public.consents enable row level security;
alter table public.survey_responses enable row level security;
alter table public.match_scores enable row level security;
alter table public.email_logs enable row level security;

-- Profiles policies
create policy "Profiles: self select"
on public.profiles
for select
using (auth.uid() = id or public.is_admin(auth.uid()));

create policy "Profiles: self insert"
on public.profiles
for insert
with check (
  auth.uid() = id and (
    role in ('student', 'company') or public.is_admin(auth.uid())
  )
);

create policy "Profiles: self update"
on public.profiles
for update
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (
  public.is_admin(auth.uid()) or (
    auth.uid() = id and (role <> 'admin' or public.is_admin(auth.uid()))
  )
);

-- Companies policies
create policy "Companies: select own"
on public.companies
for select
using (
  user_id = auth.uid() or
  public.is_admin(auth.uid()) or
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
);

create policy "Companies: public read (MVP)"
on public.companies
for select
using (true);

create policy "Companies: insert authenticated"
on public.companies
for insert
to authenticated
with check (true);

create policy "Companies: update own"
on public.companies
for update
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

-- Students policies
create policy "Students: select own"
on public.students
for select
using (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "Students: company read consented"
on public.students
for select
to authenticated
using (
  public.is_admin(auth.uid()) or
  user_id = auth.uid() or
  exists (
    select 1
    from public.consents co
    join public.companies c on c.id = co.company_id
    where co.student_id = students.id
      and co.consent = true
      and c.user_id = auth.uid()
  )
);

create policy "Students: insert authenticated"
on public.students
for insert
to authenticated
with check (true);

create policy "Students: update own"
on public.students
for update
using (user_id = auth.uid() or public.is_admin(auth.uid()))
with check (user_id = auth.uid() or public.is_admin(auth.uid()));

-- Student public profile policies
create policy "StudentPublic: read all"
on public.student_public_profiles
for select
using (true);

create policy "StudentPublic: manage own"
on public.student_public_profiles
for all
to authenticated
using (
  public.is_admin(auth.uid()) or
  exists (
    select 1
    from public.students s
    where s.id = student_id and s.user_id = auth.uid()
  )
)
with check (
  public.is_admin(auth.uid()) or
  exists (
    select 1
    from public.students s
    where s.id = student_id and s.user_id = auth.uid()
  )
);

-- Events policies (public read)
create policy "Events: public read"
on public.events
for select
using (true);

create policy "Events: admin write"
on public.events
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Event companies policies
create policy "EventCompanies: select own"
on public.event_companies
for select
using (
  public.is_admin(auth.uid()) or
  exists (
    select 1
    from public.companies c
    where c.id = company_id and c.user_id = auth.uid()
  )
);

create policy "EventCompanies: public read (MVP)"
on public.event_companies
for select
using (true);

create policy "EventCompanies: admin manage"
on public.event_companies
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "EventCompanies: company update own"
on public.event_companies
for update
to authenticated
using (
  exists (
    select 1
    from public.companies c
    where c.id = company_id and c.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.companies c
    where c.id = company_id and c.user_id = auth.uid()
  )
);

-- Stand visits policies
create policy "StandVisits: insert for all"
on public.stand_visits
for insert
with check (true);

create policy "StandVisits: select own"
on public.stand_visits
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

-- Consents policies
create policy "Consents: student insert own"
on public.consents
for insert
to authenticated
with check (
  exists (
    select 1
    from public.students s
    where s.id = student_id and s.user_id = auth.uid()
  )
);

create policy "Consents: student update own"
on public.consents
for update
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = student_id and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = student_id and s.user_id = auth.uid()
  )
);

create policy "Consents: company read consented"
on public.consents
for select
to authenticated
using (
  consent = true and (
    public.is_admin(auth.uid()) or
    exists (
      select 1
      from public.companies c
      where c.id = company_id and c.user_id = auth.uid()
    )
  )
);

-- Survey responses policies
create policy "SurveyResponses: insert for all"
on public.survey_responses
for insert
with check (true);

create policy "SurveyResponses: select own"
on public.survey_responses
for select
to authenticated
using (
  public.is_admin(auth.uid()) or
  (company_id is not null and exists (
    select 1
    from public.companies c
    where c.id = company_id and c.user_id = auth.uid()
  ))
);

-- Match scores policies
create policy "MatchScores: select own"
on public.match_scores
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

create policy "MatchScores: upsert own"
on public.match_scores
for all
to authenticated
using (
  public.is_admin(auth.uid()) or
  exists (
    select 1
    from public.companies c
    where c.id = company_id and c.user_id = auth.uid()
  )
)
with check (
  public.is_admin(auth.uid()) or
  exists (
    select 1
    from public.companies c
    where c.id = company_id and c.user_id = auth.uid()
  )
);

-- Email logs policies
create policy "EmailLogs: insert authenticated"
on public.email_logs
for insert
to authenticated
with check (true);

create policy "EmailLogs: admin read"
on public.email_logs
for select
to authenticated
using (public.is_admin(auth.uid()));
