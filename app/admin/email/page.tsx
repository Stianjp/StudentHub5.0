import Link from "next/link";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { EmailComposeForm } from "./email-compose-form";

export const dynamic = "force-dynamic";

export default async function EmailPage() {
  await requireRole("admin");

  const supabase = createAdminSupabaseClient();

  const [{ data: templates }, { data: groups }, { data: members }] = await Promise.all([
    supabase.from("email_templates").select("*").eq("is_active", true).order("name"),
    supabase.from("email_groups").select("*").order("name"),
    supabase.from("email_group_members").select("group_id"),
  ]);
  const typedTemplates = (templates ?? []) as Array<{
    id: string;
    name: string;
    subject: string;
    html_body: string;
    variables: string[];
    is_active: boolean;
  }>;
  const typedGroups = (groups ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    member_type: "company" | "student";
  }>;
  const typedMembers = (members ?? []) as Array<{ group_id: string }>;

  const memberCountByGroup: Record<string, number> = {};
  for (const m of typedMembers) {
    memberCountByGroup[m.group_id] = (memberCountByGroup[m.group_id] ?? 0) + 1;
  }

  const groupsWithCount = typedGroups.map((g) => ({
    ...g,
    memberCount: memberCountByGroup[g.id] ?? 0,
  }));

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="E-post"
        title="Send e-post"
        description="Velg mal, angi mottakere og send direkte fra admin-siden. Alle sendinger logges."
        actions={
          <div className="flex gap-2">
            <Link
              href="/admin/email/templates"
              className="inline-flex items-center justify-center rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition hover:border-secondary hover:bg-secondary/10 hover:text-secondary"
            >
              Maler
            </Link>
            <Link
              href="/admin/email/groups"
              className="inline-flex items-center justify-center rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary transition hover:border-secondary hover:bg-secondary/10 hover:text-secondary"
            >
              Grupper
            </Link>
          </div>
        }
      />

      <EmailComposeForm
        templates={typedTemplates}
        groups={groupsWithCount}
      />
    </div>
  );
}
