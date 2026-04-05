alter table public.email_templates
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_content_type text;

insert into storage.buckets (id, name, public)
values ('email-template-assets', 'email-template-assets', false)
on conflict (id) do nothing;
