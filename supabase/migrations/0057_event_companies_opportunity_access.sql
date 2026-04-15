alter table public.event_companies
add column if not exists can_publish_jobs boolean not null default false;

alter table public.event_companies
add column if not exists can_publish_thesis boolean not null default false;
