alter table public.events
add column if not exists ticket_limit int;
