create or replace function public.has_platinum_access(uid uuid, event_uuid uuid, company_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_companies ec
    where ec.event_id = event_uuid
      and ec.company_id = company_uuid
      and ec.package = 'platinum'
      and (ec.access_from is null or ec.access_from <= now())
      and (ec.access_until is null or ec.access_until >= now())
      and (
        public.is_admin(uid)
        or exists (
          select 1
          from public.company_users cu
          where cu.company_id = ec.company_id
            and cu.user_id = uid
            and cu.approved_at is not null
        )
      )
  );
$$;
