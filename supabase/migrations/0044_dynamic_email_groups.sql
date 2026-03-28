do $$
begin
  create type public.email_group_sync_mode as enum ('manual', 'dynamic_registration');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.email_group_member_source as enum ('manual', 'dynamic_registration', 'registration_auto');
exception
  when duplicate_object then null;
end $$;

alter table public.email_groups
  add column if not exists sync_mode public.email_group_sync_mode not null default 'manual',
  add column if not exists dynamic_registration_campaign_id uuid references public.event_registration_campaigns(id) on delete set null,
  add column if not exists dynamic_package_tier public.package_tier,
  add column if not exists dynamic_pipeline_stage public.crm_pipeline_stage;

alter table public.email_group_members
  add column if not exists source public.email_group_member_source not null default 'manual';

create index if not exists idx_email_groups_sync_mode
  on public.email_groups(sync_mode, dynamic_registration_campaign_id);

alter table public.email_groups
  drop constraint if exists email_groups_dynamic_company_only;

alter table public.email_groups
  add constraint email_groups_dynamic_company_only
  check (
    sync_mode <> 'dynamic_registration'
    or member_type = 'company'
  );

alter table public.email_groups
  drop constraint if exists email_groups_dynamic_requires_campaign;

alter table public.email_groups
  add constraint email_groups_dynamic_requires_campaign
  check (
    sync_mode <> 'dynamic_registration'
    or dynamic_registration_campaign_id is not null
  );

with sc_campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
)
update public.email_groups
set
  sync_mode = 'dynamic_registration',
  dynamic_registration_campaign_id = sc_campaign.id,
  dynamic_package_tier = case
    when lower(public.email_groups.name) = lower('SC-Gold-Bedrifter') then 'gold'::public.package_tier
    when lower(public.email_groups.name) = lower('SC-Platinum-Bedrifter') then 'platinum'::public.package_tier
    when lower(public.email_groups.name) = lower('SC-Silver-bedrfiter') then 'silver'::public.package_tier
    when lower(public.email_groups.name) = lower('SC-Standard-bedrfiter') then 'standard'::public.package_tier
    else null
  end,
  dynamic_pipeline_stage = null
from sc_campaign
where lower(public.email_groups.name) in (
  lower('Alle bedrifter Student Connect 2026'),
  lower('SC-Gold-Bedrifter'),
  lower('SC-Platinum-Bedrifter'),
  lower('SC-Silver-bedrfiter'),
  lower('SC-Standard-bedrfiter')
)
  and public.email_groups.member_type = 'company';
