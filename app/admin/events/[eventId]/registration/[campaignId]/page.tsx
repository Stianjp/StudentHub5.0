import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { getAdminRegistrationCampaignDetail } from "@/lib/event-registration";
import {
  saveRegistrationCampaign,
  saveRegistrationPackage,
  saveRegistrationStand,
} from "@/app/admin/event-registration-actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ eventId: string; campaignId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function statusLabel(status: string) {
  if (status === "approved") return "Godkjent";
  if (status === "rejected") return "Avslått";
  return "Venter";
}

function statusClass(status: string) {
  if (status === "approved") return "bg-success/15 text-success";
  if (status === "rejected") return "bg-error/15 text-error";
  return "bg-secondary/20 text-primary";
}

export default async function AdminRegistrationCampaignDetailPage({ params, searchParams }: PageProps) {
  await requireRole("admin");
  const { eventId, campaignId } = await params;
  const search = (await (searchParams ?? Promise.resolve({}))) as Record<string, string | string[] | undefined>;
  const saved = search.saved === "1";
  const errorMessage = typeof search.error === "string" ? decodeURIComponent(search.error) : "";
  const detail = await getAdminRegistrationCampaignDetail(campaignId);
  const returnTo = `/admin/events/${eventId}/registration/${campaignId}`;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Kampanje"
        title={detail.campaign.public_title}
        description="Vedlikehold offentlig tekst, pakker, stands og følg innsendte søknader."
        actions={
          <div className="flex items-center gap-3">
            <Link className="text-sm font-semibold text-primary/70 transition hover:text-primary" href={`/admin/events/${eventId}/registration`}>
              Tilbake til kampanjer
            </Link>
            <a
              className="button-link text-xs"
              href={`https://eventregister.oslostudenthub.no/${detail.campaign.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              Åpne offentlig side
            </a>
          </div>
        }
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">Oppdatering lagret.</Card>
      ) : null}
      {errorMessage ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">{errorMessage}</Card>
      ) : null}

      <Card className="grid gap-4">
        <h3 className="text-lg font-bold text-primary">Kampanjeinnstillinger</h3>
        <form action={saveRegistrationCampaign} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="campaignId" value={campaignId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="text-sm font-semibold text-primary">
            Slug
            <Input name="slug" required defaultValue={detail.campaign.slug} />
          </label>
          <label className="text-sm font-semibold text-primary">
            Offentlig tittel
            <Input name="publicTitle" required defaultValue={detail.campaign.public_title} />
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Undertittel
            <Input name="publicSubtitle" defaultValue={detail.campaign.public_subtitle ?? ""} />
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Beskrivelse
            <Textarea name="publicDescription" rows={4} defaultValue={detail.campaign.public_description ?? ""} />
          </label>
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Floorplan image path
            <Input name="floorplanImagePath" defaultValue={detail.campaign.floorplan_image_path ?? ""} />
          </label>
          <label className="text-sm font-semibold text-primary">
            Åpner
            <Input name="opensAt" type="datetime-local" defaultValue={toDateTimeLocal(detail.campaign.opens_at)} />
          </label>
          <label className="text-sm font-semibold text-primary">
            Lukker
            <Input name="closesAt" type="datetime-local" defaultValue={toDateTimeLocal(detail.campaign.closes_at)} />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-primary md:col-span-2">
            <input type="checkbox" name="isPublished" defaultChecked={detail.campaign.is_published} className="h-4 w-4" />
            Kampanjen er publisert
          </label>
          <Button type="submit" className="md:col-span-2">Lagre kampanje</Button>
        </form>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-primary">Pakker</h3>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {detail.packages.length} stk
            </span>
          </div>
          <div className="grid gap-3">
            {detail.packages.map((pkg) => (
              <form key={pkg.id} action={saveRegistrationPackage} className="grid gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="campaignId" value={campaignId} />
                <input type="hidden" name="packageId" value={pkg.id} />
                <input type="hidden" name="slug" value={detail.campaign.slug} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-semibold text-primary">
                    Package key
                    <Input name="packageKey" required defaultValue={pkg.package_key} />
                  </label>
                  <label className="text-sm font-semibold text-primary">
                    Public name
                    <Input name="publicName" required defaultValue={pkg.public_name} />
                  </label>
                  <label className="text-sm font-semibold text-primary md:col-span-2">
                    Description
                    <Textarea name="description" rows={2} defaultValue={pkg.description ?? ""} />
                  </label>
                  <label className="text-sm font-semibold text-primary">
                    Mapped package
                    <Select name="mappedPackage" defaultValue={pkg.mapped_package ?? ""}>
                      <option value="">Manuell oppfølging</option>
                      <option value="standard">Standard</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                    </Select>
                  </label>
                  <label className="text-sm font-semibold text-primary">
                    Internal capacity
                    <Input name="internalCapacity" type="number" min="0" defaultValue={pkg.internal_capacity ?? ""} />
                  </label>
                  <label className="text-sm font-semibold text-primary">
                    Sort order
                    <Input name="sortOrder" type="number" defaultValue={pkg.sort_order} />
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <input type="checkbox" name="isActive" defaultChecked={pkg.is_active} className="h-4 w-4" />
                    Aktiv pakke
                  </label>
                </div>
                <Button type="submit">Lagre pakke</Button>
              </form>
            ))}
          </div>
          <form action={saveRegistrationPackage} className="grid gap-3 rounded-2xl border border-dashed border-primary/20 p-4">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="campaignId" value={campaignId} />
            <input type="hidden" name="slug" value={detail.campaign.slug} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <h4 className="text-sm font-bold text-primary">Legg til ny pakke</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <Input name="packageKey" required placeholder="package-key" />
              <Input name="publicName" required placeholder="Public package name" />
              <Textarea name="description" rows={2} placeholder="Description" className="md:col-span-2" />
              <Select name="mappedPackage" defaultValue="">
                <option value="">Manuell oppfølging</option>
                <option value="standard">Standard</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </Select>
              <Input name="internalCapacity" type="number" min="0" placeholder="Capacity" />
              <Input name="sortOrder" type="number" defaultValue="0" />
              <label className="flex items-center gap-2 text-sm font-semibold text-primary">
                <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" />
                Aktiv pakke
              </label>
            </div>
            <Button type="submit">Opprett pakke</Button>
          </form>
        </Card>

        <Card className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-primary">Stands og hotspots</h3>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {detail.stands.length} stk
            </span>
          </div>
          <div className="max-h-[900px] overflow-y-auto pr-1">
            <div className="grid gap-3">
              {detail.stands.map((stand) => (
                <form key={stand.id} action={saveRegistrationStand} className="grid gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="campaignId" value={campaignId} />
                  <input type="hidden" name="standId" value={stand.id} />
                  <input type="hidden" name="slug" value={detail.campaign.slug} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm font-semibold text-primary">
                      Stand code
                      <Input name="standCode" required defaultValue={stand.stand_code} />
                    </label>
                    <label className="text-sm font-semibold text-primary">
                      Display label
                      <Input name="displayLabel" defaultValue={stand.display_label ?? ""} />
                    </label>
                    <label className="text-sm font-semibold text-primary">
                      Package tier
                      <Select name="packageTier" defaultValue={stand.package_tier}>
                        <option value="standard">Standard</option>
                        <option value="silver">Silver</option>
                        <option value="gold">Gold</option>
                        <option value="platinum">Platinum</option>
                      </Select>
                    </label>
                    <label className="text-sm font-semibold text-primary">
                      Status
                      <Select name="status" defaultValue={stand.status}>
                        <option value="available">Available</option>
                        <option value="disabled">Disabled</option>
                        <option value="assigned">Assigned</option>
                      </Select>
                    </label>
                    <label className="text-sm font-semibold text-primary">
                      X (%)
                      <Input name="x" type="number" step="0.1" min="0" max="100" defaultValue={stand.x} />
                    </label>
                    <label className="text-sm font-semibold text-primary">
                      Y (%)
                      <Input name="y" type="number" step="0.1" min="0" max="100" defaultValue={stand.y} />
                    </label>
                    <label className="text-sm font-semibold text-primary">
                      Width (%)
                      <Input name="width" type="number" step="0.1" min="1" max="100" defaultValue={stand.width} />
                    </label>
                    <label className="text-sm font-semibold text-primary">
                      Height (%)
                      <Input name="height" type="number" step="0.1" min="1" max="100" defaultValue={stand.height} />
                    </label>
                    <label className="text-sm font-semibold text-primary">
                      Sort order
                      <Input name="sortOrder" type="number" defaultValue={stand.sort_order} />
                    </label>
                    <div className="text-xs text-ink/70">
                      <p className="font-semibold text-primary">Tildelt søknad</p>
                      <p>{stand.assigned_application_id ?? "Ikke tildelt"}</p>
                    </div>
                  </div>
                  <Button type="submit">Lagre stand</Button>
                </form>
              ))}
            </div>
          </div>
          <form action={saveRegistrationStand} className="grid gap-3 rounded-2xl border border-dashed border-primary/20 p-4">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="campaignId" value={campaignId} />
            <input type="hidden" name="slug" value={detail.campaign.slug} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <h4 className="text-sm font-bold text-primary">Legg til ny stand</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <Input name="standCode" required placeholder="Stand code" />
              <Input name="displayLabel" placeholder="Display label" />
              <Select name="packageTier" defaultValue="silver">
                <option value="standard">Standard</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </Select>
              <Select name="status" defaultValue="available">
                <option value="available">Available</option>
                <option value="disabled">Disabled</option>
                <option value="assigned">Assigned</option>
              </Select>
              <Input name="x" type="number" step="0.1" min="0" max="100" placeholder="X" />
              <Input name="y" type="number" step="0.1" min="0" max="100" placeholder="Y" />
              <Input name="width" type="number" step="0.1" min="1" max="100" placeholder="Width" />
              <Input name="height" type="number" step="0.1" min="1" max="100" placeholder="Height" />
              <Input name="sortOrder" type="number" defaultValue="0" />
            </div>
            <Button type="submit">Opprett stand</Button>
          </form>
        </Card>
      </section>

      <Card className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-primary">Søknader</h3>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {detail.applications.length} totalt
          </span>
        </div>
        {detail.applications.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen søknader mottatt ennå.</p>
        ) : (
          <div className="grid gap-3">
            {detail.applications.map((application) => (
              <Card key={application.id} className="border border-primary/10 bg-primary/5 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="grid gap-1">
                    <p className="text-sm font-semibold text-primary">{application.company_name}</p>
                    <p className="text-xs text-ink/70">
                      {application.contact_first_name} {application.contact_last_name} · {application.contact_email}
                    </p>
                    <p className="text-xs text-ink/70">Innsendt {new Date(application.created_at).toLocaleString("nb-NO")}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(application.status)}`}>
                      {statusLabel(application.status)}
                    </span>
                    <Link
                      className="button-link text-xs"
                      href={`/admin/events/${eventId}/registration/${campaignId}/applications/${application.id}`}
                    >
                      Åpne søknad
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
