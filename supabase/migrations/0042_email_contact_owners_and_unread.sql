alter table public.email_contact_companies
  add column if not exists owner_profile_id uuid null references public.profiles(id) on delete set null;

create index if not exists idx_email_contact_companies_owner
  on public.email_contact_companies(owner_profile_id);

alter table public.email_contact_case_messages
  add column if not exists is_read boolean not null default false,
  add column if not exists read_at timestamptz null,
  add column if not exists read_by uuid null references public.profiles(id) on delete set null;

create index if not exists idx_email_contact_case_messages_case_unread
  on public.email_contact_case_messages(case_id, direction, is_read);

update public.email_contact_case_messages
set
  is_read = true,
  read_at = coalesce(read_at, coalesce(sent_at, received_at, created_at))
where direction <> 'inbound';
