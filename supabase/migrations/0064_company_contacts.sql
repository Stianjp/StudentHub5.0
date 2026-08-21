-- Primary and secondary contacts used for company follow-up in admin and CRM.

create table if not exists public.company_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  contact_type text not null,
  name text not null,
  job_title text not null default '',
  email text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, contact_type),
  constraint company_contacts_type_check check (contact_type in ('primary', 'secondary'))
);

create index if not exists idx_company_contacts_company
  on public.company_contacts(company_id, contact_type);

drop trigger if exists trg_company_contacts_updated_at on public.company_contacts;
create trigger trg_company_contacts_updated_at
before update on public.company_contacts
for each row execute function public.set_updated_at();

alter table public.company_contacts enable row level security;

drop policy if exists "CompanyContacts: admin full access" on public.company_contacts;
create policy "CompanyContacts: admin full access"
on public.company_contacts
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
