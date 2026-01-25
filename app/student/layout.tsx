import { PortalShell } from "@/components/layouts/portal-shell";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";

const nav = [
  { href: "/student", label: "Profil" },
  { href: "/student/consents", label: "Samtykker" },
];

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("student");
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const student = user ? await getOrCreateStudentForUser(profile.id, user.email) : null;
  const title = student?.full_name ?? "Studentportal";

  return (
    <PortalShell roleLabel="Student" title={title} nav={nav}>
      {children}
    </PortalShell>
  );
}
