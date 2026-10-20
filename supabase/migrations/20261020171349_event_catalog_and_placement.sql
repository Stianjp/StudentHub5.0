begin;
alter table public.events add column website_published boolean not null default false;
update public.events set website_published = is_active;
alter table public.events alter column is_active set default false;
alter table public.event_registration_packages
  add column price_ore bigint check (price_ore >= 0),
  add column included_quantities jsonb not null default '{}'::jsonb;
update public.event_registration_packages set price_ore = case mapped_package
  when 'standard' then 2000000 when 'silver' then 3000000 when 'gold' then 5000000 when 'platinum' then 6500000 end;
create table public.event_addons (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (length(trim(name)) > 0), description text,
  unit text not null default 'stk', unit_price_ore bigint check (unit_price_ore >= 0),
  is_active boolean not null default false, sort_order integer not null default 0,
  kind text not null default 'item' check (kind in ('item','attendee_ticket')),
  check (not is_active or unit_price_ore is not null)
);
create index event_addons_event_idx on public.event_addons(event_id);
create unique index event_addons_one_ticket_kind on public.event_addons(event_id) where kind = 'attendee_ticket';
alter table public.event_addons enable row level security;
grant select on public.event_addons to anon, authenticated;
grant all on public.event_addons to service_role;
grant insert, update, delete on public.event_addons to authenticated;
create policy "Admin manages event addons" on public.event_addons for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "Public reads active event addons" on public.event_addons for select to anon, authenticated
  using (is_active and exists (select 1 from public.events e where e.id = event_id and e.is_active));

-- Runs with the event writer's privileges, never as a privileged definer.
create function public.seed_event_addons() returns trigger language plpgsql security invoker set search_path = public as $$
begin
 insert into public.event_addons(event_id,name,unit,sort_order,kind) values
 (new.id,'Ståbord','stk',0,'item'), (new.id,'Vanlige bord','stk',1,'item'),
 (new.id,'Stoler','stk',2,'item'),(new.id,'Kaffe','person',3,'item'),
 (new.id,'Ekstra ansattbilletter','billett',4,'attendee_ticket');
 return new;
end $$;
revoke all on function public.seed_event_addons() from public, anon, authenticated;
create trigger seed_event_addons after insert on public.events for each row execute function public.seed_event_addons();
insert into public.event_addons(event_id,name,unit,sort_order,kind)
 select e.id,v.name,v.unit,v.sort_order,v.kind from public.events e cross join (values
 ('Ståbord','stk',0,'item'),('Vanlige bord','stk',1,'item'),('Stoler','stk',2,'item'),
 ('Kaffe','person',3,'item'),('Ekstra ansattbilletter','billett',4,'attendee_ticket')) v(name,unit,sort_order,kind);
-- Existing ticket allowances remain included when catalog ordering starts.
update public.event_registration_packages p set included_quantities = jsonb_build_object(a.id::text,
 case p.mapped_package when 'standard' then 2 when 'silver' then 3 when 'gold' then 6 when 'platinum' then 8 else 0 end)
 from public.event_registration_campaigns c join public.event_addons a on a.event_id=c.event_id and a.kind='attendee_ticket' where p.campaign_id=c.id;

alter table public.event_registration_applications add column order_snapshot jsonb;
alter table public.event_companies
 add column target_fields text[] not null default '{}', add column target_fields_other text,
 add column confirmed_area text,
 add column ordered_attendee_tickets integer check (ordered_attendee_tickets >= 0);
update public.event_companies ec set target_fields=a.candidate_fields, target_fields_other=a.candidate_fields_other
 from (select distinct on (event_company_id) event_company_id,candidate_fields,candidate_fields_other
 from public.event_registration_applications where status='approved' and event_company_id is not null
 order by event_company_id,approved_at desc nulls last) a where a.event_company_id=ec.id;

alter policy "EventRegistrationCampaigns: public read published" on public.event_registration_campaigns
 using (is_published and (opens_at is null or opens_at <= now()) and (closes_at is null or closes_at >= now())
 and exists (select 1 from public.events e where e.id=event_id and e.is_active));

-- Company membership must be correlated to the registration being changed.
alter policy "EventCompanies: select by member" on public.event_companies
 using (exists(select 1 from public.company_users cu where cu.company_id=event_companies.company_id and cu.user_id=auth.uid() and cu.approved_at is not null));
alter policy "EventCompanies: update by member" on public.event_companies
 using (exists(select 1 from public.company_users cu where cu.company_id=event_companies.company_id and cu.user_id=auth.uid() and cu.approved_at is not null))
 with check (exists(select 1 from public.company_users cu where cu.company_id=event_companies.company_id and cu.user_id=auth.uid() and cu.approved_at is not null));
create function public.protect_event_placement() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if current_user not in ('postgres','service_role') and not public.is_admin(auth.uid()) and
 (new.confirmed_area is distinct from old.confirmed_area or new.target_fields is distinct from old.target_fields
 or new.target_fields_other is distinct from old.target_fields_other or new.ordered_attendee_tickets is distinct from old.ordered_attendee_tickets) then
 raise exception 'Only administrators can change confirmed placement and ordered ticket allowances.';
 end if;
 return new;
end $$;
revoke all on function public.protect_event_placement() from public,anon,authenticated;
create trigger protect_event_placement before update on public.event_companies for each row execute function public.protect_event_placement();

-- Serialize publication changes and reject submissions from stale browser tabs.
create function public.guard_new_event_application() returns trigger language plpgsql security invoker set search_path=public as $$
declare c public.event_registration_campaigns; e public.events; p public.event_registration_packages; a public.event_addons; line jsonb;
begin
 if new.requested_stand_id is not null then raise exception 'Public stand selection is no longer available.'; end if;
 select * into c from public.event_registration_campaigns where id=new.campaign_id for share;
 select * into e from public.events where id=c.event_id for share;
 if not found or not e.is_active or not c.is_published or c.event_id<>new.event_id
 or c.opens_at > now() or c.closes_at < now() then raise exception 'This registration is not available.'; end if;
 select * into p from public.event_registration_packages where id=new.requested_package_id for share;
 if not found or not p.is_active or p.campaign_id<>c.id then raise exception 'This package is not available.'; end if;
 if new.order_snapshot is null or p.price_ore is null
 or (new.order_snapshot->>'packagePriceOre')::bigint is distinct from p.price_ore
 or new.order_snapshot->>'packageName' is distinct from p.public_name then raise exception 'Prices changed. Review the updated order before submitting.'; end if;
 for line in select value from jsonb_array_elements(new.order_snapshot->'lines') loop
 select * into a from public.event_addons where id=(line->>'id')::uuid and event_id=e.id for share;
 if not found or (not a.is_active and (line->>'extra')::int > 0)
 or coalesce(a.unit_price_ore,0) is distinct from (line->>'unitPriceOre')::bigint
 or a.name is distinct from line->>'name' or a.unit is distinct from line->>'unit'
 or coalesce((p.included_quantities->>a.id::text)::int,0) <> (line->>'included')::int then
 raise exception 'Prices changed. Review the updated order before submitting.'; end if;
 end loop;
 return new;
end $$;
revoke all on function public.guard_new_event_application() from public,anon,authenticated;
create trigger guard_new_event_application before insert on public.event_registration_applications for each row execute function public.guard_new_event_application();
-- Apply confirmed ticket quantities only when approval succeeds, atomically with that approval.
create function public.sync_approved_event_order() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.status='approved' and new.event_company_id is not null then
 update public.event_companies set target_fields=new.candidate_fields,target_fields_other=new.candidate_fields_other,
 ordered_attendee_tickets=case when new.order_snapshot is null then ordered_attendee_tickets else
 (select coalesce(sum((line->>'included')::int+(line->>'extra')::int),0) from jsonb_array_elements(new.order_snapshot->'lines') line where line->>'kind'='attendee_ticket') end
 where id=new.event_company_id and event_id=new.event_id;
 end if;
 return new;
end $$;
revoke all on function public.sync_approved_event_order() from public,anon,authenticated;
create trigger sync_approved_event_order after update on public.event_registration_applications for each row execute function public.sync_approved_event_order();

-- Server-only atomic publication. The server action authenticates the administrator.
create function public.set_event_publication(event_uuid uuid, campaign_uuid uuid, website boolean, registration boolean, opening timestamptz, closing timestamptz, unpublish boolean)
returns void language plpgsql security invoker set search_path=public as $$
begin
 perform 1 from public.events where id=event_uuid for update;
 if not found then raise exception 'Event not found'; end if;
 if unpublish then
   update public.events set is_active=false,website_published=false where id=event_uuid;
   update public.event_registration_campaigns set is_published=false where event_id=event_uuid;
   return;
 end if;
 if campaign_uuid is not null and not exists(select 1 from public.event_registration_campaigns where id=campaign_uuid and event_id=event_uuid) then raise exception 'Invalid campaign'; end if;
 if registration then
  if campaign_uuid is null or not exists(select 1 from public.event_registration_packages where campaign_id=campaign_uuid and is_active and price_ore is not null)
  or exists(select 1 from public.event_registration_packages where campaign_id=campaign_uuid and is_active and price_ore is null)
  then raise exception 'Sett opp aktive pakker med pris i Pakker og tillegg før påmelding åpnes.'; end if;
 end if;
 if opening is not null and closing is not null and opening>=closing then raise exception 'Lukking må være etter åpning.'; end if;
 update public.events set is_active=(website or registration or exists(
 select 1 from public.event_registration_campaigns where event_id=event_uuid and id is distinct from campaign_uuid and is_published
 )), website_published=website where id=event_uuid;
 if campaign_uuid is not null then
 update public.event_registration_campaigns set is_published=registration,opens_at=opening,closes_at=closing where id=campaign_uuid;
 end if;
end $$;
revoke all on function public.set_event_publication(uuid,uuid,boolean,boolean,timestamptz,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.set_event_publication(uuid,uuid,boolean,boolean,timestamptz,timestamptz,boolean) to service_role;

create function public.copy_event_catalog(source_campaign uuid, target_campaign uuid) returns void language plpgsql security invoker set search_path=public as $$
declare source_event uuid; target_event uuid; a public.event_addons; p public.event_registration_packages; new_id uuid; mapping jsonb := '{}'; counts jsonb; item record;
begin
 select event_id into source_event from public.event_registration_campaigns where id=source_campaign;
 select event_id into target_event from public.event_registration_campaigns where id=target_campaign for update;
 if source_event is null or target_event is null or source_event=target_event then raise exception 'Velg to ulike events.'; end if;
 if exists(select 1 from public.event_registration_packages existing_package join public.event_registration_campaigns existing_campaign on existing_campaign.id=existing_package.campaign_id where existing_campaign.event_id=target_event)
 or exists(select 1 from public.event_registration_applications where event_id=target_event) then raise exception 'Kopiering krever et event uten pakker og søknader.'; end if;
 delete from public.event_addons where event_id=target_event;
 for a in select * from public.event_addons where event_id=source_event loop
 new_id := gen_random_uuid(); mapping := mapping || jsonb_build_object(a.id::text,new_id::text);
 insert into public.event_addons values(new_id,target_event,a.name,a.description,a.unit,a.unit_price_ore,a.is_active,a.sort_order,a.kind);
 end loop;
 for p in select * from public.event_registration_packages where campaign_id=source_campaign loop
 counts := '{}';
 for item in select * from jsonb_each(p.included_quantities) loop
 if mapping ? item.key then counts := counts || jsonb_build_object(mapping->>item.key,item.value); end if;
 end loop;
 insert into public.event_registration_packages(campaign_id,package_key,public_name,description,mapped_package,internal_capacity,is_active,sort_order,price_ore,included_quantities)
 values(target_campaign,p.package_key,p.public_name,p.description,p.mapped_package,p.internal_capacity,p.is_active,p.sort_order,p.price_ore,counts);
 end loop;
end $$;
revoke all on function public.copy_event_catalog(uuid,uuid) from public,anon,authenticated;
grant execute on function public.copy_event_catalog(uuid,uuid) to service_role;
commit;
