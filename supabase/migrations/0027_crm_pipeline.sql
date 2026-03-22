-- CRM pipeline entries table (replaces Google Sheets CRM)

create type public.crm_pipeline_stage as enum (
  'Kontaktet', 'Venter svar', 'Dialog', 'Påmeldt', 'Tapt'
);

create table if not exists public.crm_pipeline_entries (
  id                   uuid primary key default gen_random_uuid(),
  lead_id              text not null unique,
  company              text not null,
  contact_name         text not null default '',
  contact_email        text not null default '',
  subject              text not null default '',
  thread_id            text not null default '',
  source_message_id    text not null default '',
  sent_at              timestamptz,
  snooze_until         timestamptz,
  sequence_step        text not null default '',
  lead_status          text not null default 'waiting',
  stop_reason          text not null default '',
  company_status       public.crm_pipeline_stage not null default 'Kontaktet',
  event_name           text not null default '',
  temperature          text not null default '',
  pipeline_value       numeric(12,2) not null default 0,
  company_channel_name text not null default '',
  company_channel_id   text not null default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_crm_entries_waiting
  on public.crm_pipeline_entries(lead_status, snooze_until)
  where lead_status = 'waiting';

create index if not exists idx_crm_entries_company_event
  on public.crm_pipeline_entries(company, event_name);

create index if not exists idx_crm_entries_company_status
  on public.crm_pipeline_entries(company_status);

create trigger trg_crm_pipeline_entries_updated_at
before update on public.crm_pipeline_entries
for each row execute function public.set_updated_at();

alter table public.crm_pipeline_entries enable row level security;

create policy "CrmPipelineEntries: admin full access"
on public.crm_pipeline_entries
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
