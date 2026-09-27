import { defaultPathForRole } from "@/lib/host";
import { StudentShell } from "@/components/layouts/student-shell";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";

const nav = [
  { href: "/student/events", label: "Ticket", icon: "events" },
  { href: "/student/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/student", label: "My profile", icon: "profile" },
  { href: "/student/consents", label: "Consents", icon: "settings" },
] satisfies Array<{ href: string; label: string; icon: "dashboard" | "profile" | "events" | "companies" | "settings" }>;

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/sign-in?role=student&next=${encodeURIComponent(defaultPathForRole("student"))}`);
  }

  const student = await getOrCreateStudentForUser(user.id, user.email);
  const userName = student?.full_name ?? "Student portal";
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
