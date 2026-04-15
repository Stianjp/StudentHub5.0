create table if not exists public.company_opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  opportunity_type text not null check (opportunity_type in ('job', 'thesis')),
  title text not null,
  location text,
  application_url text not null,
  application_deadline date,
  field_tags text[] not null default '{}',
  levels text[] not null default '{}',
  years_bachelor integer[] not null default '{}',
  years_master integer[] not null default '{}',
  engagement_types text[] not null default '{}',
  description text,
  is_published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint company_opportunities_description_length check (char_length(coalesce(description, '')) <= 2000)
);

create index if not exists company_opportunities_company_idx
  on public.company_opportunities(company_id);

create index if not exists company_opportunities_public_idx
  on public.company_opportunities(opportunity_type, is_published, application_deadline);

alter table public.company_opportunities enable row level security;

drop policy if exists "Published opportunities are readable" on public.company_opportunities;
create policy "Published opportunities are readable"
  on public.company_opportunities
  for select
  using (is_published = true);

drop policy if exists "Approved company users manage own opportunities" on public.company_opportunities;
create policy "Approved company users manage own opportunities"
  on public.company_opportunities
  for all
  using (
    exists (
      select 1
      from public.company_users company_user
      where company_user.company_id = company_opportunities.company_id
        and company_user.user_id = auth.uid()
        and company_user.approved_at is not null
    )
  )
  with check (
    exists (
      select 1
      from public.company_users company_user
      where company_user.company_id = company_opportunities.company_id
        and company_user.user_id = auth.uid()
        and company_user.approved_at is not null
    )
  );
