import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { TableRow } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function StudentConnect2027InterestPage() {
  const { data, error } = await createAdminSupabaseClient()
    .from("student_connect_2027_interest")
    .select("id, company_name, email, consented_at")
    .order("consented_at", { ascending: false });
  if (error) throw error;
  const interests = (data ?? []) as Pick<TableRow<"student_connect_2027_interest">, "id" | "company_name" | "email" | "consented_at">[];

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        eyebrow="Student Connect 2027"
        title="Interesseliste"
        description="Bedrifter som har samtykket til e-post når registreringen åpner."
        actions={<Link className="button-link text-xs" href="/api/admin/student-connect-2027-interest/export">Last ned CSV</Link>}
      />
      <Card>
        {!interests.length ? (
          <p className="text-sm text-ink/70">Ingen interesser registrert ennå.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-primary/10"><th className="p-3">Bedrift</th><th className="p-3">E-post</th><th className="p-3">Samtykke gitt</th></tr></thead>
              <tbody>
                {interests.map((item) => (
                  <tr key={item.id} className="border-b border-primary/5">
                    <td className="p-3">{item.company_name}</td>
                    <td className="p-3"><a className="underline" href={`mailto:${item.email}`}>{item.email}</a></td>
                    <td className="p-3">{new Date(item.consented_at).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}</td>
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
