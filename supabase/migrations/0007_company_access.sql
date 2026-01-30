-- Company access via domains and admin approval.

create table if not exists public.company_domains (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  domain text not null,
  created_at timestamptz not null default now(),
  unique (domain)
);

create table if not exists public.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table if not exists public.company_user_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  domain text not null,
  company_id uuid references public.companies(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.company_domains enable row level security;
alter table public.company_users enable row level security;
alter table public.company_user_requests enable row level security;

-- Company domain policies
create policy "CompanyDomains: admin manage"
on public.company_domains
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "CompanyDomains: company read own"
on public.company_domains
for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_id
      and cu.user_id = auth.uid()
      and cu.approved_at is not null
  )
);

-- Company user policies
create policy "CompanyUsers: admin manage"
on public.company_users
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "CompanyUsers: user read own"
on public.company_users
for select
to authenticated
using (user_id = auth.uid());

create policy "CompanyUsers: company read members"
on public.company_users
for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_id
      and cu.user_id = auth.uid()
      and cu.approved_at is not null
  )
);

-- Company access requests
create policy "CompanyRequests: user insert own"
on public.company_user_requests
for insert
to authenticated
with check (user_id = auth.uid());

create policy "CompanyRequests: user read own"
on public.company_user_requests
for select
to authenticated
using (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "CompanyRequests: admin manage"
on public.company_user_requests
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Additional policies to allow company members (company_users) access to data.
create policy "Companies: select by member"
on public.companies
for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = companies.id
      and cu.user_id = auth.uid()
      and cu.approved_at is not null
  )
);

create policy "EventCompanies: select by member"
on public.event_companies
for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_id
      and cu.user_id = auth.uid()
      and cu.approved_at is not null
  )
);

create policy "StandVisits: select by member"
on public.stand_visits
for select
to authenticated
using (
  public.is_admin(auth.uid()) or
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = stand_visits.company_id
      and cu.user_id = auth.uid()
      and cu.approved_at is not null
  )
);

create policy "Consents: company member read consented"
on public.consents
for select
to authenticated
using (
  consent = true and (
    public.is_admin(auth.uid()) or
    exists (
      select 1
      from public.company_users cu
      where cu.company_id = company_id
        and cu.user_id = auth.uid()
        and cu.approved_at is not null
    )
  )
);

create policy "Leads: company member select"
on public.leads
for select
to authenticated
using (
  public.is_admin(auth.uid()) or
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_id
      and cu.user_id = auth.uid()
      and cu.approved_at is not null
  )
);

create policy "MatchScores: select by member"
on public.match_scores
for select
to authenticated
using (
  public.is_admin(auth.uid()) or
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_id
      and cu.user_id = auth.uid()
      and cu.approved_at is not null
  )
);
