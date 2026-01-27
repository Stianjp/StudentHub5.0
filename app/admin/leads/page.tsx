import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { upsertConsent, updateConsent } from "@/app/admin/leads/actions";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  await requireRole("admin");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const supabase = createAdminSupabaseClient();

  const [{ data: consents }, { data: students }, { data: companies }, { data: events }] = await Promise.all([
    supabase
      .from("consents")
      .select("id, consent, consented_at, updated_at, student:students(id, full_name, email), company:companies(id, name), event:events(id, name)")
      .order("consented_at", { ascending: false }),
    supabase.from("students").select("id, full_name, email").order("full_name"),
    supabase.from("companies").select("id, name").order("name"),
    supabase.from("events").select("id, name").order("starts_at", { ascending: false }),
  ]);

  const typedConsents = (consents ?? []) as unknown as Array<{
    id: string;
    consent: boolean;
    consented_at: string;
    updated_at: string | null;
    student: { id: string; full_name: string | null; email: string | null } | null;
    company: { id: string; name: string | null } | null;
    event: { id: string; name: string | null } | null;
  }>;

  const filtered = typedConsents.filter((lead) => {
    if (!query) return true;
    const search = query.toLowerCase();
    return (
      lead.student?.full_name?.toLowerCase().includes(search) ||
      lead.student?.email?.toLowerCase().includes(search) ||
      lead.company?.name?.toLowerCase().includes(search) ||
      lead.event?.name?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Leads"
        title="Samtykker og leads"
        description="Administrer samtykker på tvers av alle events og bedrifter."
      />

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Legg til samtykke</h3>
        <form action={upsertConsent} className="grid gap-3 md:grid-cols-4">
          <label className="text-sm font-semibold text-primary">
            Student
            <Select name="studentId" required>
              {(students ?? []).map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name ?? student.email ?? "Student"}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-semibold text-primary">
            Bedrift
            <Select name="companyId" required>
              {(companies ?? []).map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-semibold text-primary">
            Event
            <Select name="eventId" required>
              {(events ?? []).map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-semibold text-primary">
            Samtykke
            <Select name="consent" defaultValue="true">
              <option value="true">Gi samtykke</option>
              <option value="false">Fjern samtykke</option>
            </Select>
          </label>
          <Button className="md:col-span-4" type="submit">
            Lagre samtykke
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-4">
        <form method="get" className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="text-sm font-semibold text-primary md:flex-1">
            Søk
            <Input name="q" defaultValue={query} placeholder="Student, bedrift eller event" />
          </label>
          <Button variant="secondary" type="submit">Filtrer</Button>
        </form>
      </Card>

      <Card className="overflow-x-auto">
        <table className="min-w-full divide-y divide-primary/10 text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-primary/60">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Bedrift</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Handling</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/5">
            {filtered.map((lead) => (
              <tr key={lead.id}>
                <td className="px-4 py-3 text-ink/80">
                  <div className="font-semibold text-primary">{lead.student?.full_name ?? "Student"}</div>
                  <div className="text-xs text-ink/60">{lead.student?.email ?? ""}</div>
                </td>
                <td className="px-4 py-3 text-ink/80">{lead.company?.name ?? "Bedrift"}</td>
                <td className="px-4 py-3 text-ink/80">{lead.event?.name ?? "Event"}</td>
                <td className="px-4 py-3 text-ink/80">{lead.consent ? "Samtykke" : "Fjernet"}</td>
                <td className="px-4 py-3">
                  <form action={updateConsent} className="flex items-center gap-2">
                    <input type="hidden" name="consentId" value={lead.id} />
                    <Select name="consent" defaultValue={lead.consent ? "true" : "false"}>
                      <option value="true">Gi samtykke</option>
                      <option value="false">Fjern samtykke</option>
                    </Select>
                    <Button variant="secondary" type="submit">Oppdater</Button>
                    <Link className="text-xs font-semibold text-primary/70 hover:text-primary" href={`/admin/leads/${lead.id}`}>
                      Detaljer
                    </Link>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
