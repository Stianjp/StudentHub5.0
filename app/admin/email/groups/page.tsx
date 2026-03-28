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
  const memberCountByGroup = typedMembers.reduce<Record<string, number>>((acc, member) => {
    acc[member.group_id] = (acc[member.group_id] ?? 0) + 1;
    return acc;
  }, {});
  const groupsWithCount = typedGroups.map((group) => ({
    ...group,
    memberCount: memberCountByGroup[group.id] ?? 0,
  }));
  const totalMembers = groupsWithCount.reduce((sum, group) => sum + group.memberCount, 0);
  const dynamicGroups = groupsWithCount.filter((group) => group.sync_mode === "dynamic_registration");
  const manualGroups = groupsWithCount.length - dynamicGroups.length;

  return (
    <div className="email-groups-page flex flex-col gap-8">
      <SectionHeader
        eyebrow="E-post"
        title="E-postgrupper"
        description="Organiser mottakere i manuelle eller dynamiske grupper, og knytt dem direkte til Student Connect-kampanjer, pakker og CRM-status."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-white/10 bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary/85">Totale grupper</p>
          <p className="mt-3 text-3xl font-semibold text-primary">{groupsWithCount.length}</p>
          <p className="mt-2 text-sm text-ink/70">Alle aktive e-postgrupper i admin.</p>
        </Card>
        <Card className="border border-white/10 bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary/85">Dynamiske grupper</p>
          <p className="mt-3 text-3xl font-semibold text-primary">{dynamicGroups.length}</p>
          <p className="mt-2 text-sm text-ink/70">{manualGroups} manuelle grupper ved siden av.</p>
        </Card>
        <Card className="border border-white/10 bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary/85">Totale mottakere</p>
          <p className="mt-3 text-3xl font-semibold text-primary">{totalMembers}</p>
          <p className="mt-2 text-sm text-ink/70">Oppdatert etter siste gruppesynk.</p>
        </Card>
      </div>

      <Card className="overflow-hidden border border-white/10">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">Ny gruppe</p>
              <p className="mt-1 text-sm text-ink/70">
                Opprett en klassisk liste eller en gruppe som følger registrering, pakke og pipeline automatisk.
              </p>
            </div>
            <form action={createEmailGroup} className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink/70" htmlFor="name">Navn</label>
                <Input id="name" name="name" placeholder="f.eks. Student Connect Gold" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink/70" htmlFor="description">Beskrivelse (valgfritt)</label>
                <Input id="description" name="description" placeholder="Kort beskrivelse av bruken" />
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
              <div className="flex flex-col gap-1.5 lg:col-span-2">
                <label className="text-xs font-medium text-ink/70" htmlFor="dynamic_pipeline_stage">Pipeline-status</label>
                <Select name="dynamic_pipeline_stage" id="dynamic_pipeline_stage" defaultValue="">
                  <option value="">Alle statuser</option>
                  {CRM_PIPELINE_STAGES.map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </Select>
              </div>
              <div className="lg:col-span-2">
                <Button type="submit" className="shrink-0">Opprett gruppe</Button>
              </div>
            </form>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-secondary/20 bg-secondary/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Hvordan dynamiske grupper fungerer</p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-ink/75">
                <p>Velg først registreringskampanje, for eksempel Student Connect 2026.</p>
                <p>Legg til pakke hvis gruppen bare skal følge Gold, Silver, Platinum eller Standard.</p>
                <p>Bruk CRM-status når du vil isolere for eksempel bare Påmeldt, Venter kontrakt eller Betalt.</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary">Tips</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="default">Alle bedrifter Student Connect 2026</Badge>
                <Badge variant="success">SC-Gold-Bedrifter</Badge>
                <Badge variant="info">SC-Platinum-Bedrifter</Badge>
              </div>
              <p className="mt-4 text-sm text-ink/70">
                Disse kan nå styres fra gruppeinnstillingene i stedet for å vedlikeholdes manuelt.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {groupsWithCount.length === 0 ? (
        <Card className="text-sm text-ink/70">
          <p>Ingen grupper opprettet ennå.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {groupsWithCount.map((group) => {
            return (
              <Card
                key={group.id}
                className="grid gap-4 border border-white/10 bg-white/5 md:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold text-primary">{group.name}</span>
                    <Badge variant="info">
                      {group.member_type === "company" ? "Bedrifter" : "Studenter"}
                    </Badge>
                    <Badge variant={group.sync_mode === "dynamic_registration" ? "success" : "default"}>
                      {group.sync_mode === "dynamic_registration" ? "Dynamisk" : "Manuell"}
                    </Badge>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-ink/70">
                      {group.memberCount} medlem{group.memberCount !== 1 ? "mer" : ""}
                    </span>
                  </div>
                  {group.description && <p className="text-sm text-ink/70">{group.description}</p>}
                  <div className="rounded-2xl border border-white/10 bg-[#1b0858]/65 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary/90">Kobling</p>
                    <p className="mt-2 text-sm text-ink/80">{describeEmailGroupSync(group, campaignsById)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col justify-between gap-3 md:min-w-48">
                  <div className="rounded-2xl border border-white/10 bg-[#1b0858]/65 px-4 py-3 text-sm text-ink/75">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary/90">Status</p>
                    <p className="mt-2">{group.sync_mode === "dynamic_registration" ? "Synkes automatisk" : "Vedlikeholdes manuelt"}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link href={`/admin/email/groups/${group.id}`}>
                      <Button variant="ghost" className="w-full">Administrer</Button>
                    </Link>
                    <form action={deleteEmailGroup}>
                      <input type="hidden" name="id" value={group.id} />
                      <Button type="submit" variant="danger" className="w-full">Slett</Button>
                    </form>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
