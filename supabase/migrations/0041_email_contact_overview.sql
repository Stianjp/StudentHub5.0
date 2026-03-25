create type public.email_contact_case_status as enum (
  'unsorted',
  'open',
  'closed',
  'archived'
);
(); 
create type public.email_contact_message_direction as enum (
  'inbound',
  'outbound',
  'internal_note'
);

create type public.email_contact_checklist_key as enum (
  'logo',
  'tables_chairs',
  'reply',
  'contract',
  'payment'
);
;
create table if not exists public.email_contact_companies (
  id uuid primary key default gen_random_uuid(),
  linked_company_id uuid references public.companies(id) on delete set null,
  display_name text not null,
  primary_domain text not null unique,
  primary_email text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_contact_cases (
  id uuid primary key default gen_random_uuid(),
  contact_company_id uuid not null references public.email_contact_companies(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  case_number text not null unique,
  title text not null,
  status public.email_contact_case_status not null default 'unsorted',
  contact_name text,
  contact_email text,
  latest_message_at timestamptz,
  merged_into_case_id uuid references public.email_contact_cases(id) on delete set null,
  archived_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_contact_case_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.email_contact_cases(id) on delete cascade,
  direction public.email_contact_message_direction not null,
  source text not null default 'gmail',
  gmail_message_id text unique,
  gmail_thread_id text,
  internet_message_id text,
  in_reply_to_message_id text,
  from_email text not null default '',
  from_name text,
  to_emails text[] not null default '{}',
  cc_emails text[] not null default '{}',
  subject text not null default '',
  body_text text,
  body_html text,
  sent_at timestamptz,
  received_at timestamptz,
  raw_headers jsonb not null default '{}'::jsonb,
  moved_from_case_id uuid references public.email_contact_cases(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_contact_case_checklist_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.email_contact_cases(id) on delete cascade,
  item_key public.email_contact_checklist_key not null,
  label text not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, item_key)
);

create table if not exists public.email_contact_mailbox_sync_state (
  mailbox_email text primary key,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_email_contact_companies_archived
  on public.email_contact_companies(archived_at, display_name);

create index if not exists idx_email_contact_cases_company_status
  on public.email_contact_cases(contact_company_id, status, latest_message_at desc nulls last);

create index if not exists idx_email_contact_cases_event_status
  on public.email_contact_cases(event_id, status, latest_message_at desc nulls last);

create index if not exists idx_email_contact_messages_case_sent
  on public.email_contact_case_messages(case_id, coalesce(received_at, sent_at) desc nulls last);

create index if not exists idx_email_contact_messages_thread
  on public.email_contact_case_messages(gmail_thread_id);

create sequence if not exists public.email_contact_case_number_seq start 1;

create or replace function public.next_email_contact_case_number()
returns text
language sql
security definer
set search_path = public
as $$
  select 'OSH-' || lpad(nextval('public.email_contact_case_number_seq')::text, 6, '0');
$$;

create or replace function public.seed_email_contact_case_checklist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.email_contact_case_checklist_items (case_id, item_key, label)
  values
    (new.id, 'logo', 'Venter på logo'),
    (new.id, 'tables_chairs', 'Venter på bord/stoler'),
    (new.id, 'reply', 'Venter på svar'),
    (new.id, 'contract', 'Venter på kontrakt'),
    (new.id, 'payment', 'Venter på betaling')
  on conflict (case_id, item_key) do nothing;

  return new;
end;
$$;

create trigger trg_email_contact_companies_updated_at
before update on public.email_contact_companies
for each row execute function public.set_updated_at();

create trigger trg_email_contact_cases_updated_at
before update on public.email_contact_cases
for each row execute function public.set_updated_at();

create trigger trg_email_contact_case_messages_updated_at
before update on public.email_contact_case_messages
for each row execute function public.set_updated_at();

create trigger trg_email_contact_case_checklist_items_updated_at
before update on public.email_contact_case_checklist_items
for each row execute function public.set_updated_at();

create trigger trg_email_contact_mailbox_sync_state_updated_at
before update on public.email_contact_mailbox_sync_state
for each row execute function public.set_updated_at();

create trigger trg_seed_email_contact_case_checklist
after insert on public.email_contact_cases
for each row execute function public.seed_email_contact_case_checklist();

alter table public.email_contact_companies enable row level security;
alter table public.email_contact_cases enable row level security;
alter table public.email_contact_case_messages enable row level security;
alter table public.email_contact_case_checklist_items enable row level security;
alter table public.email_contact_mailbox_sync_state enable row level security;

create policy "EmailContactCompanies: admin manage"
on public.email_contact_companies
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "EmailContactCases: admin manage"
on public.email_contact_cases
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "EmailContactCaseMessages: admin manage"
on public.email_contact_case_messages
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "EmailContactCaseChecklistItems: admin manage"
on public.email_contact_case_checklist_items
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "EmailContactMailboxSyncState: admin manage"
on public.email_contact_mailbox_sync_state
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
