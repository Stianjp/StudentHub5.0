alter table public.event_companies
add column if not exists category_tags text[] not null default '{}';
