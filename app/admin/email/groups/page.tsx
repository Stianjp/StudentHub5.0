import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createEmailGroup, deleteEmailGroup } from "./actions";

export const dynamic = "force-dynamic";

export default async function EmailGroupsPage() {
  await requireRole("admin");

  const supabase = createAdminSupabaseClient();

  const { data: groups } = await supabase
    .from("email_groups")
    .select("*, email_group_members(id)")
    .order("name");

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="E-post"
        title="E-postgrupper"
        description="Organiser bedrifter og studenter i grupper for målrettet e-postutsendelse."
      />

      <Card>
        <p className="text-sm font-semibold text-primary mb-4">Ny gruppe</p>
        <form action={createEmailGroup} className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs font-medium text-ink/70" htmlFor="name">Navn</label>
            <Input id="name" name="name" placeholder="f.eks. Bedrifter SC2025" required />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-xs font-medium text-ink/70" htmlFor="description">Beskrivelse (valgfritt)</label>
            <Input id="description" name="description" placeholder="Kort beskrivelse" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink/70" htmlFor="member_type">Type</label>
            <Select name="member_type" id="member_type" required>
              <option value="company">Bedrifter</option>
              <option value="student">Studenter</option>
            </Select>
          </div>
          <Button type="submit" className="shrink-0">Opprett gruppe</Button>
        </form>
      </Card>

      {groups?.length === 0 ? (
        <Card className="text-sm text-ink/70">
          <p>Ingen grupper opprettet ennå.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {groups?.map((group) => {
            const memberCount = (group.email_group_members as { id: string }[])?.length ?? 0;
            return (
              <Card key={group.id} className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary">{group.name}</span>
                    <Badge variant="info">
                      {group.member_type === "company" ? "Bedrifter" : "Studenter"}
                    </Badge>
                    <span className="text-xs text-ink/60">{memberCount} medlem{memberCount !== 1 ? "mer" : ""}</span>
                  </div>
                  {group.description && <p className="text-sm text-ink/70">{group.description}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/admin/email/groups/${group.id}`}>
                    <Button size="sm" variant="outline">Administrer</Button>
                  </Link>
                  <form action={deleteEmailGroup}>
                    <input type="hidden" name="id" value={group.id} />
                    <Button type="submit" size="sm" variant="destructive">Slett</Button>
                  </form>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
