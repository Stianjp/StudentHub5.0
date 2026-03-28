import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/section-header";
import { requireRole } from "@/lib/auth";
import { CRM_PIPELINE_STAGES } from "@/lib/crm";
import {
  describeEmailGroupSync,
  EMAIL_GROUP_PACKAGE_OPTIONS,
  EMAIL_GROUP_SYNC_MODE_OPTIONS,
  type EmailGroupCampaignOption,
  listEmailGroupCampaignOptions,
  syncDynamicEmailGroups,
} from "@/lib/email-groups";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Input } from "@/components/ui/input";
import {
  addGroupMember,
  addManualGroupMember,
  removeGroupMember,
  syncEmailGroupMembers,
  updateEmailGroup,
} from "../actions";

type Props = { params: Promise<{ groupId: string }> };

export default async function GroupDetailPage({ params }: Props) {
  await requireRole("admin");

  const { groupId } = await params;
  await syncDynamicEmailGroups({ groupIds: [groupId] });

  const supabase = createAdminSupabaseClient();

  const [{ data: group }, campaignsResult] = await Promise.all([
    supabase
      .from("email_groups")
      .select("*")
      .eq("id", groupId)
      .single(),
    listEmailGroupCampaignOptions(),
  ]);

  if (!group) notFound();

  const campaigns = campaignsResult as EmailGroupCampaignOption[];
  const campaignsById = Object.fromEntries(
    campaigns.map((campaign: EmailGroupCampaignOption) => [campaign.id, campaign]),
  ) as Record<string, EmailGroupCampaignOption>;

  const { data: membersData } = await supabase
    .from("email_group_members")
    .select("id, email, display_name, company_id, student_id, source")
    .eq("group_id", groupId);

  const members = (membersData ?? []) as Array<{
    id: string;
    email: string;
    display_name: string | null;
    company_id: string | null;
    student_id: string | null;
    source: "manual" | "dynamic_registration" | "registration_auto";
  }>;
  const dynamicMemberCount = members.filter((member) => member.source === "dynamic_registration").length;
  const manualMemberCount = members.filter((member) => member.source === "manual").length;
  const registrationMemberCount = members.filter((member) => member.source === "registration_auto").length;

  let candidates: Array<{ id: string; label: string }> = [];

  if (group.member_type === "company" && group.sync_mode === "manual") {
    const existingCompanyIds = members.map((m) => m.company_id).filter(Boolean) as string[];
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name")
      .order("name");
    const typedCompanies = (companies ?? []) as Array<{ id: string; name: string }>;

    candidates = typedCompanies
      .filter((c) => !existingCompanyIds.includes(c.id))
      .map((c) => ({ id: c.id, label: c.name }));
  } else if (group.member_type === "student") {
    const existingStudentIds = members.map((m) => m.student_id).filter(Boolean) as string[];
    const { data: students } = await supabase
      .from("students")
      .select("id, full_name, email")
      .not("email", "is", null)
      .order("full_name");
    const typedStudents = (students ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>;

    candidates = typedStudents
      .filter((s) => s.id && !existingStudentIds.includes(s.id))
      .map((s) => ({ id: s.id, label: `${s.full_name ?? "Ukjent"} (${s.email})` }));
  }

  return (
    <div className="email-groups-page flex flex-col gap-8">
      <SectionHeader
        eyebrow="E-post / Grupper"
        title={group.name}
        description={group.description ?? describeEmailGroupSync(group, campaignsById)}
        actions={
          group.sync_mode === "dynamic_registration" ? (
            <form action={syncEmailGroupMembers}>
              <input type="hidden" name="group_id" value={groupId} />
              <Button type="submit" variant="ghost">Synk nå</Button>
            </form>
          ) : undefined
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_22rem]">
        <Card className="border border-white/10">
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Badge variant="info">{group.member_type === "company" ? "Bedrifter" : "Studenter"}</Badge>
            <Badge variant={group.sync_mode === "dynamic_registration" ? "success" : "default"}>
              {group.sync_mode === "dynamic_registration" ? "Dynamisk" : "Manuell"}
            </Badge>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-ink/70">
              {members.length} mottakere
            </span>
          </div>
          <form action={updateEmailGroup} className="grid gap-4 lg:grid-cols-2">
            <input type="hidden" name="id" value={groupId} />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink/70" htmlFor="name">Navn</label>
              <Input id="name" name="name" defaultValue={group.name} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink/70" htmlFor="description">Beskrivelse</label>
              <Input id="description" name="description" defaultValue={group.description ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink/70" htmlFor="member_type">Type</label>
              <Select id="member_type" name="member_type" defaultValue={group.member_type}>
                <option value="company">Bedrifter</option>
                <option value="student">Studenter</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink/70" htmlFor="sync_mode">Medlemskap</label>
              <Select id="sync_mode" name="sync_mode" defaultValue={group.sync_mode}>
                {EMAIL_GROUP_SYNC_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink/70" htmlFor="dynamic_registration_campaign_id">Registreringskampanje</label>
              <Select
                id="dynamic_registration_campaign_id"
                name="dynamic_registration_campaign_id"
                defaultValue={group.dynamic_registration_campaign_id ?? ""}
              >
                <option value="">Velg kampanje hvis gruppen skal være dynamisk</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>{campaign.label}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink/70" htmlFor="dynamic_package_tier">Pakke</label>
              <Select id="dynamic_package_tier" name="dynamic_package_tier" defaultValue={group.dynamic_package_tier ?? ""}>
                {EMAIL_GROUP_PACKAGE_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <label className="text-xs font-medium text-ink/70" htmlFor="dynamic_pipeline_stage">Pipeline-status</label>
              <Select id="dynamic_pipeline_stage" name="dynamic_pipeline_stage" defaultValue={group.dynamic_pipeline_stage ?? ""}>
                <option value="">Alle statuser</option>
                {CRM_PIPELINE_STAGES.map((stage) => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </Select>
            </div>
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#1b0858]/65 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary/90">Kobling</p>
              <p className="mt-2 text-sm text-ink/80">{describeEmailGroupSync(group, campaignsById)}</p>
              <p className="mt-3 text-xs text-ink/65">
                Dynamiske bedriftsgrupper oppdateres automatisk fra registreringskampanjen og kan snevres inn på pakke og CRM-status.
              </p>
            </div>
            <div className="lg:col-span-2">
              <Button type="submit">Lagre gruppeoppsett</Button>
            </div>
          </form>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="border border-white/10 bg-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary/90">Oversikt</p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-[#1b0858]/65 px-4 py-3">
                <p className="text-xs text-ink/60">Dynamiske</p>
                <p className="mt-1 text-2xl font-semibold text-primary">{dynamicMemberCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#1b0858]/65 px-4 py-3">
                <p className="text-xs text-ink/60">Manuelle</p>
                <p className="mt-1 text-2xl font-semibold text-primary">{manualMemberCount}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#1b0858]/65 px-4 py-3">
                <p className="text-xs text-ink/60">Fra registrering</p>
                <p className="mt-1 text-2xl font-semibold text-primary">{registrationMemberCount}</p>
              </div>
            </div>
          </Card>

          {group.sync_mode === "dynamic_registration" && group.member_type === "company" && (
            <Card className="border border-success/20 bg-success/5">
              <p className="text-sm font-semibold text-primary mb-1">Automatisk bedriftsgruppe</p>
              <p className="text-sm text-ink/70">
                Bedrifter i denne gruppen hentes automatisk fra registreringskampanjen. Du kan fortsatt legge til ekstra manuelle e-postadresser under.
              </p>
            </Card>
          )}

          <Card className="border border-white/10 bg-white/5">
            <p className="text-sm font-semibold text-primary mb-4">Legg til manuell e-post</p>
            <form action={addManualGroupMember} className="flex flex-col gap-3">
              <input type="hidden" name="group_id" value={groupId} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink/70" htmlFor="manual_email">E-postadresse</label>
                <Input id="manual_email" name="email" type="email" placeholder="navn@domene.no" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink/70" htmlFor="manual_name">Navn (valgfritt)</label>
                <Input id="manual_name" name="display_name" placeholder="Fornavn Etternavn" />
              </div>
              <Button type="submit" className="w-full">Legg til</Button>
            </form>
          </Card>
        </div>
      </div>

      {candidates.length > 0 && (
        <Card className="border border-white/10 bg-white/5">
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

      <Card className="border border-white/10">
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
              <div key={member.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-primary">{member.display_name ?? member.email}</p>
                    {member.source === "dynamic_registration" && (
                      <span className="rounded-md bg-success/15 px-2 py-0.5 text-xs text-success">dynamisk</span>
                    )}
                    {member.source === "registration_auto" && (
                      <span className="rounded-md bg-info/15 px-2 py-0.5 text-xs text-info">registrering</span>
                    )}
                    {member.source === "manual" && !member.company_id && !member.student_id && (
                      <span className="rounded-md bg-secondary/20 px-2 py-0.5 text-xs text-ink/60">manuell</span>
                    )}
                  </div>
                  <p className="text-xs text-ink/60">{member.email}</p>
                </div>
                {member.source === "dynamic_registration" ? (
                  <span className="text-xs text-ink/60">Synkes automatisk</span>
                ) : (
                  <form action={removeGroupMember}>
                    <input type="hidden" name="member_id" value={member.id} />
                    <input type="hidden" name="group_id" value={groupId} />
                    <Button type="submit" variant="danger">Fjern</Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
