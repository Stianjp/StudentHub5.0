import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser, listStudentConsents } from "@/lib/student";

export default async function StudentConsentsPage() {
  const profile = await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const student = await getOrCreateStudentForUser(profile.id, user.email);
  const consents = await listStudentConsents(student.id);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Samtykke"
        title="Dine samtykker"
        description="Samtykke lagres eksplisitt per bedrift og event med timestamp."
      />

      <Card className="flex flex-col gap-4">
        {consents.length === 0 ? (
          <p className="text-sm text-ink/70">Du har ikke gitt samtykke til noen bedrifter ennå.</p>
        ) : (
          <ul className="grid gap-3">
            {consents.map((consent) => (
              <li key={consent.id} className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-semibold text-primary">{consent.company?.name ?? "Bedrift"}</p>
                    <p className="text-xs text-ink/70">{consent.event?.name ?? "Event"}</p>
                  </div>
                  <Badge variant={consent.consent ? "success" : "warning"}>
                    {new Date(consent.consented_at).toLocaleString("nb-NO")}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-ink/80">Scope: {consent.scope}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
