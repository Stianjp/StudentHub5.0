alter table public.companies
add column if not exists recruitment_years_bachelor int[] not null default '{}',
add column if not exists recruitment_years_master int[] not null default '{}';
