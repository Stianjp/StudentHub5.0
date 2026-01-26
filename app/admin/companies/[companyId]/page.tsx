import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import {
  getCompanyWithDetails,
  listCompanyLeads,
  listCompanyRegistrations,
} from "@/lib/admin";

const packageLabel: Record<string, string> = {
  standard: "Standard",
  silver: "Sølv",
  gold: "Gull",
  platinum: "Platinum",
};

type PageProps = {
  params: Promise<{ companyId: string }>;
};

export default async function AdminCompanyDetailPage({ params }: PageProps) {
  await requireRole("admin");
  const { companyId } = await params;

  const [company, registrations, leads] = await Promise.all([
    getCompanyWithDetails(companyId),
    listCompanyRegistrations(companyId),
    listCompanyLeads(companyId),
  ]);

  const typedRegistrations = registrations as Array<{
    id: string;
    stand_type: string | null;
    package: string;
    event?: { name?: string };
  }>;

  const typedLeads = leads as Array<{
    id: string;
    student?: { full_name?: string; study_program?: string; email?: string; phone?: string };
    event?: { name?: string };
  }>;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Bedrift"
        title={company.name}
        description={company.industry ?? "Bransje ikke satt"}
        actions={
          <Link className="text-sm font-semibold text-primary/70 transition hover:text-primary" href="/admin/companies">
            ← Tilbake
          </Link>
        }
      />

      <Card className="grid gap-3 text-sm text-ink/80 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Firmainfo</p>
          <p className="text-base font-semibold text-primary">{company.name}</p>
          <p>Org.nr: {company.org_number ?? "—"}</p>
          <p>Lokasjon: {company.location ?? "—"}</p>
          <p>Størrelse: {company.size ?? "—"}</p>
          <p>Nettside: {company.website ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Rekruttering</p>
          <p>Roller: {company.recruitment_roles.join(", ") || "—"}</p>
          <p>Studieretninger: {company.recruitment_fields.join(", ") || "—"}</p>
          <p>Nivå: {company.recruitment_levels.join(", ") || "—"}</p>
          <p>Jobbtyper: {company.recruitment_job_types.join(", ") || "—"}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Branding</p>
          <p>Verdier: {company.branding_values.join(", ") || "—"}</p>
          <p>EVP: {company.branding_evp ?? "—"}</p>
          <p>Budskap: {company.branding_message ?? "—"}</p>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Event-deltakelser</h3>
        {registrations.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen registreringer enda.</p>
        ) : (
          <ul className="grid gap-2 text-sm text-ink/80">
            {typedRegistrations.map((reg) => (
              <li key={reg.id} className="flex items-center justify-between rounded-xl bg-primary/5 px-3 py-2">
                <div>
                  <p className="font-semibold text-primary">{reg.event?.name ?? "Event"}</p>
                  <p className="text-xs text-ink/70">Standtype: {reg.stand_type ?? "—"}</p>
                </div>
                <Badge variant={reg.package === "platinum" ? "success" : "default"}>
                  {packageLabel[reg.package] ?? reg.package}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-primary">Studenter med samtykke</h3>
        {leads.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen samtykker enda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-primary/10 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-primary/60">
                  <th className="px-3 py-2">Navn</th>
                  <th className="px-3 py-2">Studie</th>
                  <th className="px-3 py-2">Kontakt</th>
                  <th className="px-3 py-2">Event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {typedLeads.map((lead) => (
                  <tr key={lead.id} className="align-top">
                    <td className="px-3 py-3 font-semibold text-primary">
                      {lead.student?.full_name ?? "Ukjent"}
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      {lead.student?.study_program ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-ink/80">
                      <div>{lead.student?.email ?? "—"}</div>
                      <div className="text-xs text-ink/60">{lead.student?.phone ?? ""}</div>
                    </td>
                    <td className="px-3 py-3 text-ink/80">{lead.event?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
