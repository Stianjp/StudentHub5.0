alter table public.event_companies
add column if not exists stand_code text;

create table if not exists public.event_registration_campaigns (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  slug text not null unique,
  public_title text not null,
  public_subtitle text,
  public_description text,
  floorplan_image_path text,
  is_published boolean not null default false,
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_registration_packages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.event_registration_campaigns(id) on delete cascade,
  package_key text not null,
  public_name text not null,
  description text,
  mapped_package public.package_tier,
  internal_capacity integer,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, package_key),
  constraint event_registration_packages_capacity_nonnegative
    check (internal_capacity is null or internal_capacity >= 0)
);

create table if not exists public.event_registration_stands (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.event_registration_campaigns(id) on delete cascade,
  stand_code text not null,
  display_label text,
  package_tier public.package_tier not null,
  x numeric(6,2) not null,
  y numeric(6,2) not null,
  width numeric(6,2) not null,
  height numeric(6,2) not null,
  sort_order integer not null default 0,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, stand_code),
  constraint event_registration_stands_status_check
    check (status in ('available', 'disabled', 'assigned'))
);

create table if not exists public.event_registration_applications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.event_registration_campaigns(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  event_company_id uuid references public.event_companies(id) on delete set null,
  requested_package_id uuid references public.event_registration_packages(id) on delete set null,
  approved_package_id uuid references public.event_registration_packages(id) on delete set null,
  requested_stand_id uuid references public.event_registration_stands(id) on delete set null,
  approved_stand_id uuid references public.event_registration_stands(id) on delete set null,
  status text not null default 'pending',
  contact_first_name text not null,
  contact_last_name text not null,
  contact_email text not null,
  contact_phone text not null,
  contact_job_title text,
  company_name text not null,
  org_number text not null,
  country text not null,
  address text not null,
  city text not null,
  postal_code text not null,
  invoice_delivery_method text not null,
  invoice_email text,
  invoice_reference text,
  candidate_level text not null,
  candidate_fields text[] not null default '{}',
  candidate_fields_other text,
  stand_needs text[] not null default '{}',
  stand_needs_other text,
  notes text,
  logo_path text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_registration_applications_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint event_registration_applications_invoice_check
    check (invoice_delivery_method in ('ehf', 'email')),
  constraint event_registration_applications_candidate_level_check
    check (candidate_level in ('bachelor', 'master', 'both'))
);

alter table public.event_registration_stands
add column if not exists assigned_application_id uuid references public.event_registration_applications(id) on delete set null;

create table if not exists public.event_registration_portal_emails (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.event_registration_applications(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  unique (application_id, email)
);

create table if not exists public.company_portal_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  application_id uuid references public.event_registration_applications(id) on delete set null,
  email text not null,
  role text not null default 'member',
  status text not null default 'pending',
  invited_at timestamptz,
  accepted_at timestamptz,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, email),
  constraint company_portal_invites_status_check
    check (status in ('pending', 'invited', 'accepted', 'revoked'))
);

create index if not exists idx_event_registration_campaigns_event on public.event_registration_campaigns(event_id);
create index if not exists idx_event_registration_packages_campaign on public.event_registration_packages(campaign_id);
create index if not exists idx_event_registration_stands_campaign on public.event_registration_stands(campaign_id);
create index if not exists idx_event_registration_applications_campaign on public.event_registration_applications(campaign_id);
create index if not exists idx_event_registration_applications_event on public.event_registration_applications(event_id);
create index if not exists idx_event_registration_applications_status on public.event_registration_applications(status);
create index if not exists idx_company_portal_invites_email on public.company_portal_invites(email);

create trigger trg_event_registration_campaigns_updated_at
before update on public.event_registration_campaigns
for each row execute function public.set_updated_at();

create trigger trg_event_registration_packages_updated_at
before update on public.event_registration_packages
for each row execute function public.set_updated_at();

create trigger trg_event_registration_stands_updated_at
before update on public.event_registration_stands
for each row execute function public.set_updated_at();

create trigger trg_event_registration_applications_updated_at
before update on public.event_registration_applications
for each row execute function public.set_updated_at();

create trigger trg_company_portal_invites_updated_at
before update on public.company_portal_invites
for each row execute function public.set_updated_at();

alter table public.event_registration_campaigns enable row level security;
alter table public.event_registration_packages enable row level security;
alter table public.event_registration_stands enable row level security;
alter table public.event_registration_applications enable row level security;
alter table public.event_registration_portal_emails enable row level security;
alter table public.company_portal_invites enable row level security;

create policy "EventRegistrationCampaigns: public read published"
on public.event_registration_campaigns
for select
using (
  is_published = true
  and (opens_at is null or opens_at <= now())
  and (closes_at is null or closes_at >= now())
);

create policy "EventRegistrationCampaigns: admin manage"
on public.event_registration_campaigns
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "EventRegistrationPackages: public read published"
on public.event_registration_packages
for select
using (
  exists (
    select 1
    from public.event_registration_campaigns c
    where c.id = campaign_id
      and c.is_published = true
      and (c.opens_at is null or c.opens_at <= now())
      and (c.closes_at is null or c.closes_at >= now())
  )
);

create policy "EventRegistrationPackages: admin manage"
on public.event_registration_packages
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "EventRegistrationStands: public read published"
on public.event_registration_stands
for select
using (
  exists (
    select 1
    from public.event_registration_campaigns c
    where c.id = campaign_id
      and c.is_published = true
      and (c.opens_at is null or c.opens_at <= now())
      and (c.closes_at is null or c.closes_at >= now())
  )
);

create policy "EventRegistrationStands: admin manage"
on public.event_registration_stands
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "EventRegistrationApplications: admin manage"
on public.event_registration_applications
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "EventRegistrationPortalEmails: admin manage"
on public.event_registration_portal_emails
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "CompanyPortalInvites: admin manage"
on public.company_portal_invites
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-registration-assets',
  'event-registration-assets',
  false,
  6291456,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

update public.events
set registration_form_url = 'https://eventregister.oslostudenthub.no/student-connect-2026'
where lower(slug) = 'student-connect-2026';

with target_event as (
  select id
  from public.events
  where lower(slug) = 'student-connect-2026'
  limit 1
), upsert_campaign as (
  insert into public.event_registration_campaigns (
    event_id,
    slug,
    public_title,
    public_subtitle,
    public_description,
    floorplan_image_path,
    is_published,
    opens_at,
    closes_at
  )
  select
    id,
    'student-connect-2026',
    'Student Connect 2026',
    'Register your company for the fair and request portal access for your team.',
    'Complete the registration to request a stand, package and company portal access. OSH will review and approve the application before access is granted.',
    '/event-register/student-connect-2026-floorplan.png',
    true,
    '2025-09-01T00:00:00+02:00'::timestamptz,
    '2026-02-10T23:59:59+01:00'::timestamptz
  from target_event
  on conflict (slug) do update
  set
    public_title = excluded.public_title,
    public_subtitle = excluded.public_subtitle,
    public_description = excluded.public_description,
    floorplan_image_path = excluded.floorplan_image_path,
    is_published = excluded.is_published,
    opens_at = excluded.opens_at,
    closes_at = excluded.closes_at,
    updated_at = now()
  returning id
)
insert into public.event_registration_packages (
  campaign_id,
  package_key,
  public_name,
  description,
  mapped_package,
  internal_capacity,
  is_active,
  sort_order
)
select c.id, p.package_key, p.public_name, p.description, p.mapped_package, p.internal_capacity, true, p.sort_order
from (select id from upsert_campaign union all select id from public.event_registration_campaigns where slug = 'student-connect-2026' limit 1) c
cross join (
  values
    ('platinum', 'Platinum', 'Top-tier placement with maximum visibility.', 'platinum'::public.package_tier, 4, 10),
    ('gold_career_night', 'Gold with career night', 'Gold package with career night add-on.', 'gold'::public.package_tier, 7, 20),
    ('gold', 'Gold', 'Large stand placement with strong event visibility.', 'gold'::public.package_tier, 20, 30),
    ('silver', 'Silver', 'Solid placement and access to the fair.', 'silver'::public.package_tier, 30, 40),
    ('contact_me', 'I do not know yet, contact me', 'OSH will follow up and help you choose the right package.', null::public.package_tier, null::integer, 50)
) as p(package_key, public_name, description, mapped_package, internal_capacity, sort_order)
on conflict (campaign_id, package_key) do update
set
  public_name = excluded.public_name,
  description = excluded.description,
  mapped_package = excluded.mapped_package,
  internal_capacity = excluded.internal_capacity,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

with campaign as (
  select id
  from public.event_registration_campaigns
  where slug = 'student-connect-2026'
  limit 1
)
insert into public.event_registration_stands (
  campaign_id,
  stand_code,
  display_label,
  package_tier,
  x,
  y,
  width,
  height,
  sort_order,
  status
)
select c.id, s.stand_code, s.display_label, s.package_tier, s.x, s.y, s.width, s.height, s.sort_order, 'available'
from campaign c
cross join (
  values
    ('Platinum 1', 'Platinum 1', 'platinum'::public.package_tier, 22.0, 46.0, 9.5, 4.4, 10),
    ('Platinum 2', 'Platinum 2', 'platinum'::public.package_tier, 33.0, 46.0, 9.5, 4.4, 20),
    ('Platinum 3', 'Platinum 3', 'platinum'::public.package_tier, 44.0, 46.0, 9.5, 4.4, 30),
    ('Platinum 4', 'Platinum 4', 'platinum'::public.package_tier, 55.0, 46.0, 9.5, 4.4, 40),
    ('Gold 5', 'Gold 5', 'gold'::public.package_tier, 16.0, 54.0, 8.0, 4.8, 50),
    ('Gold 6', 'Gold 6', 'gold'::public.package_tier, 25.0, 54.0, 8.0, 4.8, 60),
    ('Gold 7', 'Gold 7', 'gold'::public.package_tier, 41.0, 54.0, 8.0, 4.8, 70),
    ('Gold 8', 'Gold 8', 'gold'::public.package_tier, 50.0, 54.0, 8.0, 4.8, 80),
    ('Silver 1', 'Silver 1', 'silver'::public.package_tier, 5.0, 50.0, 6.5, 4.0, 90),
    ('Silver 2', 'Silver 2', 'silver'::public.package_tier, 5.0, 55.0, 6.5, 4.0, 100),
    ('Silver 3', 'Silver 3', 'silver'::public.package_tier, 5.0, 60.0, 6.5, 4.0, 110),
    ('Silver 4', 'Silver 4', 'silver'::public.package_tier, 5.0, 65.0, 6.5, 4.0, 120),
    ('Silver 5', 'Silver 5', 'silver'::public.package_tier, 5.0, 70.0, 6.5, 4.0, 130),
    ('Silver 6', 'Silver 6', 'silver'::public.package_tier, 16.5, 60.0, 6.0, 4.0, 140),
    ('Silver 7', 'Silver 7', 'silver'::public.package_tier, 25.0, 60.0, 6.0, 4.0, 150),
    ('Silver 8', 'Silver 8', 'silver'::public.package_tier, 16.5, 65.0, 6.0, 4.0, 160),
    ('Silver 9', 'Silver 9', 'silver'::public.package_tier, 25.0, 65.0, 6.0, 4.0, 170),
    ('Silver 10', 'Silver 10', 'silver'::public.package_tier, 41.0, 61.0, 6.0, 4.0, 180),
    ('Silver 11', 'Silver 11', 'silver'::public.package_tier, 41.0, 66.0, 6.0, 4.0, 190),
    ('Silver 12', 'Silver 12', 'silver'::public.package_tier, 49.0, 61.0, 6.0, 4.0, 200),
    ('Silver 13', 'Silver 13', 'silver'::public.package_tier, 49.0, 66.0, 6.0, 4.0, 210),
    ('Silver 14', 'Silver 14', 'silver'::public.package_tier, 66.0, 50.0, 6.0, 4.2, 220),
    ('Silver 15', 'Silver 15', 'silver'::public.package_tier, 66.0, 55.0, 6.0, 4.2, 230),
    ('Silver 16', 'Silver 16', 'silver'::public.package_tier, 66.0, 60.0, 6.0, 4.2, 240),
    ('Silver 17', 'Silver 17', 'silver'::public.package_tier, 66.0, 65.0, 6.0, 4.2, 250),
    ('Gold 1', 'Gold 1', 'gold'::public.package_tier, 8.0, 73.5, 11.0, 4.8, 260),
    ('Gold 2', 'Gold 2', 'gold'::public.package_tier, 24.0, 73.5, 11.0, 4.8, 270),
    ('Gold 3', 'Gold 3', 'gold'::public.package_tier, 40.0, 73.5, 11.0, 4.8, 280),
    ('Gold 4', 'Gold 4', 'gold'::public.package_tier, 56.0, 73.5, 11.0, 4.8, 290),
    ('Silver 18', 'Silver 18', 'silver'::public.package_tier, 46.0, 82.0, 6.0, 3.5, 300),
    ('Silver 19', 'Silver 19', 'silver'::public.package_tier, 54.0, 82.0, 6.0, 3.5, 310),
    ('Silver 20', 'Silver 20', 'silver'::public.package_tier, 66.0, 82.0, 6.0, 3.5, 320)
) as s(stand_code, display_label, package_tier, x, y, width, height, sort_order)
on conflict (campaign_id, stand_code) do update
set
  display_label = excluded.display_label,
  package_tier = excluded.package_tier,
  x = excluded.x,
  y = excluded.y,
  width = excluded.width,
  height = excluded.height,
  sort_order = excluded.sort_order,
  updated_at = now();
