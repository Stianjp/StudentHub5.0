create policy "EventCompanies: update by member"
on public.event_companies
for update
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_id
      and cu.user_id = auth.uid()
      and cu.approved_at is not null
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_id
      and cu.user_id = auth.uid()
      and cu.approved_at is not null
  )
);
