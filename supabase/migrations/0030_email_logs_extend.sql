-- Extend email_logs with batch_id and template_id for bulk send tracking

alter table public.email_logs
  add column if not exists batch_id    uuid,
  add column if not exists template_id uuid references public.email_templates(id) on delete set null;

create index if not exists idx_email_logs_batch_id
  on public.email_logs(batch_id)
  where batch_id is not null;
