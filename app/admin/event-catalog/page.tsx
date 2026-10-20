import type { TableRow } from "@/lib/types/database";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { includedQuantities } from "@/lib/event-order";
import {
  saveCatalogAddon,
  saveCatalogPackage,
  copyEventCatalog,
} from "@/app/admin/event-management-actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default async function EventCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("admin");
  const params = await searchParams;
  const db = createAdminSupabaseClient();
  const [{ data: rawEvents, error: ee }, { data: rawCampaigns, error: ce }] =
    await Promise.all([
      db
        .from("events")
        .select("id,name")
        .order("starts_at", { ascending: false }),
      db
        .from("event_registration_campaigns")
        .select("id,event_id,public_title")
        .order("created_at"),
    ]);
  if (ee) throw ee;
  if (ce) throw ce;
  const events = rawEvents as Pick<TableRow<"events">, "id" | "name">[] | null;
  const campaigns = rawCampaigns as
    | Pick<
        TableRow<"event_registration_campaigns">,
        "id" | "event_id" | "public_title"
      >[]
    | null;
  const eventId =
    events?.find((e) => e.id === params.eventId)?.id ?? events?.[0]?.id;
  const choices = campaigns?.filter((c) => c.event_id === eventId) ?? [];
  const campaign =
    choices.find((c) => c.id === params.campaignId) ?? choices[0];
  const [{ data: rawAddons, error: ae }, { data: rawPackages, error: pe }] =
    await Promise.all([
      db
        .from("event_addons")
        .select("*")
        .eq("event_id", eventId ?? "")
        .order("sort_order"),
      campaign
        ? db
            .from("event_registration_packages")
            .select("*")
            .eq("campaign_id", campaign.id)
            .order("sort_order")
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (ae && eventId) throw ae;
  if (pe) throw pe;
  const addons = rawAddons as TableRow<"event_addons">[] | null;
  const packages = rawPackages as
    TableRow<"event_registration_packages">[] | null;
  const returnTo = `/admin/event-catalog?eventId=${eventId}${campaign ? `&campaignId=${campaign.id}` : ""}`;
  const hidden = (
    <>
      <input type="hidden" name="eventId" value={eventId ?? ""} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="campaignId" value={campaign?.id ?? ""} />
    </>
  );
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-bold text-primary">Pakker og tillegg</h1>
      <p>
        Priser i NOK ekskl. mva. Endringer gjelder nye bestillinger. Innsendte
        bestillinger beholder sine priser.
      </p>
      {params.error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-700 p-4 text-red-800"
        >
          {params.error}
        </p>
      ) : null}
      {params.saved ? <p role="status">Endringene er lagret.</p> : null}
      <form className="flex flex-wrap items-end gap-3" method="get">
        <label>
          Event
          <Select name="eventId" defaultValue={eventId}>
            {events?.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
        </label>
        <label>
          Kampanje
          <Select name="campaignId" defaultValue={campaign?.id}>
            {choices.map((c) => (
              <option key={c.id} value={c.id}>
                {c.public_title}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit">Vis oppsett</Button>
      </form>
      {eventId ? (
        <Link className="underline" href={`/admin/events/${eventId}`}>
          Til event og publisering
        </Link>
      ) : (
        <p>Opprett et event først.</p>
      )}
      {!campaign && eventId ? (
        <Card>
          Opprett en registreringskampanje i{" "}
          <Link
            className="underline"
            href={`/admin/events/${eventId}/registration`}
          >
            eventets påmeldingsoppsett
          </Link>{" "}
          før du legger til pakker.
        </Card>
      ) : null}
      {campaign ? (
        <section className="grid gap-4">
          <h2 className="text-2xl font-bold">Pakker</h2>
          {[...(packages ?? []), null].map((pkg) => (
            <Card key={pkg?.id ?? "new"}>
              <h3 className="text-xl font-bold">
                {pkg?.public_name ?? "Ny pakke"}
              </h3>
              <form
                action={saveCatalogPackage}
                className="mt-4 grid gap-4 md:grid-cols-2"
              >
                {hidden}
                <input type="hidden" name="id" value={pkg?.id ?? ""} />
                <label>
                  Navn
                  <Input name="name" required defaultValue={pkg?.public_name} />
                </label>
                <label>
                  Pakkenøkkel
                  <Input
                    name="packageKey"
                    required
                    defaultValue={pkg?.package_key}
                  />
                </label>
                <label>
                  Tilgangsnivå
                  <Select
                    name="mappedPackage"
                    defaultValue={pkg?.mapped_package ?? "standard"}
                  >
                    {["standard", "silver", "gold", "platinum"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </Select>
                </label>
                <label>
                  Pris (kr ekskl. mva)
                  <Input
                    name="price"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={
                      pkg?.price_ore == null ? "" : pkg.price_ore / 100
                    }
                  />
                </label>
                <label className="md:col-span-2">
                  Beskrivelse
                  <Textarea
                    name="description"
                    defaultValue={pkg?.description ?? ""}
                  />
                </label>
                <label>
                  Kapasitet (valgfritt)
                  <Input
                    name="capacity"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={pkg?.internal_capacity ?? ""}
                  />
                </label>
                <label>
                  Rekkefølge
                  <Input
                    name="sortOrder"
                    type="number"
                    step={1}
                    defaultValue={pkg?.sort_order ?? 0}
                  />
                </label>
                <fieldset className="grid gap-3 md:col-span-2 md:grid-cols-2">
                  <legend className="mb-2 font-bold">Inkludert i pakken</legend>
                  {addons?.map((a) => (
                    <label key={a.id}>
                      {a.name} ({a.unit})
                      <Input
                        type="number"
                        min={0}
                        max={10000}
                        step={1}
                        name={`included:${a.id}`}
                        defaultValue={
                          includedQuantities(pkg?.included_quantities)[a.id] ??
                          0
                        }
                      />
                    </label>
                  ))}
                </fieldset>
                <label className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={pkg?.is_active ?? false}
                  />
                  Aktiv pakke
                </label>
                <Button type="submit">
                  {pkg ? "Lagre pakke" : "Opprett pakke"}
                </Button>
              </form>
            </Card>
          ))}
          <Card>
            <h3 className="text-xl font-bold">Kopier fra et annet event</h3>
            <p className="my-2">
              Kan brukes før dette eventet har pakker eller søknader. Tillegg og
              pakker kopieres uavhengig av originalen.
            </p>
            <form
              action={copyEventCatalog}
              className="flex flex-wrap items-end gap-3"
            >
              {hidden}
              <label>
                Kilde
                <Select name="sourceCampaign" required>
                  {campaigns
                    ?.filter((c) => c.event_id !== eventId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {events?.find((e) => e.id === c.event_id)?.name} —{" "}
                        {c.public_title}
                      </option>
                    ))}
                </Select>
              </label>
              <Button type="submit">Kopier katalog</Button>
            </form>
          </Card>
        </section>
      ) : null}
      {eventId ? (
        <section className="grid gap-4">
          <h2 className="text-2xl font-bold">Tillegg</h2>
          <p>
            Tillegg uten pris holdes skjult. Inkluderte mengder vises som del av
            pakken selv om ekstra enheter ikke er til salgs.
          </p>
          {[...(addons ?? []), null].map((a) => (
            <Card key={a?.id ?? "new"}>
              <h3 className="text-xl font-bold">{a?.name ?? "Nytt tillegg"}</h3>
              <form
                action={saveCatalogAddon}
                className="mt-4 grid gap-4 md:grid-cols-2"
              >
                {hidden}
                <input type="hidden" name="id" value={a?.id ?? ""} />
                <label>
                  Navn
                  <Input name="name" required defaultValue={a?.name} />
                </label>
                <label>
                  Enhet
                  <Input name="unit" required defaultValue={a?.unit ?? "stk"} />
                </label>
                <label>
                  Pris per enhet (kr ekskl. mva)
                  <Input
                    name="price"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={
                      a?.unit_price_ore == null ? "" : a.unit_price_ore / 100
                    }
                  />
                </label>
                <label>
                  Rekkefølge
                  <Input
                    name="sortOrder"
                    type="number"
                    step={1}
                    defaultValue={a?.sort_order ?? 0}
                  />
                </label>
                <label className="md:col-span-2">
                  Beskrivelse
                  <Textarea
                    name="description"
                    defaultValue={a?.description ?? ""}
                  />
                </label>
                <label>
                  Type
                  <Select name="kind" defaultValue={a?.kind ?? "item"}>
                    <option value="item">Utstyr / servering</option>
                    <option value="attendee_ticket">
                      Ansattbilletter (én type per event)
                    </option>
                  </Select>
                </label>
                <label className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={a?.is_active ?? false}
                  />
                  Aktivt tillegg
                </label>
                <Button type="submit">
                  {a ? "Lagre tillegg" : "Opprett tillegg"}
                </Button>
              </form>
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  );
}
