import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { LikedCompanies } from "@/components/student/liked-companies";
import { saveLikedCompanies } from "@/app/student/actions";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function StudentCompaniesPage({ searchParams }: PageProps) {
  const paramsData = (await (searchParams ?? Promise.resolve({}))) as Record<
    string,
    string | string[] | undefined
  >;
  const saved = paramsData.saved === "1";

  const profile = await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not found");
  }

  const [student, { data: companies, error: companiesError }] = await Promise.all([
    getOrCreateStudentForUser(profile.id, user.email),
    supabase.from("companies").select("id, name, industry").order("name"),
  ]);

  if (companiesError) throw companiesError;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Student"
        title="Utforsk Bedrifter"
        description="Finn flere bedrifter og oppdater favorittene dine."
        actions={
          <Link className="button-link text-xs" href="/student/dashboard">
            Tilbake til oversikt
          </Link>
        }
      />

      {saved ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          Favoritter oppdatert.
        </Card>
      ) : null}

      <Card className="flex flex-col gap-5">
        <p className="text-sm text-ink/80">
          Velg bedrifter du vil følge. Du kan oppdatere listen når som helst.
        </p>

        {companies && companies.length > 0 ? (
          <form action={saveLikedCompanies} className="flex flex-col gap-4">
            <LikedCompanies companies={companies} initialSelected={student.liked_company_ids ?? []} />
            <div className="flex flex-wrap gap-3">
              <Button type="submit">Lagre favoritter</Button>
              <Link className="button-link text-xs" href="/student">
                Gå til profil
              </Link>
            </div>
          </form>
        ) : (
          <p className="text-sm text-ink/70">Ingen bedrifter er registrert ennå.</p>
        )}
      </Card>
    </div>
  );
}
