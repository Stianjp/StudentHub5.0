import type { TableRow } from "@/lib/types/database";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { listEventExhibitors } from "@/lib/event-placement";
import {
  ALL_STUDENT_FIELDS,
  SHARED_AREA,
  matchesStudentField,
  suggestArea,
} from "@/lib/event-order";
import { REGISTRATION_STUDENT_FIELDS } from "@/lib/event-registration-options";
import { saveEventPlacement } from "@/app/admin/event-management-actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
export default async function PlacementPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole("admin");
  const { eventId } = await params;
  const filters = await searchParams;
  const db = createAdminSupabaseClient();
  const [rawExhibitors, { data: applications, error }] = await Promise.all([
    listEventExhibitors(eventId),
    db
      .from("event_registration_applications")
      .select(
        "id,campaign_id,event_company_id,status,company_name,candidate_fields,candidate_fields_other",
      )
      .eq("event_id", eventId)
      .in("status", ["approved", "pending"]),
  ]);
  if (error) throw error;
  const exhibitors = rawExhibitors as Awaited<
    ReturnType<typeof listEventExhibitors>
  >;
  const visible = (
    (applications as TableRow<"event_registration_applications">[]) ?? []
  ).filter(
    (a) =>
      matchesStudentField(a.candidate_fields, filters.field ?? "") &&
      a.company_name
        .toLocaleLowerCase()
        .includes((filters.q ?? "").toLocaleLowerCase()),
  );
  const groups = Map.groupBy(
    visible,
    (a) =>
      exhibitors.find((e) => e.id === a.event_company_id)?.confirmed_area ??
      "Plassering ikke bekreftet",
  );
  return (
    <div className="grid gap-5">
      <h1 className="text-3xl font-bold">Områder og plassering</h1>
      <Link className="underline" href={`/admin/events/${eventId}`}>
        Til eventet
      </Link>
      <p>
        Forslaget følger studentmålgruppen. Bekreft området når plasseringen er
        bestemt. Standplass kan tildeles separat i søknaden.
      </p>
      {filters.error ? <p role="alert">{filters.error}</p> : null}
      {filters.saved ? <p role="status">Området er lagret.</p> : null}
      <form className="flex flex-wrap items-end gap-3" method="get">
        <label>
          Søk etter bedrift
          <Input name="q" defaultValue={filters.q} />
        </label>
        <label>
          Studentmålgruppe
          <Select name="field" defaultValue={filters.field ?? ""}>
            <option value="">Alle</option>
            {[ALL_STUDENT_FIELDS, ...REGISTRATION_STUDENT_FIELDS].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
        </label>
        <Button type="submit">Filtrer</Button>
      </form>
      <datalist id="area-options">
        {[
          ...REGISTRATION_STUDENT_FIELDS.filter((f) => f !== "Other"),
          SHARED_AREA,
        ].map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      {!visible.length ? <p>Ingen bedrifter passer filteret.</p> : null}
      {[...groups]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([area, rows]) => (
          <section key={area} className="grid gap-3">
            <h2 className="text-2xl font-bold">
              {area} ({rows.length})
            </h2>
            {rows.map((a) => {
              const registration = exhibitors.find(
                (e) => e.id === a.event_company_id,
              );
              const suggestion = suggestArea(a.candidate_fields);
              return (
                <Card key={a.id} className="grid gap-3">
                  <h3 className="text-xl font-bold">{a.company_name}</h3>
                  <p>
                    {a.status === "approved"
                      ? "Godkjent"
                      : "Venter godkjenning"}{" "}
                    · Målgruppe: {a.candidate_fields.join(", ")}
                    {a.candidate_fields_other
                      ? ` — ${a.candidate_fields_other}`
                      : ""}
                  </p>
                  <p>
                    Foreslått område:{" "}
                    <strong>{suggestion ?? "Krever manuell vurdering"}</strong>
                  </p>
                  <p>
                    Bekreftet område:{" "}
                    {registration?.confirmed_area ?? "Ikke bestemt"} · Stand:{" "}
                    {registration?.stand_code ?? "Ikke tildelt"}
                  </p>
                  {registration ? (
                    <form
                      action={saveEventPlacement}
                      className="flex flex-wrap items-end gap-3"
                    >
                      <input type="hidden" name="eventId" value={eventId} />
                      <input
                        type="hidden"
                        name="registrationId"
                        value={registration.id}
                      />
                      <input
                        type="hidden"
                        name="returnTo"
                        value={`/admin/events/${eventId}/placement`}
                      />
                      <label>
                        Endelig område
                        <Input
                          name="area"
                          list="area-options"
                          maxLength={120}
                          defaultValue={
                            registration.confirmed_area ?? suggestion ?? ""
                          }
                        />
                      </label>
                      <Button type="submit">Bekreft område</Button>
                      <p className="text-sm">
                        Tøm feltet og lagre for å fjerne bekreftelsen.
                      </p>
                    </form>
                  ) : (
                    <p>
                      Godkjenn søknaden før du bekrefter plassering. Forslaget
                      er klart til vurdering.
                    </p>
                  )}
                  <Link
                    className="underline"
                    href={`/admin/events/${eventId}/registration/${a.campaign_id}/applications/${a.id}`}
                  >
                    Åpne søknad og intern standtildeling
                  </Link>
                </Card>
              );
            })}
          </section>
        ))}
    </div>
  );
}
