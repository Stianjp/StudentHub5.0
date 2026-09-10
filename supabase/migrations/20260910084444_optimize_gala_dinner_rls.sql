-- Cache the authenticated user lookup once per statement in gala dinner policies.

drop policy if exists "CrmGalaDinnerCompanies: admin full access"
on public.crm_gala_dinner_companies;

create policy "CrmGalaDinnerCompanies: admin full access"
on public.crm_gala_dinner_companies
for all
to authenticated
using ((select public.is_admin((select auth.uid()))))
with check ((select public.is_admin((select auth.uid()))));

drop policy if exists "CrmGalaDinnerAttendees: admin full access"
on public.crm_gala_dinner_attendees;

create policy "CrmGalaDinnerAttendees: admin full access"
on public.crm_gala_dinner_attendees
for all
to authenticated
using ((select public.is_admin((select auth.uid()))))
with check ((select public.is_admin((select auth.uid()))));
