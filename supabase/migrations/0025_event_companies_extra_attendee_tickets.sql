alter table public.event_companies
add column if not exists extra_attendee_tickets integer not null default 0;

alter table public.event_companies
drop constraint if exists event_companies_extra_attendee_tickets_nonnegative;

alter table public.event_companies
add constraint event_companies_extra_attendee_tickets_nonnegative
check (extra_attendee_tickets >= 0);
