create policy "Companies: update by member"
on public.companies
for update
to authenticated
using (
  public.is_admin(auth.uid()) or
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = companies.id
      and cu.user_id = auth.uid()
      and cu.approved_at is not null
  )
)
with check (
  public.is_admin(auth.uid()) or
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = companies.id
      and cu.user_id = auth.uid()
      and cu.approved_at is not null
  )
);
