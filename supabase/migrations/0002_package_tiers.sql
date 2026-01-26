-- Update package tiers
-- Adds new enum values and updates defaults.

do $$
begin
  alter type public.package_tier add value if not exists 'standard';
  alter type public.package_tier add value if not exists 'silver';
  alter type public.package_tier add value if not exists 'gold';
exception when duplicate_object then null;
end $$;

-- migrate existing data
update public.event_companies set package = 'standard' where package = 'basic';
update public.event_companies set package = 'silver' where package = 'pro';

alter table public.event_companies alter column package set default 'standard';

-- ensure access table values match
update public.event_companies set package = 'platinum' where package = 'platinum';
