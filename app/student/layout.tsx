import { StudentShell } from "@/components/layouts/student-shell";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";

const nav = [
  { href: "/student/dashboard", label: "Oversikt", icon: "dashboard" },
  { href: "/student", label: "Min profil", icon: "profile" },
  { href: "/student/events", label: "Events", icon: "events" },
  { href: "/student/consents", label: "Innstillinger", icon: "settings" },
] satisfies Array<{ href: string; label: string; icon: "dashboard" | "profile" | "events" | "settings" }>;

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const student = user ? await getOrCreateStudentForUser(profile.id, user.email) : null;
  const userName = student?.full_name ?? "Studentportal";
  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <StudentShell nav={nav} userName={userName} userInitials={userInitials}>
      {children}
    </StudentShell>
  );
}
