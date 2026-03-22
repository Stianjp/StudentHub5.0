-- Email templates with variable substitution support

create table if not exists public.email_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  subject    text not null,
  html_body  text not null,
  variables  text[] not null default '{}',
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_email_templates_updated_at
before update on public.email_templates
for each row execute function public.set_updated_at();

alter table public.email_templates enable row level security;

create policy "EmailTemplates: admin full access"
on public.email_templates for all to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
