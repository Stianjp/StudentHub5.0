import { PGlite } from "@electric-sql/pglite";
import { it } from "vitest";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
it("migrates legacy events and enforces publication, immutable quotes and independent catalog copies", async () => {
  const db = new PGlite();
  await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create function auth.uid() returns uuid language sql as $$select null::uuid$$;
create function public.is_admin(uuid) returns boolean language sql as $$select false$$;
create table events(id uuid primary key default gen_random_uuid(),name text,slug text,is_active boolean default true);
create table event_registration_campaigns(id uuid primary key default gen_random_uuid(),event_id uuid references events(id),is_published boolean default false,opens_at timestamptz,closes_at timestamptz);
create table event_registration_packages(id uuid primary key default gen_random_uuid(),campaign_id uuid references event_registration_campaigns(id),package_key text,public_name text,description text,mapped_package text,internal_capacity integer,is_active boolean default true,sort_order int default 0);
create table event_companies(id uuid primary key default gen_random_uuid(),company_id uuid,event_id uuid);
create table event_registration_applications(id uuid primary key default gen_random_uuid(),event_company_id uuid,campaign_id uuid,event_id uuid,requested_package_id uuid,requested_stand_id uuid,status text default 'pending',candidate_fields text[],candidate_fields_other text,approved_at timestamptz);
create table company_users(company_id uuid,user_id uuid,approved_at timestamptz);
alter table event_registration_campaigns enable row level security;
create policy "EventRegistrationCampaigns: public read published" on event_registration_campaigns for select using (true);
create policy "EventCompanies: select by member" on event_companies for select using (true);
create policy "EventCompanies: update by member" on event_companies for update using (true);
insert into events(id,name) values('00000000-0000-0000-0000-000000000001','Existing event');
insert into event_registration_campaigns(id,event_id) values('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001');
insert into event_registration_packages(id,campaign_id,public_name,mapped_package) values('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','Standard','standard');
`);
  await db.exec(
    readFileSync(
      "supabase/migrations/20261020171349_event_catalog_and_placement.sql",
      "utf8",
    ),
  );
  const event = "00000000-0000-0000-0000-000000000001",
    campaign = "00000000-0000-0000-0000-000000000002",
    pkg = "00000000-0000-0000-0000-000000000003";
  assert.equal(
    (await db.query("select count(*)::int as n from event_addons")).rows[0].n,
    5,
  );
  assert.equal(
    (await db.query("select price_ore from event_registration_packages"))
      .rows[0].price_ore,
    2000000,
  );
  assert.equal(
    (await db.query("select website_published from events")).rows[0]
      .website_published,
    true,
  );
  await db.query(
    "select set_event_publication($1,$2,true,true,null,null,false)",
    [event, campaign],
  );
  const ticket = (
    await db.query("select * from event_addons where kind='attendee_ticket'")
  ).rows[0];
  const snapshot = {
    version: 1,
    packageId: pkg,
    packageName: "Standard",
    packagePriceOre: 2000000,
    totalOre: 2000000,
    lines: [
      {
        id: ticket.id,
        name: ticket.name,
        unit: ticket.unit,
        unitPriceOre: 0,
        included: 2,
        extra: 0,
        kind: "attendee_ticket",
      },
    ],
  };
  const insert = (order = snapshot, stand = null) =>
    db.query(
      "insert into event_registration_applications(event_id,campaign_id,requested_package_id,order_snapshot,requested_stand_id) values($1,$2,$3,$4,$5)",
      [event, campaign, pkg, JSON.stringify(order), stand],
    );
  await insert();
  const registration=(await db.query<{id:string}>("insert into event_companies(event_id) values($1) returning id",[event])).rows[0].id;
  await db.query("update event_registration_applications set event_company_id=$1,candidate_fields=array['IT / Computer engineer']",[registration]);
  assert.equal((await db.query<{ordered_attendee_tickets:number|null}>("select ordered_attendee_tickets from event_companies where id=$1",[registration])).rows[0].ordered_attendee_tickets,null);
  await db.query("update event_registration_applications set status='approved'");
  await db.query("update event_registration_applications set status='approved'");
  assert.equal((await db.query<{ordered_attendee_tickets:number}>("select ordered_attendee_tickets from event_companies where id=$1",[registration])).rows[0].ordered_attendee_tickets,2);

  await assert.rejects(
    () => insert(snapshot, crypto.randomUUID()),
    /stand selection/,
  );
  await db.query(
    "update event_registration_packages set price_ore=2100000 where id=$1",
    [pkg],
  );
  await assert.rejects(() => insert(), /Prices changed/);
  await db.query(
    "update event_registration_packages set price_ore=2000000 where id=$1",
    [pkg],
  );
  await db.query(
    "select set_event_publication($1,$2,false,false,null,null,true)",
    [event, campaign],
  );
  await assert.rejects(() => insert(), /not available/);
  assert.equal(
    (
      await db.query(
        "select count(*)::int as n from event_registration_applications",
      )
    ).rows[0].n,
    1,
  );
  await db.query(
    "select set_event_publication($1,$2,true,true,now()+interval '1 day',null,false)",
    [event, campaign],
  );
  await assert.rejects(() => insert(), /not available/);
  const target = (
    await db.query(
      "insert into events(name) values('Copy target') returning id",
    )
  ).rows[0].id;
  const targetCampaign = (
    await db.query(
      "insert into event_registration_campaigns(event_id) values($1) returning id",
      [target],
    )
  ).rows[0].id;
  await db.query("select copy_event_catalog($1,$2)", [
    campaign,
    targetCampaign,
  ]);
  const copied = (
    await db.query(
      "select * from event_registration_packages where campaign_id=$1",
      [targetCampaign],
    )
  ).rows[0];
  assert.notEqual(copied.id, pkg);
  assert.equal(copied.price_ore, 2000000);
  assert.equal(Object.values(copied.included_quantities)[0], 2);
  assert.notEqual(Object.keys(copied.included_quantities)[0], ticket.id);
  await assert.rejects(
    () =>
      db.query("select copy_event_catalog($1,$2)", [campaign, targetCampaign]),
    /uten pakker/,
  );
  await db.query(
    "update event_registration_packages set price_ore=1 where id=$1",
    [pkg],
  );
  assert.equal(
    (
      await db.query(
        "select price_ore from event_registration_packages where id=$1",
        [copied.id],
      )
    ).rows[0].price_ore,
    2000000,
  );
  await assert.rejects(
    () =>
      db.query("update event_addons set is_active=true where id=$1", [
        ticket.id,
      ]),
    /check constraint/,
  );
  await db.close();
}, 30000);
