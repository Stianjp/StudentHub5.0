import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SectionHeader } from "@/components/ui/section-header";
import { CRM_PIPELINE_STAGES } from "@/lib/crm";
import {
  describeEmailGroupSync,
  EMAIL_GROUP_PACKAGE_OPTIONS,
  EMAIL_GROUP_SYNC_MODE_OPTIONS,
  type EmailGroupCampaignOption,
  listEmailGroupCampaignOptions,
  syncDynamicEmailGroups,
} from "@/lib/email-groups";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createEmailGroup, deleteEmailGroup } from "./actions";

export default async function EmailGroupsPage() {
  await requireRole("admin");
  await syncDynamicEmailGroups();

  const supabase = createAdminSupabaseClient();

  const [{ data: groups }, { data: allMembers }, campaignsResult] = await Promise.all([
    supabase
      .from("email_groups")
      .select("*")
      .order("name"),
    supabase
      .from("email_group_members")
      .select("group_id"),
    listEmailGroupCampaignOptions(),
  ]);

  const campaigns = campaignsResult as EmailGroupCampaignOption[];
  const campaignsById = Object.fromEntries(
    campaigns.map((campaign: EmailGroupCampaignOption) => [campaign.id, campaign]),
  ) as Record<string, EmailGroupCampaignOption>;
  const typedGroups = (groups ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    member_type: "company" | "student";
    sync_mode: "manual" | "dynamic_registration";
    dynamic_registration_campaign_id: string | null;
    dynamic_package_tier: "standard" | "silver" | "gold" | "platinum" | null;
    dynamic_pipeline_stage: typeof CRM_PIPELINE_STAGES[number] | null;
  }>;
  const typedMembers = (allMembers ?? []) as Array<{ group_id: string }>;

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="E-post"
        title="E-postgrupper"
        description="Organiser bedrifter og studenter i grupper for målrettet e-postutsendelse."
      />

      <Card>
        <p className="text-sm font-semibold text-primary mb-4">Ny gruppe</p>
        <form action={createEmailGroup} className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink/70" htmlFor="name">Navn</label>
            <Input id="name" name="name" placeholder="f.eks. Bedrifter SC2025" required />
          </div>
          <div className="flex flex-col gap-1.5">
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
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink/70" htmlFor="sync_mode">Medlemskap</label>
            <Select name="sync_mode" id="sync_mode" defaultValue="manual">
              {EMAIL_GROUP_SYNC_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink/70" htmlFor="dynamic_registration_campaign_id">Registreringskampanje</label>
            <Select name="dynamic_registration_campaign_id" id="dynamic_registration_campaign_id" defaultValue="">
              <option value="">Velg kampanje hvis gruppen skal være dynamisk</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink/70" htmlFor="dynamic_package_tier">Pakke</label>
            <Select name="dynamic_package_tier" id="dynamic_package_tier" defaultValue="">
              {EMAIL_GROUP_PACKAGE_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink/70" htmlFor="dynamic_pipeline_stage">Pipeline-status</label>
            <Select name="dynamic_pipeline_stage" id="dynamic_pipeline_stage" defaultValue="">
              <option value="">Alle statuser</option>
              {CRM_PIPELINE_STAGES.map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </Select>
          </div>
          <div className="lg:col-span-2">
            <p className="text-xs text-ink/60">
              Dynamiske grupper brukes for bedriftsgrupper og bygges automatisk fra registreringskampanje, pakke og eventuelt CRM-pipeline.
            </p>
          </div>
          <div className="lg:col-span-2">
            <Button type="submit" className="shrink-0">Opprett gruppe</Button>
          </div>
        </form>
      </Card>

      {typedGroups.length === 0 ? (
        <Card className="text-sm text-ink/70">
          <p>Ingen grupper opprettet ennå.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {typedGroups.map((group) => {
            const memberCount = typedMembers.filter((m) => m.group_id === group.id).length;
            return (
              <Card key={group.id} className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary">{group.name}</span>
                    <Badge variant="info">
                      {group.member_type === "company" ? "Bedrifter" : "Studenter"}
                    </Badge>
                    <Badge variant={group.sync_mode === "dynamic_registration" ? "success" : "default"}>
                      {group.sync_mode === "dynamic_registration" ? "Dynamisk" : "Manuell"}
                    </Badge>
                    <span className="text-xs text-ink/60">{memberCount} medlem{memberCount !== 1 ? "mer" : ""}</span>
                  </div>
                  {group.description && <p className="text-sm text-ink/70">{group.description}</p>}
                  <p className="text-xs text-ink/60">
                    {describeEmailGroupSync(group, campaignsById)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/admin/email/groups/${group.id}`}>
                    <Button variant="ghost">Administrer</Button>
                  </Link>
                  <form action={deleteEmailGroup}>
                    <input type="hidden" name="id" value={group.id} />
                    <Button type="submit" variant="danger">Slett</Button>
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
