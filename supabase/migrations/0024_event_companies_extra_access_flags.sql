alter table public.event_companies
add column if not exists can_view_roi boolean not null default false;

alter table public.event_companies
add column if not exists can_view_leads boolean not null default false;
