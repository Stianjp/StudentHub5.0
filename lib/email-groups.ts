import { CRM_PIPELINE_STAGES, type CrmPipelineStage, normalizeCrmText } from "@/lib/crm";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Database, TableInsert, TableRow, TableUpdate } from "@/lib/types/database";

type EmailGroup = TableRow<"email_groups">;
type EmailGroupMember = TableRow<"email_group_members">;
type RegistrationApplication = TableRow<"event_registration_applications">;
type RegistrationPackage = TableRow<"event_registration_packages">;

export type EmailGroupSyncMode = Database["public"]["Enums"]["email_group_sync_mode"];
export type EmailGroupMemberSource = Database["public"]["Enums"]["email_group_member_source"];
export type PackageTier = Database["public"]["Enums"]["package_tier"];

type SyncableEmailGroup = Pick<
  EmailGroup,
  | "id"
  | "name"
  | "member_type"
  | "sync_mode"
  | "dynamic_registration_campaign_id"
  | "dynamic_package_tier"
  | "dynamic_pipeline_stage"
>;

type ApplicationSyncCandidate = Pick<
  RegistrationApplication,
  | "id"
  | "campaign_id"
  | "company_id"
  | "company_name"
  | "contact_email"
  | "requested_package_id"
  | "approved_package_id"
  | "status"
  | "approved_at"
  | "updated_at"
  | "created_at"
>;

export type EmailGroupCampaignOption = {
  id: string;
  label: string;
  eventName: string | null;
};

type GroupUpdatePayload = Pick<
  TableUpdate<"email_groups">,
  | "name"
  | "description"
  | "member_type"
  | "sync_mode"
  | "dynamic_registration_campaign_id"
  | "dynamic_package_tier"
  | "dynamic_pipeline_stage"
>;

type CampaignContext = {
  campaign: EmailGroupCampaignOption;
  applications: ApplicationSyncCandidate[];
  packageTierById: Map<string, PackageTier | null>;
  latestCrmStageByCompany: Map<string, CrmPipelineStage>;
};

const PACKAGE_TIERS = ["standard", "silver", "gold", "platinum"] as const satisfies readonly PackageTier[];
const EMAIL_GROUP_SYNC_MODES = ["manual", "dynamic_registration"] as const satisfies readonly EmailGroupSyncMode[];

export const EMAIL_GROUP_SYNC_MODE_OPTIONS = [
  { value: "manual", label: "Manuell gruppe" },
  { value: "dynamic_registration", label: "Dynamisk fra påmelding" },
] as const;

export const EMAIL_GROUP_PACKAGE_OPTIONS = [
  { value: "", label: "Alle pakker" },
  { value: "standard", label: "Standard" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "platinum", label: "Platinum" },
] as const;

const PACKAGE_TIER_LABELS: Record<PackageTier, string> = {
  standard: "Standard",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

function norm(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function asPackageTier(value: string): PackageTier | null {
  return PACKAGE_TIERS.includes(value as PackageTier) ? (value as PackageTier) : null;
}

function asSyncMode(value: string): EmailGroupSyncMode {
  return EMAIL_GROUP_SYNC_MODES.includes(value as EmailGroupSyncMode)
    ? (value as EmailGroupSyncMode)
    : "manual";
}

function asPipelineStage(value: string): CrmPipelineStage | null {
  return CRM_PIPELINE_STAGES.includes(value as CrmPipelineStage) ? (value as CrmPipelineStage) : null;
}

function toSortableTimestamp(value: ApplicationSyncCandidate) {
  return (
    Date.parse(value.approved_at ?? "") ||
    Date.parse(value.updated_at ?? "") ||
    Date.parse(value.created_at ?? "") ||
    0
  );
}

export function selectLatestCompanyApplications(applications: ApplicationSyncCandidate[]) {
  const sorted = [...applications].sort((left, right) => toSortableTimestamp(right) - toSortableTimestamp(left));
  const byCompanyId = new Map<string, ApplicationSyncCandidate>();

  for (const application of sorted) {
    if (!application.company_id) continue;
    if (!byCompanyId.has(application.company_id)) {
      byCompanyId.set(application.company_id, application);
    }
  }

  return [...byCompanyId.values()];
}

export function filterApplicationsForDynamicGroup(
  applications: ApplicationSyncCandidate[],
  group: Pick<SyncableEmailGroup, "dynamic_package_tier" | "dynamic_pipeline_stage">,
  packageTierById: Map<string, PackageTier | null>,
  latestCrmStageByCompany: Map<string, CrmPipelineStage>,
) {
  return applications.filter((application) => {
    if (!application.company_id) return false;

    if (group.dynamic_package_tier) {
      const packageTier =
        packageTierById.get(application.approved_package_id ?? application.requested_package_id ?? "") ?? null;
      if (packageTier !== group.dynamic_package_tier) return false;
    }

    if (group.dynamic_pipeline_stage) {
      const latestStage = latestCrmStageByCompany.get(normalizeCrmText(application.company_name));
      if (latestStage !== group.dynamic_pipeline_stage) return false;
    }

    return true;
  });
}

export function parseEmailGroupFormData(formData: FormData): GroupUpdatePayload {
  const name = norm(formData.get("name"));
  const description = norm(formData.get("description")) || null;
  const memberType = norm(formData.get("member_type")) as EmailGroup["member_type"];
  const syncMode = asSyncMode(norm(formData.get("sync_mode")));
  const dynamicCampaignId = norm(formData.get("dynamic_registration_campaign_id")) || null;
  const dynamicPackageTier = asPackageTier(norm(formData.get("dynamic_package_tier")));
  const dynamicPipelineStage = asPipelineStage(norm(formData.get("dynamic_pipeline_stage")));

  if (!name) {
    throw new Error("Navn er påkrevd.");
  }

  if (!["company", "student"].includes(memberType)) {
    throw new Error("Ugyldig gruppetype.");
  }

  if (syncMode === "dynamic_registration") {
    if (memberType !== "company") {
      throw new Error("Dynamisk synk støttes kun for bedriftsgrupper.");
    }
    if (!dynamicCampaignId) {
      throw new Error("Velg registreringskampanje for dynamisk gruppe.");
    }
  }

  return {
    name,
    description,
    member_type: memberType,
    sync_mode: syncMode,
    dynamic_registration_campaign_id: syncMode === "dynamic_registration" ? dynamicCampaignId : null,
    dynamic_package_tier: syncMode === "dynamic_registration" ? dynamicPackageTier : null,
    dynamic_pipeline_stage: syncMode === "dynamic_registration" ? dynamicPipelineStage : null,
  };
}

export function describeEmailGroupSync(
  group: Pick<
    SyncableEmailGroup,
    "sync_mode" | "dynamic_registration_campaign_id" | "dynamic_package_tier" | "dynamic_pipeline_stage"
  >,
  campaignsById: Record<string, EmailGroupCampaignOption>,
) {
  if (group.sync_mode === "manual") {
    return "Manuell gruppe";
  }

  const parts = [
    campaignsById[group.dynamic_registration_campaign_id ?? ""]?.label ?? "Ukjent kampanje",
    group.dynamic_package_tier ? PACKAGE_TIER_LABELS[group.dynamic_package_tier] : "Alle pakker",
  ];

  if (group.dynamic_pipeline_stage) {
    parts.push(group.dynamic_pipeline_stage);
  }

  return `Dynamisk: ${parts.join(" / ")}`;
}

export async function listEmailGroupCampaignOptions(): Promise<EmailGroupCampaignOption[]> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("event_registration_campaigns")
    .select("id, public_title, slug, event:events(name)")
    .order("public_title");

  if (error) {
    throw new Error(`Kunne ikke hente registreringskampanjer: ${error.message}`);
  }

  return ((data ?? []) as Array<{
    id: string;
    public_title: string;
    slug: string;
    event: { name?: string } | null;
  }>).map((campaign) => ({
    id: campaign.id,
    label: campaign.public_title,
    eventName: campaign.event?.name ?? null,
  }));
}

export async function clearDynamicEmailGroupMembers(groupId: string) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("email_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("source", "dynamic_registration");

  if (error) {
    throw new Error(`Kunne ikke rydde dynamiske medlemmer: ${error.message}`);
  }
}

async function loadCampaignContexts(groups: SyncableEmailGroup[]) {
  const supabase = createAdminSupabaseClient();
  const campaignIds = [...new Set(groups.map((group) => group.dynamic_registration_campaign_id).filter(Boolean))] as string[];

  if (campaignIds.length === 0) {
    return new Map<string, CampaignContext>();
  }

  const [{ data: campaignsData, error: campaignsError }, { data: applicationsData, error: applicationsError }, { data: packagesData, error: packagesError }] = await Promise.all([
    supabase
      .from("event_registration_campaigns")
      .select("id, public_title, slug, event:events(name)")
      .in("id", campaignIds),
    supabase
      .from("event_registration_applications")
      .select("id, campaign_id, company_id, company_name, contact_email, requested_package_id, approved_package_id, status, approved_at, updated_at, created_at")
      .in("campaign_id", campaignIds)
      .in("status", ["pending", "approved"]),
    supabase
      .from("event_registration_packages")
      .select("id, campaign_id, mapped_package")
      .in("campaign_id", campaignIds),
  ]);

  if (campaignsError) throw new Error(`Kunne ikke hente kampanjer for gruppesynk: ${campaignsError.message}`);
  if (applicationsError) throw new Error(`Kunne ikke hente registrerte bedrifter: ${applicationsError.message}`);
  if (packagesError) throw new Error(`Kunne ikke hente pakker for gruppesynk: ${packagesError.message}`);

  const typedCampaigns = (campaignsData ?? []) as Array<{
    id: string;
    public_title: string;
    slug: string;
    event: { name?: string } | null;
  }>;
  const typedApplications = (applicationsData ?? []) as ApplicationSyncCandidate[];
  const typedPackages = (packagesData ?? []) as Pick<RegistrationPackage, "id" | "campaign_id" | "mapped_package">[];

  const eventNames = [...new Set(typedCampaigns.map((campaign) => campaign.event?.name).filter(Boolean))] as string[];
  const needsPipelineLookup = groups.some((group) => Boolean(group.dynamic_pipeline_stage));

  let crmRows: Array<Pick<TableRow<"crm_pipeline_entries">, "company" | "company_status" | "event_name" | "updated_at">> = [];
  if (needsPipelineLookup && eventNames.length > 0) {
    const { data, error } = await supabase
      .from("crm_pipeline_entries")
      .select("company, company_status, event_name, updated_at")
      .in("event_name", eventNames)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Kunne ikke hente CRM-stadier for gruppesynk: ${error.message}`);
    }

    crmRows = (data ?? []) as typeof crmRows;
  }

  const latestStageByEvent = new Map<string, Map<string, CrmPipelineStage>>();
  for (const row of crmRows) {
    const eventName = row.event_name.trim();
    if (!eventName) continue;

    const normalizedCompany = normalizeCrmText(row.company);
    if (!normalizedCompany) continue;

    let eventMap = latestStageByEvent.get(eventName);
    if (!eventMap) {
      eventMap = new Map<string, CrmPipelineStage>();
      latestStageByEvent.set(eventName, eventMap);
    }

    if (!eventMap.has(normalizedCompany)) {
      eventMap.set(normalizedCompany, row.company_status as CrmPipelineStage);
    }
  }

  const packageTierByCampaign = new Map<string, Map<string, PackageTier | null>>();
  for (const pkg of typedPackages) {
    let campaignPackages = packageTierByCampaign.get(pkg.campaign_id);
    if (!campaignPackages) {
      campaignPackages = new Map<string, PackageTier | null>();
      packageTierByCampaign.set(pkg.campaign_id, campaignPackages);
    }
    campaignPackages.set(pkg.id, pkg.mapped_package);
  }

  const applicationsByCampaign = new Map<string, ApplicationSyncCandidate[]>();
  for (const application of typedApplications) {
    if (!application.company_id) continue;
    const list = applicationsByCampaign.get(application.campaign_id) ?? [];
    list.push(application);
    applicationsByCampaign.set(application.campaign_id, list);
  }

  const contextByCampaign = new Map<string, CampaignContext>();
  for (const campaign of typedCampaigns) {
    contextByCampaign.set(campaign.id, {
      campaign: {
        id: campaign.id,
        label: campaign.public_title,
        eventName: campaign.event?.name ?? null,
      },
      applications: selectLatestCompanyApplications(applicationsByCampaign.get(campaign.id) ?? []),
      packageTierById: packageTierByCampaign.get(campaign.id) ?? new Map<string, PackageTier | null>(),
      latestCrmStageByCompany: campaign.event?.name
        ? latestStageByEvent.get(campaign.event.name) ?? new Map<string, CrmPipelineStage>()
        : new Map<string, CrmPipelineStage>(),
    });
  }

  return contextByCampaign;
}

export async function syncDynamicEmailGroups(input: {
  groupIds?: string[];
  campaignId?: string;
} = {}) {
  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("email_groups")
    .select("id, name, member_type, sync_mode, dynamic_registration_campaign_id, dynamic_package_tier, dynamic_pipeline_stage")
    .eq("sync_mode", "dynamic_registration");

  if (input.groupIds?.length) {
    query = query.in("id", input.groupIds);
  }
  if (input.campaignId) {
    query = query.eq("dynamic_registration_campaign_id", input.campaignId);
  }

  const { data, error } = await query.order("name");
  if (error) {
    throw new Error(`Kunne ikke hente dynamiske e-postgrupper: ${error.message}`);
  }

  const groups = ((data ?? []) as SyncableEmailGroup[]).filter(
    (group) => group.member_type === "company" && group.dynamic_registration_campaign_id,
  );

  if (groups.length === 0) {
    return [];
  }

  const { data: existingMembersData, error: existingMembersError } = await supabase
    .from("email_group_members")
    .select("id, group_id, company_id, source")
    .in("group_id", groups.map((group) => group.id))
    .eq("source", "dynamic_registration");

  if (existingMembersError) {
    throw new Error(`Kunne ikke hente eksisterende gruppemedlemmer: ${existingMembersError.message}`);
  }

  const existingMembersByGroup = new Map<string, Array<Pick<EmailGroupMember, "id" | "group_id" | "company_id" | "source">>>();
  for (const member of (existingMembersData ?? []) as Array<Pick<EmailGroupMember, "id" | "group_id" | "company_id" | "source">>) {
    const list = existingMembersByGroup.get(member.group_id) ?? [];
    list.push(member);
    existingMembersByGroup.set(member.group_id, list);
  }

  const contexts = await loadCampaignContexts(groups);

  for (const group of groups) {
    const context = contexts.get(group.dynamic_registration_campaign_id!);
    if (!context) continue;

    const targetApplications = filterApplicationsForDynamicGroup(
      context.applications,
      group,
      context.packageTierById,
      context.latestCrmStageByCompany,
    );

    const upserts: TableInsert<"email_group_members">[] = targetApplications.map((application) => ({
      group_id: group.id,
      company_id: application.company_id,
      email: normalizeEmail(application.contact_email),
      display_name: application.company_name,
      source: "dynamic_registration",
    }));

    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from("email_group_members")
        .upsert(upserts, { onConflict: "group_id,company_id" });

      if (upsertError) {
        throw new Error(`Kunne ikke synke gruppen ${group.name}: ${upsertError.message}`);
      }
    }

    const keepCompanyIds = new Set(upserts.map((member) => member.company_id).filter(Boolean) as string[]);
    const staleIds = (existingMembersByGroup.get(group.id) ?? [])
      .filter((member) => !member.company_id || !keepCompanyIds.has(member.company_id))
      .map((member) => member.id);

    if (staleIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("email_group_members")
        .delete()
        .in("id", staleIds);

      if (deleteError) {
        throw new Error(`Kunne ikke rydde gamle medlemmer i ${group.name}: ${deleteError.message}`);
      }
    }
  }

  return groups;
}
