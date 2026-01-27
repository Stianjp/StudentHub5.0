alter table public.consents
add column if not exists updated_at timestamptz default now();

alter table public.consents
add column if not exists updated_by uuid references auth.users(id) on delete set null;
