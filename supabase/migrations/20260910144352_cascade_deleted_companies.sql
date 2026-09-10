-- A permanently deleted company must not leave a public registration behind.

create or replace function public.release_registration_stand_on_application_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.event_registration_stands
  set
    status = 'available',
    assigned_application_id = null,
    updated_at = now()
  where assigned_application_id = old.id;

  return old;
end;
$$;

drop trigger if exists trg_release_registration_stand_on_application_delete
on public.event_registration_applications;

create trigger trg_release_registration_stand_on_application_delete
before delete on public.event_registration_applications
for each row execute function public.release_registration_stand_on_application_delete();

-- Remove approved remnants from companies that were deleted under the old SET NULL rule.
delete from public.event_registration_applications application
where application.status = 'approved'
  and application.company_id is null
  and not exists (
    select 1
    from public.companies company
    where regexp_replace(coalesce(company.org_number, ''), '[[:space:]]+', '', 'g') =
      regexp_replace(application.org_number, '[[:space:]]+', '', 'g')
  );

alter table public.event_registration_applications
drop constraint if exists event_registration_applications_company_id_fkey;

alter table public.event_registration_applications
add constraint event_registration_applications_company_id_fkey
foreign key (company_id)
references public.companies(id)
on delete cascade;
