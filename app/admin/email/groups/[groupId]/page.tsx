import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { addGroupMember, removeGroupMember } from "../actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ groupId: string }> };

export default async function GroupDetailPage({ params }: Props) {
  await requireRole("admin");

  const { groupId } = await params;
  const supabase = createAdminSupabaseClient();

  const { data: group } = await supabase
    .from("email_groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (!group) notFound();

  const { data: membersData } = await supabase
    .from("email_group_members")
    .select("id, email, display_name, company_id, student_id")
    .eq("group_id", groupId);

  const members = membersData ?? [];

  let candidates: Array<{ id: string; label: string }> = [];

  if (group.member_type === "company") {
    const existingCompanyIds = members.map((m) => m.company_id).filter(Boolean) as string[];
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name")
      .order("name");

    candidates = (companies ?? [])
      .filter((c) => !existingCompanyIds.includes(c.id))
      .map((c) => ({ id: c.id, label: c.name }));
  } else {
    const existingStudentIds = members.map((m) => m.student_id).filter(Boolean) as string[];
    const { data: students } = await supabase
      .from("students")
      .select("id, full_name, email")
      .not("email", "is", null)
      .order("full_name");

    candidates = (students ?? [])
      .filter((s) => s.id && !existingStudentIds.includes(s.id))
      .map((s) => ({ id: s.id, label: `${s.full_name ?? "Ukjent"} (${s.email})` }));
  }

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="E-post / Grupper"
        title={group.name}
        description={group.description ?? undefined}
      />

      {candidates.length > 0 && (
        <Card>
          <p className="text-sm font-semibold text-primary mb-4">
            Legg til {group.member_type === "company" ? "bedrift" : "student"}
          </p>
          <form action={addGroupMember} className="flex gap-3 items-end">
            <input type="hidden" name="group_id" value={groupId} />
            <input type="hidden" name="member_type" value={group.member_type} />
            <div className="flex-1">
              <Select name="member_id" required>
                <option value="">Velg {group.member_type === "company" ? "bedrift" : "student"}...</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
            </div>
            <Button type="submit">Legg til</Button>
          </form>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-primary">
            Medlemmer ({members.length})
          </p>
          <Badge variant="info">{group.member_type === "company" ? "Bedrifter" : "Studenter"}</Badge>
        </div>

        {members.length === 0 ? (
          <p className="text-sm text-ink/70">Ingen medlemmer ennå.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl border border-primary/10 bg-surface px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-primary">{member.display_name ?? "-"}</p>
                  <p className="text-xs text-ink/60">{member.email}</p>
                </div>
                <form action={removeGroupMember}>
                  <input type="hidden" name="member_id" value={member.id} />
                  <input type="hidden" name="group_id" value={groupId} />
                  <Button type="submit" variant="danger">Fjern</Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
