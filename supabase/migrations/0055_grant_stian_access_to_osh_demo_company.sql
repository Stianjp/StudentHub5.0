-- Grants stian@oslostudenthub.no approved company-portal access
-- to the Oslo Student Hub demo company used for guides.

insert into public.company_users (
  company_id,
  user_id,
  role,
  approved_at
)
select
  c.id,
  u.id,
  'member',
  now()
from public.companies c
join auth.users u
  on lower(u.email) = lower('stian@oslostudenthub.no')
where lower(c.name) = lower('Oslo Student Hub')
  and c.org_number = '999999999'
on conflict (company_id, user_id) do update
set
  role = excluded.role,
  approved_at = coalesce(public.company_users.approved_at, excluded.approved_at);

insert into public.company_portal_invites (
  company_id,
  application_id,
  email,
  status,
  user_id,
  accepted_at
)
select
  c.id,
  null,
  'stian@oslostudenthub.no',
  'accepted',
  u.id,
  now()
from public.companies c
join auth.users u
  on lower(u.email) = lower('stian@oslostudenthub.no')
where lower(c.name) = lower('Oslo Student Hub')
  and c.org_number = '999999999'
  and not exists (
    select 1
    from public.company_portal_invites i
    where i.company_id = c.id
      and lower(i.email) = lower('stian@oslostudenthub.no')
  );
