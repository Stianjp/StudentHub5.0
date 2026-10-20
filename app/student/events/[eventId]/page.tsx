import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { listEventExhibitors } from "@/lib/event-placement";
import { matchesStudentField } from "@/lib/event-order";
import { REGISTRATION_STUDENT_FIELDS } from "@/lib/event-registration-options";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export default async function StudentEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ field?: string }>;
}) {
  await requireRole("student");
  const { eventId } = await params;
  const { field = "" } = await searchParams;
  const { data: event, error } = await createPublicSupabaseClient()
    .from("events")
    .select("id,name,location,starts_at")
    .eq("id", eventId)
    .eq("is_active", true)
    .single();
  if (error || !event) notFound();
  const companies = (await listEventExhibitors(eventId)).filter((c) =>
    matchesStudentField(c.target_fields, field),
  );
  const areas = Map.groupBy(
    companies,
    (c) => c.confirmed_area ?? "Plassering kommer",
  );
  return (
    <div className="grid gap-6">
      <Link className="underline" href="/student/events">
        Alle events og billetter
      </Link>
      <h1 className="text-3xl font-bold">{event.name}</h1>
      <p>
        {event.location} ·{" "}
        {new Date(event.starts_at).toLocaleDateString("nb-NO")}
      </p>
      <h2 className="text-2xl font-bold">Finn relevante bedrifter</h2>
      <p>
        Bedriftene er gruppert etter plassering. Filtrer på studieretningen din
        for å finne relevante bedrifter i alle områder.
      </p>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label>
          Studieretning
          <Select name="field" defaultValue={field}>
            <option value="">Alle studieretninger</option>
            {REGISTRATION_STUDENT_FIELDS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
        </label>
        <Button type="submit">Vis bedrifter</Button>
      </form>
      {!companies.length ? (
        <p>Ingen godkjente bedrifter å vise for dette valget ennå.</p>
      ) : null}
      {[...areas]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([area, rows]) => (
          <section key={area} className="grid gap-3">
            <h2 className="text-2xl font-bold">{area}</h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {rows.map((c) => (
                <li key={c.id}>
                  <Card className="grid gap-2">
                    <h3 className="text-xl font-bold">
                      {c.company?.name ?? "Bedrift"}
                    </h3>
                    <p>
                      Ønsker å møte: {c.target_fields.join(", ")}
                      {c.target_fields_other
                        ? ` — ${c.target_fields_other}`
                        : ""}
                    </p>
                    <p>Stand: {c.stand_code ?? "Kommer"}</p>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
