-- Admin-managed contact email addresses belonging directly to a company.

create table if not exists public.company_contact_emails (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  label text not null default '' check (char_length(label) <= 80),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, email)
);

create unique index if not exists idx_company_contact_emails_single_primary
  on public.company_contact_emails(company_id)
  where is_primary;

create index if not exists idx_company_contact_emails_company
  on public.company_contact_emails(company_id, created_at);

drop trigger if exists trg_company_contact_emails_updated_at on public.company_contact_emails;
create trigger trg_company_contact_emails_updated_at
before update on public.company_contact_emails
for each row execute function public.set_updated_at();

alter table public.company_contact_emails enable row level security;

drop policy if exists "CompanyContactEmails: admin full access" on public.company_contact_emails;
create policy "CompanyContactEmails: admin full access"
on public.company_contact_emails
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
