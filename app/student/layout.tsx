import { PortalShell } from "@/components/layouts/portal-shell";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";

const nav = [
  { href: "/student/dashboard", label: "Dashboard" },
  { href: "/student", label: "Profil" },
  { href: "/student/events", label: "Påmelding til event" },
  { href: "/student/consents", label: "Samtykker" },
];

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const student = user ? await getOrCreateStudentForUser(profile.id, user.email) : null;
  const title = student?.full_name ?? "Studentportal";

  return (
    <PortalShell
      roleLabel="Student"
      roleKey="student"
      title={title}
      nav={nav}
      backgroundClass="bg-gradient-to-br from-primary to-secondary"
      backgroundStyle={{ backgroundImage: "linear-gradient(150deg, #140249 0%, #2D0A73 52%, #FE9A70 100%)" }}
      mainClass="student-scope bg-primary/10"
    >
      {children}
    </PortalShell>
  );
}
