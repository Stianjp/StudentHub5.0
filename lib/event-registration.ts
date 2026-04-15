import { randomUUID } from "crypto";
import { unstable_cache } from "next/cache";
import type { TableRow } from "@/lib/types/database";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { publicRegistrationApplicationSchema } from "@/lib/validation/event-registration";
import { getBaseUrlForRole } from "@/lib/auth-urls";
import { sendTransactionalEmail } from "@/lib/resend";
import {
  buildRegistrationConfirmationHtml,
  buildRegistrationNotificationHtml,
  buildRegistrationPackageGroupName,
} from "@/lib/event-registration-automation";
import { getPreviewRegistrationDetail, listPreviewRegistrationCampaigns } from "@/lib/event-registration-fixtures";
import { hasAdminSupabaseEnv, hasSupabaseEnv, shouldBypassSupabaseInDev } from "@/lib/supabase/env";
import {
  listCompanyEventCrmEntries,
  syncCompanyEventPipelineStage,
  syncCrmLeadEntry,
} from "@/lib/crm-supabase";
import { syncDynamicEmailGroups } from "@/lib/email-groups";
import { applyPublicRegistrationStandOverrides } from "@/lib/event-registration-stand-overrides";
import { getLatestCompanyRegistrationLogos } from "@/lib/company";

type RegistrationCampaign = TableRow<"event_registration_campaigns">;
type RegistrationPackage = TableRow<"event_registration_packages">;
type RegistrationStand = TableRow<"event_registration_stands">;
type RegistrationApplication = TableRow<"event_registration_applications">;
type RegistrationPortalEmail = TableRow<"event_registration_portal_emails">;
type CompanyPortalInvite = TableRow<"company_portal_invites">;
type Event = TableRow<"events">;
type Company = TableRow<"companies">;
type EventCompany = TableRow<"event_companies">;
type EmailLog = TableRow<"email_logs">;
type EmailGroup = TableRow<"email_groups">;
type EmailGroupMember = TableRow<"email_group_members">;
type CrmPipelineEntry = TableRow<"crm_pipeline_entries">;

type PublicEventSummary = Pick<Event, "id" | "name" | "slug" | "starts_at" | "ends_at" | "location" | "registration_form_url">;
type PublicCampaign = RegistrationCampaign & { event: PublicEventSummary };
export type PublicStandBookingPreview = {
  companyName: string;
  logoUrl: string | null;
  candidateSummary: string | null;
  candidateLevelLabel: string | null;
};
export type PublicRegistrationStand = RegistrationStand & {
  bookingPreview?: PublicStandBookingPreview | null;
};
type PublicCampaignDetail = {
  campaign: PublicCampaign;
  packages: RegistrationPackage[];
  stands: PublicRegistrationStand[];
};

const LOGO_BUCKET = "event-registration-assets";
const COMPANY_PORTAL_FALLBACK_URL = "https://bedrift.oslostudenthub.no";
const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "me.com",
  "yahoo.com",
  "proton.me",
  "protonmail.com",
]);

function buildRegistrationLeadId(applicationId: string) {
  return `reg-${applicationId}`;
}

function shouldUsePreviewRegistrationData() {
  if (shouldBypassSupabaseInDev()) {
    return true;
  }

  return !hasSupabaseEnv() && !process.env.VERCEL;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeOrgNumber(value: string) {
  return value.replace(/\s+/g, "");
}

function slugifyFileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function candidateLevelLabel(value: RegistrationApplication["candidate_level"]) {
  if (value === "bachelor") return "Bachelor";
  if (value === "master") return "Master";
  return "Bachelor og master";
}

function candidateLevelToRecruitmentLevels(value: RegistrationApplication["candidate_level"]) {
  if (value === "bachelor") return ["Bachelor"];
  if (value === "master") return ["Master"];
  return ["Bachelor", "Master"];
}

function buildCandidateSummary(application: Pick<RegistrationApplication, "candidate_fields" | "candidate_fields_other">) {
  const fields = [...application.candidate_fields];
  if (application.candidate_fields_other) {
    fields.push(application.candidate_fields_other);
  }
  if (fields.length === 0) return null;
  return fields.slice(0, 4).join(", ");
}

async function attachStandBookingPreviews(slug: string, stands: RegistrationStand[]) {
  const assignedApplicationIds = [...new Set(stands.map((stand) => stand.assigned_application_id).filter(Boolean))];
  if (assignedApplicationIds.length === 0) {
    return applyPublicRegistrationStandOverrides(
      slug,
      stands.map((stand) => ({ ...stand, bookingPreview: null })) as PublicRegistrationStand[],
    );
  }

  if (!hasAdminSupabaseEnv()) {
    return applyPublicRegistrationStandOverrides(
      slug,
      stands.map((stand) => ({ ...stand, bookingPreview: null })) as PublicRegistrationStand[],
    );
  }

  const supabase = createAdminSupabaseClient();
  const { data: applications, error } = await supabase
    .from("event_registration_applications")
    .select("id, company_id, company_name, candidate_level, candidate_fields, candidate_fields_other, logo_path")
    .in("id", assignedApplicationIds);

  if (error) throw error;

  const typedApplications = (applications ?? []) as Array<
    Pick<
      RegistrationApplication,
      | "id"
      | "company_id"
      | "company_name"
      | "candidate_level"
      | "candidate_fields"
      | "candidate_fields_other"
      | "logo_path"
    >
  >;

  const companyLogoMap = await getLatestCompanyRegistrationLogos(
    typedApplications
      .map((application) => application.company_id ?? "")
      .filter(Boolean),
  );
  const logoUrlMap = new Map<string, string | null>();
  await Promise.all(
    typedApplications.map(async (application) => {
      const companyLogoUrl = application.company_id
        ? companyLogoMap[application.company_id] ?? null
        : null;
      if (companyLogoUrl) {
        logoUrlMap.set(application.id, companyLogoUrl);
        return;
      }
      if (!application.logo_path) {
        logoUrlMap.set(application.id, null);
        return;
      }
      const { data: signed } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(application.logo_path, 60 * 60);
      logoUrlMap.set(application.id, signed?.signedUrl ?? null);
    }),
  );

  const applicationMap = new Map(typedApplications.map((application) => [application.id, application]));

  return applyPublicRegistrationStandOverrides(
    slug,
    stands.map((stand) => {
      const application = stand.assigned_application_id ? applicationMap.get(stand.assigned_application_id) : null;
      if (!application) {
        return { ...stand, bookingPreview: null };
      }

      return {
        ...stand,
        bookingPreview: {
          companyName: application.company_name,
          logoUrl: logoUrlMap.get(application.id) ?? null,
          candidateSummary: buildCandidateSummary(application),
          candidateLevelLabel: candidateLevelLabel(application.candidate_level),
        },
      };
    }) as PublicRegistrationStand[],
  );
}

function isCampaignOpen(campaign: RegistrationCampaign) {
  const now = Date.now();
  const opensAt = campaign.opens_at ? new Date(campaign.opens_at).getTime() : null;
  const closesAt = campaign.closes_at ? new Date(campaign.closes_at).getTime() : null;
  if (!campaign.is_published) return false;
  if (opensAt && now < opensAt) return false;
  if (closesAt && now > closesAt) return false;
  return true;
}

const PUBLIC_EVENT_FIELDS = "id, name, slug, starts_at, ends_at, location, registration_form_url";

async function fetchPublicRegistrationCampaigns() {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("event_registration_campaigns")
    .select(`*, event:events(${PUBLIC_EVENT_FIELDS})`)
    .order("opens_at", { ascending: true });

  if (error) throw error;

  const campaigns = (data ?? []) as unknown as PublicCampaign[];
  return campaigns.filter((campaign) => isCampaignOpen(campaign));
}

async function fetchPublicRegistrationCampaignDetail(slug: string): Promise<PublicCampaignDetail | null> {
  const supabase = createPublicSupabaseClient();
  const { data: campaign, error } = await supabase
    .from("event_registration_campaigns")
    .select(`*, event:events(${PUBLIC_EVENT_FIELDS})`)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!campaign) return null;

  const typedCampaign = campaign as unknown as PublicCampaign;

  if (!isCampaignOpen(typedCampaign)) {
    return null;
  }

  const [{ data: packages, error: packagesError }, { data: stands, error: standsError }] = await Promise.all([
    supabase
      .from("event_registration_packages")
      .select("*")
      .eq("campaign_id", typedCampaign.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("event_registration_stands")
      .select("*")
      .eq("campaign_id", typedCampaign.id)
      .order("sort_order", { ascending: true }),
  ]);

  if (packagesError) throw packagesError;
  if (standsError) throw standsError;

  const typedStands = (stands ?? []) as RegistrationStand[];

  return {
    campaign: typedCampaign,
    packages: (packages ?? []) as RegistrationPackage[],
    stands: await attachStandBookingPreviews(typedCampaign.slug, typedStands),
  };
}

const loadPublicRegistrationCampaigns = unstable_cache(fetchPublicRegistrationCampaigns, ["event-registration-public-campaigns"], {
  revalidate: 300,
});

const loadPublicRegistrationCampaignDetail = unstable_cache(
  fetchPublicRegistrationCampaignDetail,
  ["event-registration-public-campaign-detail"],
  { revalidate: 300 },
);

function inferStandTypeFromPackage(packageTier: RegistrationPackage["mapped_package"]) {
  if (packageTier === "silver") return "Silver";
  if (packageTier === "gold") return "Gold";
  if (packageTier === "platinum") return "Platinum";
  return "Standard";
}

async function releaseStandReservation(standId: string | null | undefined) {
  if (!standId) return;
  const supabase = createAdminSupabaseClient();
  try {
    await supabase
      .from("event_registration_stands")
      .update({
        status: "available",
        assigned_application_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", standId);
  } catch {
    return;
  }
}

async function sendRegistrationNotificationEmail(input: {
  applicationId: string;
  companyName: string;
  eventName: string;
  packageName: string;
  contactName: string;
  contactEmail: string;
}) {
  const supabase = createAdminSupabaseClient();
  const subject = `Ny registrert bedrift: ${input.companyName} bestilte ${input.packageName}`;

  await sendTransactionalEmail({
    to: "stian@oslostudenthub.no",
    subject,
    type: "registration_notification",
    html: buildRegistrationNotificationHtml(input),
    payload: {
      applicationId: input.applicationId,
      companyName: input.companyName,
      eventName: input.eventName,
      packageName: input.packageName,
      contactEmail: input.contactEmail,
    },
    supabase,
  });
}

async function sendRegistrationConfirmationEmail(input: {
  applicationId: string;
  companyName: string;
  eventName: string;
  packageName: string;
  contactEmail: string;
  portalEmails: string[];
}) {
  const supabase = createAdminSupabaseClient();

  await sendTransactionalEmail({
    to: input.contactEmail,
    subject: `Vi har mottatt registreringen til ${input.eventName}`,
    type: "registration_confirmation",
    html: buildRegistrationConfirmationHtml(input),
    payload: {
      applicationId: input.applicationId,
      companyName: input.companyName,
      eventName: input.eventName,
      packageName: input.packageName,
      portalEmails: input.portalEmails,
    },
    supabase,
  });
}

async function ensurePackageEmailGroupMembership(input: {
  campaign: RegistrationCampaign;
  packageTier: RegistrationPackage["mapped_package"];
  company: Company;
  companyName: string;
  contactEmail: string;
}) {
  if (!input.packageTier) {
    throw new Error("Approved package is missing a mapped package tier.");
  }

  const groupName = buildRegistrationPackageGroupName(input.campaign.email_group_prefix, input.packageTier);
  if (!groupName) {
    throw new Error("Sett et e-postgruppe-prefiks på kampanjen før bedrifter kan godkjennes.");
  }

  const supabase = createAdminSupabaseClient();
  const { data: existingGroups, error: groupLookupError } = await supabase
    .from("email_groups")
    .select("*")
    .eq("name", groupName)
    .limit(1);

  if (groupLookupError) throw groupLookupError;

  let group = ((existingGroups ?? [])[0] ?? null) as EmailGroup | null;
  if (group && group.member_type !== "company") {
    throw new Error(`E-postgruppen ${groupName} finnes allerede, men er ikke en bedriftsgruppe.`);
  }

  if (!group) {
    const { data: createdGroup, error: createGroupError } = await supabase
      .from("email_groups")
      .insert({
        name: groupName,
        description: `Autoopprettet gruppe for ${input.campaign.slug} / ${input.packageTier}.`,
        member_type: "company",
      })
      .select("*")
      .single();

    if (createGroupError) throw createGroupError;
    group = createdGroup as EmailGroup;
  }

  const { error: membershipError } = await supabase
    .from("email_group_members")
    .upsert(
      {
        group_id: group.id,
        company_id: input.company.id,
        email: normalizeEmail(input.contactEmail),
        display_name: input.companyName,
        source: "registration_auto",
      },
      { onConflict: "group_id,company_id" },
    );

  if (membershipError) throw membershipError;

  return group;
}

async function findAuthUserByEmail(email: string) {
  const supabase = createAdminSupabaseClient();
  const target = normalizeEmail(email);

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) throw error;

    const match = data.users.find((user) => normalizeEmail(user.email ?? "") === target);
    if (match) return match;

    if (data.users.length < 200) break;
  }

  return null;
}

async function ensureCompanyPortalAccessRequest(input: {
  userId: string;
  email: string;
  company: Company;
  application: RegistrationApplication;
}) {
  const supabase = createAdminSupabaseClient();
  const normalizedEmail = normalizeEmail(input.email);
  const domain = normalizedEmail.split("@")[1] ?? "";

  if (!domain) return;

  const { error } = await supabase
    .from("company_user_requests")
    .upsert(
      {
        user_id: input.userId,
        email: normalizedEmail,
        domain,
        company_id: input.company.id,
        org_number:
          normalizeOrgNumber(input.company.org_number ?? "") ||
          normalizeOrgNumber(input.application.org_number ?? "") ||
          null,
      },
      { onConflict: "user_id" },
    );

  if (error) throw error;
}

async function ensureCompanyDomainForEmail(companyId: string, email: string) {
  const supabase = createAdminSupabaseClient();
  const normalizedEmail = normalizeEmail(email);
  const domain = normalizedEmail.split("@")[1] ?? "";

  if (!domain || PERSONAL_EMAIL_DOMAINS.has(domain)) return;

  const { data: existing, error: existingError } = await supabase
    .from("company_domains")
    .select("company_id")
    .eq("domain", domain)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.company_id) return;

  const { error } = await supabase
    .from("company_domains")
    .insert({
      company_id: companyId,
      domain,
    });

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    throw error;
  }
}

async function ensureCompanyFromApplication(input: {
  application: RegistrationApplication;
}) {
  const supabase = createAdminSupabaseClient();
  const normalizedOrgNumber = normalizeOrgNumber(input.application.org_number);
  const now = new Date().toISOString();

  const existingCompany =
    input.application.company_id
      ? await supabase.from("companies").select("*").eq("id", input.application.company_id).maybeSingle()
      : await supabase.from("companies").select("*").eq("org_number", normalizedOrgNumber).maybeSingle();

  if (existingCompany.error) throw existingCompany.error;

  if (existingCompany.data) {
    const { data, error } = await supabase
      .from("companies")
      .update({
        name: input.application.company_name,
        org_number: normalizedOrgNumber,
        address: input.application.address,
        postal_code: input.application.postal_code,
        city: input.application.city,
        country: input.application.country,
        location: `${input.application.city}, ${input.application.country}`,
        logo_path: input.application.logo_path ?? existingCompany.data.logo_path ?? null,
        recruitment_fields:
          input.application.candidate_fields.length > 0
            ? input.application.candidate_fields
            : existingCompany.data.recruitment_fields,
        recruitment_levels: candidateLevelToRecruitmentLevels(input.application.candidate_level),
        updated_at: now,
      })
      .eq("id", existingCompany.data.id)
      .select("*")
      .single();

    if (error) throw error;
    return { company: data as Company, created: false };
  }

  const { data, error } = await supabase
    .from("companies")
    .insert({
      name: input.application.company_name,
      org_number: normalizedOrgNumber,
      address: input.application.address,
      postal_code: input.application.postal_code,
      city: input.application.city,
      country: input.application.country,
      location: `${input.application.city}, ${input.application.country}`,
      logo_path: input.application.logo_path,
      recruitment_fields: input.application.candidate_fields,
      recruitment_levels: candidateLevelToRecruitmentLevels(input.application.candidate_level),
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw error;
  return { company: data as Company, created: true };
}

async function ensureEventCompanyFromApplication(input: {
  application: RegistrationApplication;
  company: Company;
  packageTier: RegistrationPackage["mapped_package"];
  standCode?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("event_companies")
    .upsert(
      {
        id: input.application.event_company_id ?? undefined,
        event_id: input.application.event_id,
        company_id: input.company.id,
        package: input.packageTier ?? "standard",
        stand_type: inferStandTypeFromPackage(input.packageTier),
        stand_code: input.standCode ?? null,
        registered_at: now,
        updated_at: now,
      },
      { onConflict: "event_id,company_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as EventCompany;
}

async function ensurePendingPortalAccessForEmail(input: {
  company: Company;
  application: RegistrationApplication;
  email: string;
}) {
  const supabase = createAdminSupabaseClient();
  const normalizedEmail = normalizeEmail(input.email);
  const now = new Date().toISOString();

  const existingUser = await findAuthUserByEmail(normalizedEmail);
  let authUserId = existingUser?.id ?? null;

  if (!authUserId) {
    const companyPortalUrl = getBaseUrlForRole("company", COMPANY_PORTAL_FALLBACK_URL) || COMPANY_PORTAL_FALLBACK_URL;
    const redirectTo = `${companyPortalUrl}/auth/callback?role=company&mode=verify&next=%2Fcompany`;
    const inviteResponse = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo,
    });
    if (inviteResponse.error) throw inviteResponse.error;

    authUserId =
      (inviteResponse.data as { user?: { id?: string | null } } | null)?.user?.id ??
      (await findAuthUserByEmail(normalizedEmail))?.id ??
      null;
  }

  if (authUserId) {
    await ensureCompanyPortalAccessRequest({
      userId: authUserId,
      email: normalizedEmail,
      company: input.company,
      application: input.application,
    });
  }

  const { error } = await supabase
    .from("company_portal_invites")
    .upsert(
      {
        company_id: input.company.id,
        application_id: input.application.id,
        email: normalizedEmail,
        role: "member",
        status: authUserId ? "invited" : "pending",
        invited_at: authUserId ? now : null,
        user_id: authUserId,
        updated_at: now,
      },
      { onConflict: "company_id,email" },
    );

  if (error) throw error;
}

async function sendCompanyPortalInvite(input: {
  invite: CompanyPortalInvite;
  company: Company;
  application: RegistrationApplication;
}) {
  const supabase = createAdminSupabaseClient();
  const companyPortalUrl = getBaseUrlForRole("company", COMPANY_PORTAL_FALLBACK_URL) || COMPANY_PORTAL_FALLBACK_URL;
  const normalizedEmail = normalizeEmail(input.invite.email);
  const now = new Date().toISOString();
  const subject = `Company portal setup for ${input.company.name}`;
  const loginUrl = `${companyPortalUrl}/auth/sign-in?role=company&next=%2Fcompany`;
  const existingUser = await findAuthUserByEmail(normalizedEmail);
  let authUserId = existingUser?.id ?? null;
  const { data: event } = await supabase
    .from("events")
    .select("name")
    .eq("id", input.application.event_id)
    .maybeSingle();
  const eventName = event?.name ?? "your event";

  if (!existingUser) {
    const redirectTo = `${companyPortalUrl}/auth/callback?role=company&mode=verify&next=%2Fcompany`;
    const inviteResponse = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo,
    });
    if (inviteResponse.error) throw inviteResponse.error;

    const invitedUserId =
      (inviteResponse.data as { user?: { id?: string | null } } | null)?.user?.id ?? null;
    const matchedUserId = (await findAuthUserByEmail(normalizedEmail))?.id ?? null;
    authUserId = invitedUserId || matchedUserId || null;
  } else {
    authUserId = existingUser.id;
  }

  if (authUserId) {
    await ensureCompanyPortalAccessRequest({
      userId: authUserId,
      email: normalizedEmail,
      company: input.company,
      application: input.application,
    });
  }

  const inviteCopy = existingUser
    ? `<p>Hello,</p>
<p>OSH has approved ${input.company.name} for ${eventName}.</p>
<p>This email is now registered for the company portal. Your access request is waiting for manual approval from an OSH admin under access requests.</p>
<p>You can sign in with this email here: <a href="${loginUrl}">${loginUrl}</a></p>`
    : `<p>Hello,</p>
<p>OSH has approved ${input.company.name} for ${eventName}.</p>
<p>We have sent you an account invitation so you can create your company portal user.</p>
<p>After account setup, the access request remains pending until an OSH admin approves it manually under access requests.</p>
<p>After that approval, you can sign in here: <a href="${loginUrl}">${loginUrl}</a></p>`;

  await sendTransactionalEmail({
    to: normalizedEmail,
    subject,
    type: "company_portal_invite",
    html: inviteCopy,
    payload: {
      companyId: input.company.id,
      applicationId: input.application.id,
      delivery: existingUser ? "login_notice_pending_approval" : "supabase_invite_pending_approval",
      accessRequestCreated: Boolean(authUserId),
    },
    supabase,
  });

  const { error: updateError } = await supabase
    .from("company_portal_invites")
    .update({
      status: "invited",
      invited_at: now,
      user_id: authUserId ?? input.invite.user_id ?? null,
      updated_at: now,
    })
    .eq("id", input.invite.id);

  if (updateError) throw updateError;
}

export async function listPublicRegistrationCampaigns() {
  if (shouldUsePreviewRegistrationData()) {
    return listPreviewRegistrationCampaigns();
  }
  if (process.env.NODE_ENV !== "production") {
    return fetchPublicRegistrationCampaigns();
  }
  return loadPublicRegistrationCampaigns();
}

export async function getPublicRegistrationCampaignBySlug(slug: string): Promise<PublicCampaignDetail | null> {
  if (shouldUsePreviewRegistrationData()) {
    return getPreviewRegistrationDetail(slug);
  }
  if (process.env.NODE_ENV !== "production") {
    return fetchPublicRegistrationCampaignDetail(slug);
  }
  return loadPublicRegistrationCampaignDetail(slug);
}

export async function submitPublicRegistrationApplication(input: {
  slug: string;
  formData: FormData;
}) {
  if (shouldUsePreviewRegistrationData()) {
    throw new Error("Submitting registrations requires configured Supabase environment variables.");
  }

  const supabase = createAdminSupabaseClient();
  const detail = await getPublicRegistrationCampaignBySlug(input.slug);
  if (!detail) {
    throw new Error("This registration is not available.");
  }

  const file = input.formData.get("logo");
  const candidateFields = input.formData.getAll("candidateFields");
  const standNeeds = input.formData.getAll("standNeeds");
  const portalEmails = input.formData
    .getAll("portalEmails")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const parsed = publicRegistrationApplicationSchema.safeParse({
    contactFirstName: input.formData.get("contactFirstName"),
    contactLastName: input.formData.get("contactLastName"),
    contactEmail: input.formData.get("contactEmail"),
    contactPhone: input.formData.get("contactPhone"),
    contactJobTitle: input.formData.get("contactJobTitle"),
    companyName: input.formData.get("companyName"),
    orgNumber: normalizeOrgNumber(String(input.formData.get("orgNumber") ?? "")),
    country: input.formData.get("country"),
    address: input.formData.get("address"),
    city: input.formData.get("city"),
    postalCode: input.formData.get("postalCode"),
    invoiceDeliveryMethod: input.formData.get("invoiceDeliveryMethod"),
    invoiceEmail: input.formData.get("invoiceEmail"),
    invoiceReference: input.formData.get("invoiceReference"),
    candidateLevel: input.formData.get("candidateLevel"),
    candidateFields,
    candidateFieldsOther: input.formData.get("candidateFieldsOther"),
    requestedPackageId: input.formData.get("requestedPackageId"),
    requestedStandId: input.formData.get("requestedStandId"),
    standNeeds,
    standNeedsOther: input.formData.get("standNeedsOther"),
    notes: input.formData.get("notes"),
    portalEmails,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(" "));
  }

  const selectedPackage = detail.packages.find((pkg) => pkg.id === parsed.data.requestedPackageId);
  if (!selectedPackage) {
    throw new Error("Choose a package before submitting.");
  }

  let selectedStand: RegistrationStand | null = null;
  if (parsed.data.requestedStandId) {
    selectedStand = detail.stands.find((stand) => stand.id === parsed.data.requestedStandId) ?? null;
    if (!selectedStand) {
      throw new Error("Selected stand could not be found.");
    }
    if (selectedStand.status !== "available" || selectedStand.assigned_application_id) {
      throw new Error("Selected stand is no longer available.");
    }
  }

  if (selectedPackage.mapped_package && !selectedStand) {
    throw new Error("Choose a stand on the floor plan before submitting.");
  }

  if (selectedStand && selectedPackage.mapped_package && selectedStand.package_tier !== selectedPackage.mapped_package) {
    throw new Error("Selected stand does not match the chosen package.");
  }

  let logoPath: string | null = null;
  const applicationId = randomUUID();
  const logoFile = file instanceof File && file.size > 0 ? file : null;

  if (logoFile) {
    if (logoFile.size > 6 * 1024 * 1024) {
      throw new Error("Logo file must be 6 MB or smaller.");
    }
    if (!logoFile.type.startsWith("image/")) {
      throw new Error("Logo must be an image file.");
    }

    const extension = logoFile.name.includes(".") ? logoFile.name.split(".").pop() : "png";
    const safeName = slugifyFileName(logoFile.name || `logo.${extension}`);
    logoPath = `${detail.campaign.id}/${applicationId}/${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(logoPath, Buffer.from(await logoFile.arrayBuffer()), {
        contentType: logoFile.type,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }
  }

  const now = new Date().toISOString();
  const payload = {
    id: applicationId,
    campaign_id: detail.campaign.id,
    event_id: detail.campaign.event_id,
    requested_package_id: selectedPackage.id,
    requested_stand_id: selectedStand?.id ?? null,
    status: "pending" as const,
    contact_first_name: parsed.data.contactFirstName,
    contact_last_name: parsed.data.contactLastName,
    contact_email: normalizeEmail(parsed.data.contactEmail),
    contact_phone: parsed.data.contactPhone.trim(),
    contact_job_title: parsed.data.contactJobTitle || null,
    company_name: parsed.data.companyName.trim(),
    org_number: parsed.data.orgNumber,
    country: parsed.data.country.trim(),
    address: parsed.data.address.trim(),
    city: parsed.data.city.trim(),
    postal_code: parsed.data.postalCode.trim(),
    invoice_delivery_method: parsed.data.invoiceDeliveryMethod,
    invoice_email: parsed.data.invoiceDeliveryMethod === "email" ? normalizeEmail(parsed.data.invoiceEmail ?? "") : null,
    invoice_reference: parsed.data.invoiceReference || null,
    candidate_level: parsed.data.candidateLevel,
    candidate_fields: parsed.data.candidateFields,
    candidate_fields_other: parsed.data.candidateFieldsOther || null,
    stand_needs: parsed.data.standNeeds,
    stand_needs_other: parsed.data.standNeedsOther || null,
    notes: parsed.data.notes || null,
    logo_path: logoPath,
    created_at: now,
    updated_at: now,
  };

  const { error: insertError } = await supabase.from("event_registration_applications").insert(payload);
  if (insertError) {
    if (logoPath) {
      await supabase.storage.from(LOGO_BUCKET).remove([logoPath]).catch(() => undefined);
    }
    throw insertError;
  }

  // Lock the requested stand immediately so no other applicant can book it
  if (selectedStand) {
    const adminSupabase = createAdminSupabaseClient();
    await adminSupabase
      .from("event_registration_stands")
      .update({ status: "assigned", assigned_application_id: applicationId })
      .eq("id", selectedStand.id)
      .eq("status", "available"); // guard against double-booking in a race condition
  }

  const emailRows = parsed.data.portalEmails.map((email) => ({
    application_id: applicationId,
    email,
    created_at: now,
  }));

  const { error: emailError } = await supabase.from("event_registration_portal_emails").insert(emailRows);
  if (emailError) {
    await supabase.from("event_registration_applications").delete().eq("id", applicationId);
    await releaseStandReservation(selectedStand?.id);
    if (logoPath) {
      await supabase.storage.from(LOGO_BUCKET).remove([logoPath]).catch(() => undefined);
    }
    throw emailError;
  }

  try {
    const typedApplication = {
      ...payload,
      company_id: null,
      event_company_id: null,
      approved_package_id: null,
      approved_stand_id: null,
      approved_at: null,
      approved_by: null,
      rejected_at: null,
      rejected_by: null,
      rejection_reason: null,
    } as RegistrationApplication;
    const { company } = await ensureCompanyFromApplication({ application: typedApplication });
    const allRelevantEmails = [...new Set([
      normalizeEmail(parsed.data.contactEmail),
      ...parsed.data.portalEmails.map((email) => normalizeEmail(email)),
    ])];

    for (const email of allRelevantEmails) {
      await ensureCompanyDomainForEmail(company.id, email);
    }

    const eventCompany = await ensureEventCompanyFromApplication({
      application: typedApplication,
      company,
      packageTier: selectedPackage.mapped_package,
      standCode: selectedStand?.stand_code ?? null,
    });

    const { error: applicationLinkError } = await supabase
      .from("event_registration_applications")
      .update({
        company_id: company.id,
        event_company_id: eventCompany.id,
        updated_at: now,
      })
      .eq("id", applicationId);

    if (applicationLinkError) throw applicationLinkError;

    if (selectedPackage.mapped_package) {
      await ensurePackageEmailGroupMembership({
        campaign: detail.campaign,
        packageTier: selectedPackage.mapped_package,
        company,
        companyName: parsed.data.companyName.trim(),
        contactEmail: normalizeEmail(parsed.data.contactEmail),
      });
    }

    for (const portalEmail of [...new Set(parsed.data.portalEmails.map((email) => normalizeEmail(email)))]) {
      await ensurePendingPortalAccessForEmail({
        company,
        application: {
          ...typedApplication,
          company_id: company.id,
          event_company_id: eventCompany.id,
        },
        email: portalEmail,
      });
    }

    const contactName = `${parsed.data.contactFirstName} ${parsed.data.contactLastName}`.trim();
    const normalizedContactEmail = normalizeEmail(parsed.data.contactEmail);
    const crmLeadId = buildRegistrationLeadId(applicationId);

    await syncCrmLeadEntry({
      leadId: crmLeadId,
      fields: {
        company: parsed.data.companyName.trim(),
        contactName,
        contactEmail: normalizedContactEmail,
        subject: `Registrering: ${selectedPackage.public_name}`,
        leadStatus: "replied",
        companyStatus: "Påmeldt",
        eventName: detail.campaign.event.name,
        sequenceStep: "1",
        threadId: "",
        sourceMessageId: "",
        stopReason: "",
        companyChannelName: "",
        companyChannelId: "",
        temperature: "varm",
        pipelineValue:
          ({ platinum: 65000, gold: 50000, silver: 30000, standard: 20000 } as Record<string, number>)[
            selectedPackage.mapped_package ?? ""
          ] ?? 0,
      },
    });

    await syncCompanyEventPipelineStage(parsed.data.companyName.trim(), detail.campaign.event.name, "Påmeldt");
    await syncDynamicEmailGroups({ campaignId: detail.campaign.id });
  } catch (error) {
    try {
      await supabase.from("event_registration_portal_emails").delete().eq("application_id", applicationId);
    } catch {
      // best-effort rollback
    }
    try {
      await supabase.from("event_registration_applications").delete().eq("id", applicationId);
    } catch {
      // best-effort rollback
    }
    await releaseStandReservation(selectedStand?.id);
    if (logoPath) {
      await supabase.storage.from(LOGO_BUCKET).remove([logoPath]).catch(() => undefined);
    }
    throw error;
  }

  const companyName = parsed.data.companyName.trim();
  const contactName = `${parsed.data.contactFirstName} ${parsed.data.contactLastName}`.trim();
  const normalizedContactEmail = normalizeEmail(parsed.data.contactEmail);

  await Promise.allSettled([
    sendRegistrationNotificationEmail({
      applicationId,
      companyName,
      eventName: detail.campaign.event.name,
      packageName: selectedPackage.public_name,
      contactName,
      contactEmail: normalizedContactEmail,
    }),
    sendRegistrationConfirmationEmail({
      applicationId,
      companyName,
      eventName: detail.campaign.event.name,
      packageName: selectedPackage.public_name,
      contactEmail: normalizedContactEmail,
      portalEmails: parsed.data.portalEmails.map((email) => normalizeEmail(email)),
    }),
  ]);

  return { id: applicationId };
}

export async function listAdminRegistrationCampaignsForEvent(eventId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: campaigns, error } = await supabase
    .from("event_registration_campaigns")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const typedCampaigns = (campaigns ?? []) as RegistrationCampaign[];
  const counts = await Promise.all(
    typedCampaigns.map(async (campaign) => {
      const [{ count: total }, { count: pending }] = await Promise.all([
        supabase
          .from("event_registration_applications")
          .select("id, campaign_id", { count: "exact", head: true })
          .eq("campaign_id" as never, campaign.id as never),
        supabase
          .from("event_registration_applications")
          .select("id, campaign_id, status", { count: "exact", head: true })
          .eq("campaign_id" as never, campaign.id as never)
          .eq("status" as never, "pending" as never),
      ]);
      return { campaignId: campaign.id, total: total ?? 0, pending: pending ?? 0 };
    }),
  );

  const countMap = new Map(counts.map((row) => [row.campaignId, row]));
  return typedCampaigns.map((campaign) => ({
    ...campaign,
    applicationCount: countMap.get(campaign.id)?.total ?? 0,
    pendingCount: countMap.get(campaign.id)?.pending ?? 0,
  }));
}

export async function getAdminRegistrationCampaignDetail(campaignId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: campaign, error } = await supabase
    .from("event_registration_campaigns")
    .select("*, event:events(*)")
    .eq("id", campaignId)
    .single();

  if (error) throw error;

  const typedCampaign = campaign as unknown as RegistrationCampaign & { event: Event };
  const [{ data: packages }, { data: stands }, { data: applications }] = await Promise.all([
    supabase
      .from("event_registration_packages")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("event_registration_stands")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("event_registration_applications")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    campaign: typedCampaign,
    packages: (packages ?? []) as RegistrationPackage[],
    stands: (stands ?? []) as RegistrationStand[],
    applications: (applications ?? []) as RegistrationApplication[],
  };
}

export async function getAdminRegistrationApplicationDetail(applicationId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: application, error } = await supabase
    .from("event_registration_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (error) throw error;

  const typedApplication = application as RegistrationApplication;
  const [{ data: campaign }, { data: packages }, { data: requestedPackage }, { data: approvedPackage }, { data: stands }, { data: portalEmails }, { data: invites }] = await Promise.all([
    supabase.from("event_registration_campaigns").select("*, event:events(*)").eq("id", typedApplication.campaign_id).single(),
    supabase.from("event_registration_packages").select("*").eq("campaign_id", typedApplication.campaign_id).order("sort_order", { ascending: true }),
    typedApplication.requested_package_id
      ? supabase.from("event_registration_packages").select("*").eq("id", typedApplication.requested_package_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    typedApplication.approved_package_id
      ? supabase.from("event_registration_packages").select("*").eq("id", typedApplication.approved_package_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("event_registration_stands").select("*").eq("campaign_id", typedApplication.campaign_id).order("sort_order", { ascending: true }),
    supabase.from("event_registration_portal_emails").select("*").eq("application_id", typedApplication.id).order("created_at", { ascending: true }),
    supabase.from("company_portal_invites").select("*").eq("application_id", typedApplication.id).order("created_at", { ascending: true }),
  ]);

  const typedCampaign = campaign as unknown as RegistrationCampaign & { event: Event };
  const typedRequestedPackage = (requestedPackage ?? null) as RegistrationPackage | null;
  const typedApprovedPackage = (approvedPackage ?? null) as RegistrationPackage | null;
  const expectedGroupName = buildRegistrationPackageGroupName(
    typedCampaign.email_group_prefix,
    typedApprovedPackage?.mapped_package ?? typedRequestedPackage?.mapped_package ?? null,
  );

  const [registrationNotificationLog, registrationConfirmationLog, crmEntries, packageGroup] = await Promise.all([
    supabase
      .from("email_logs")
      .select("*")
      .eq("type", "registration_notification")
      .contains("payload", { applicationId: typedApplication.id })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("email_logs")
      .select("*")
      .eq("type", "registration_confirmation")
      .contains("payload", { applicationId: typedApplication.id })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    listCompanyEventCrmEntries(typedApplication.company_name, typedCampaign.event.name),
    expectedGroupName
      ? supabase.from("email_groups").select("*").eq("name", expectedGroupName).limit(1).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (registrationNotificationLog.error) throw registrationNotificationLog.error;
  if (registrationConfirmationLog.error) throw registrationConfirmationLog.error;
  if (packageGroup.error) throw packageGroup.error;

  let packageGroupMembership: EmailGroupMember | null = null;
  if (typedApplication.company_id && packageGroup.data?.id) {
    const { data } = await supabase
      .from("email_group_members")
      .select("*")
      .eq("group_id", packageGroup.data.id)
      .eq("company_id", typedApplication.company_id)
      .limit(1)
      .maybeSingle();
    packageGroupMembership = (data ?? null) as EmailGroupMember | null;
  }

  let logoUrl: string | null = null;
  if (typedApplication.logo_path) {
    const signed = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(typedApplication.logo_path, 60 * 60);
    if (!signed.error) {
      logoUrl = signed.data.signedUrl;
    }
  }

  return {
    application: typedApplication,
    campaign: typedCampaign,
    packages: (packages ?? []) as RegistrationPackage[],
    requestedPackage: typedRequestedPackage,
    approvedPackage: typedApprovedPackage,
    stands: (stands ?? []) as RegistrationStand[],
    portalEmails: (portalEmails ?? []) as RegistrationPortalEmail[],
    invites: (invites ?? []) as CompanyPortalInvite[],
    logoUrl,
    automationStatus: {
      crmEntries: crmEntries as CrmPipelineEntry[],
      registrationLeadId: buildRegistrationLeadId(typedApplication.id),
      registrationNotificationLog: (registrationNotificationLog.data ?? null) as EmailLog | null,
      registrationConfirmationLog: (registrationConfirmationLog.data ?? null) as EmailLog | null,
      packageGroupName: expectedGroupName,
      packageGroup: (packageGroup.data ?? null) as EmailGroup | null,
      packageGroupMembership,
    },
  };
}

export async function upsertRegistrationCampaign(input: {
  campaignId?: string;
  eventId: string;
  slug: string;
  publicTitle: string;
  publicSubtitle?: string | null;
  publicDescription?: string | null;
  floorplanImagePath?: string | null;
  emailGroupPrefix?: string | null;
  opensAt?: string | null;
  closesAt?: string | null;
  isPublished: boolean;
}) {
  const supabase = createAdminSupabaseClient();
  const payload = {
    event_id: input.eventId,
    slug: input.slug,
    public_title: input.publicTitle,
    public_subtitle: input.publicSubtitle || null,
    public_description: input.publicDescription || null,
    floorplan_image_path: input.floorplanImagePath || null,
    email_group_prefix: input.emailGroupPrefix || null,
    opens_at: input.opensAt || null,
    closes_at: input.closesAt || null,
    is_published: input.isPublished,
    updated_at: new Date().toISOString(),
  };

  if (input.campaignId) {
    const { data, error } = await supabase
      .from("event_registration_campaigns")
      .update(payload)
      .eq("id", input.campaignId)
      .select("*")
      .single();
    if (error) throw error;
    return data as RegistrationCampaign;
  }

  const { data, error } = await supabase
    .from("event_registration_campaigns")
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select("*")
    .single();
  if (error) throw error;
  return data as RegistrationCampaign;
}

export async function upsertRegistrationPackage(input: {
  packageId?: string;
  campaignId: string;
  packageKey: string;
  publicName: string;
  description?: string | null;
  mappedPackage?: RegistrationPackage["mapped_package"];
  internalCapacity?: number | null;
  isActive: boolean;
  sortOrder: number;
}) {
  const supabase = createAdminSupabaseClient();
  const payload = {
    campaign_id: input.campaignId,
    package_key: input.packageKey,
    public_name: input.publicName,
    description: input.description || null,
    mapped_package: input.mappedPackage ?? null,
    internal_capacity: input.internalCapacity ?? null,
    is_active: input.isActive,
    sort_order: input.sortOrder,
    updated_at: new Date().toISOString(),
  };

  if (input.packageId) {
    const { data, error } = await supabase
      .from("event_registration_packages")
      .update(payload)
      .eq("id", input.packageId)
      .select("*")
      .single();
    if (error) throw error;
    return data as RegistrationPackage;
  }

  const { data, error } = await supabase
    .from("event_registration_packages")
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select("*")
    .single();
  if (error) throw error;
  return data as RegistrationPackage;
}

export async function upsertRegistrationStand(input: {
  standId?: string;
  campaignId: string;
  standCode: string;
  displayLabel?: string | null;
  packageTier: RegistrationStand["package_tier"];
  x: number;
  y: number;
  width: number;
  height: number;
  sortOrder: number;
  status: RegistrationStand["status"];
}) {
  const supabase = createAdminSupabaseClient();
  const payload = {
    campaign_id: input.campaignId,
    stand_code: input.standCode,
    display_label: input.displayLabel || null,
    package_tier: input.packageTier,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    sort_order: input.sortOrder,
    status: input.status,
    updated_at: new Date().toISOString(),
  };

  if (input.standId) {
    const { data, error } = await supabase
      .from("event_registration_stands")
      .update(payload)
      .eq("id", input.standId)
      .select("*")
      .single();
    if (error) throw error;
    return data as RegistrationStand;
  }

  const { data, error } = await supabase
    .from("event_registration_stands")
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select("*")
    .single();
  if (error) throw error;
  return data as RegistrationStand;
}

export async function approveRegistrationApplication(input: {
  applicationId: string;
  approvedPackageId: string;
  approvedStandId?: string | null;
  approverId: string;
}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data: application, error: applicationError } = await supabase
    .from("event_registration_applications")
    .select("*")
    .eq("id", input.applicationId)
    .single();

  if (applicationError) throw applicationError;

  const typedApplication = application as RegistrationApplication;
  if (typedApplication.status !== "pending") {
    throw new Error("Only pending applications can be approved.");
  }

  const [{ data: approvedPackage, error: packageError }, { data: campaign, error: campaignError }] = await Promise.all([
    supabase.from("event_registration_packages").select("*").eq("id", input.approvedPackageId).single(),
    supabase.from("event_registration_campaigns").select("*").eq("id", typedApplication.campaign_id).single(),
  ]);

  if (packageError) throw packageError;
  if (campaignError) throw campaignError;

  const typedPackage = approvedPackage as RegistrationPackage;
  const typedCampaign = campaign as RegistrationCampaign;
  if (typedPackage.campaign_id !== typedApplication.campaign_id) {
    throw new Error("The selected package does not belong to this campaign.");
  }
  if (!typedPackage.mapped_package) {
    throw new Error("Choose a concrete package before approval.");
  }

  if (typedPackage.internal_capacity !== null) {
    const { count } = await supabase
      .from("event_registration_applications")
      .select("id, campaign_id, status, approved_package_id", { count: "exact", head: true })
      .eq("campaign_id" as never, typedApplication.campaign_id as never)
      .eq("status" as never, "approved" as never)
      .eq("approved_package_id" as never, typedPackage.id as never);

    if ((count ?? 0) >= typedPackage.internal_capacity) {
      throw new Error("The selected package has reached its internal capacity.");
    }
  }

  let claimedStand: RegistrationStand | null = null;
  let shouldReleaseClaimedStand = false;
  if (input.approvedStandId) {
    const { data: stand, error: standError } = await supabase
      .from("event_registration_stands")
      .select("*")
      .eq("id", input.approvedStandId)
      .single();
    if (standError) throw standError;

    const typedStand = stand as RegistrationStand;
    if (typedStand.campaign_id !== typedApplication.campaign_id) {
      throw new Error("The selected stand does not belong to this campaign.");
    }
    if (typedStand.package_tier !== typedPackage.mapped_package) {
      throw new Error("The selected stand does not match the approved package.");
    }

    if (typedStand.assigned_application_id === typedApplication.id && typedStand.status === "assigned") {
      claimedStand = typedStand;
    } else {
      const { data: claimed, error: claimError } = await supabase
        .from("event_registration_stands")
        .update({
          status: "assigned",
          assigned_application_id: typedApplication.id,
          updated_at: now,
        })
        .eq("id", typedStand.id)
        .eq("status", "available")
        .is("assigned_application_id", null)
        .select("*")
        .single();

      if (claimError) {
        throw new Error("The selected stand is no longer available. Refresh and choose another stand.");
      }

      claimedStand = claimed as RegistrationStand;
      shouldReleaseClaimedStand = true;
    }
  }

  try {
    const { company } = await ensureCompanyFromApplication({ application: typedApplication });

    await ensurePackageEmailGroupMembership({
      campaign: typedCampaign,
      packageTier: typedPackage.mapped_package,
      company,
      companyName: typedApplication.company_name,
      contactEmail: typedApplication.contact_email,
    });

    const standCode = claimedStand?.stand_code ?? null;
    const eventCompany = await ensureEventCompanyFromApplication({
      application: typedApplication,
      company,
      packageTier: typedPackage.mapped_package,
      standCode,
    });

    const { error: applicationUpdateError } = await supabase
      .from("event_registration_applications")
      .update({
        status: "approved",
        company_id: company.id,
        event_company_id: eventCompany.id,
        approved_package_id: typedPackage.id,
        approved_stand_id: claimedStand?.id ?? null,
        approved_at: now,
        approved_by: input.approverId,
        rejected_at: null,
        rejected_by: null,
        rejection_reason: null,
        updated_at: now,
      })
      .eq("id", typedApplication.id);

    if (applicationUpdateError) throw applicationUpdateError;

    if (typedApplication.requested_stand_id && typedApplication.requested_stand_id !== claimedStand?.id) {
      await releaseStandReservation(typedApplication.requested_stand_id);
    }

    try {
      await syncDynamicEmailGroups({ campaignId: typedApplication.campaign_id });
    } catch (syncError) {
      console.error("Dynamic email group sync failed after approval", syncError);
    }

    const { data: portalEmails, error: portalEmailError } = await supabase
      .from("event_registration_portal_emails")
      .select("*")
      .eq("application_id", typedApplication.id)
      .order("created_at", { ascending: true });

    if (portalEmailError) throw portalEmailError;

    for (const portalEmail of (portalEmails ?? []) as RegistrationPortalEmail[]) {
      const normalizedEmail = normalizeEmail(portalEmail.email);
      const { data: existingInvite, error: existingInviteError } = await supabase
        .from("company_portal_invites")
        .select("*")
        .eq("company_id", company.id)
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingInviteError) throw existingInviteError;
      if (existingInvite?.status === "accepted" && existingInvite.user_id) {
        continue;
      }
      if (existingInvite?.status === "invited" || (existingInvite?.status === "pending" && existingInvite.user_id)) {
        const { error: updateExistingInviteError } = await supabase
          .from("company_portal_invites")
          .update({
            application_id: typedApplication.id,
            company_id: company.id,
            updated_at: now,
          })
          .eq("id", existingInvite.id);

        if (updateExistingInviteError) throw updateExistingInviteError;
        continue;
      }

      const { data: invite, error: inviteError } = await supabase
        .from("company_portal_invites")
        .upsert(
          {
            company_id: company.id,
            application_id: typedApplication.id,
            email: normalizedEmail,
            role: "member",
            status: "pending",
            updated_at: now,
          },
          { onConflict: "company_id,email" },
        )
        .select("*")
        .single();

      if (inviteError) throw inviteError;

      await sendCompanyPortalInvite({
        invite: invite as CompanyPortalInvite,
        company,
        application: typedApplication,
      });
    }

    return {
      applicationId: typedApplication.id,
      companyId: company.id,
      eventCompanyId: (eventCompany as EventCompany).id,
    };
  } catch (error) {
    if (claimedStand && shouldReleaseClaimedStand) {
      await supabase
        .from("event_registration_stands")
        .update({
          status: "available",
          assigned_application_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", claimedStand.id);
    }
    throw error;
  }
}

export async function updateApprovedRegistrationApplicationStand(input: {
  applicationId: string;
  approvedStandId?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data: application, error: applicationError } = await supabase
    .from("event_registration_applications")
    .select("*")
    .eq("id", input.applicationId)
    .single();

  if (applicationError) throw applicationError;

  const typedApplication = application as RegistrationApplication;
  if (typedApplication.status !== "approved") {
    throw new Error("Bare godkjente søknader kan få oppdatert standplass.");
  }
  if (!typedApplication.approved_package_id) {
    throw new Error("Søknaden mangler godkjent pakke.");
  }

  const { data: approvedPackage, error: packageError } = await supabase
    .from("event_registration_packages")
    .select("*")
    .eq("id", typedApplication.approved_package_id)
    .single();

  if (packageError) throw packageError;

  const typedPackage = approvedPackage as RegistrationPackage;
  if (!typedPackage.mapped_package) {
    throw new Error("Godkjent pakke må være koblet til Standard, Silver, Gold eller Platinum.");
  }

  const previousApprovedStandId = typedApplication.approved_stand_id;
  let claimedStand: RegistrationStand | null = null;
  let shouldReleaseClaimedStand = false;

  if (input.approvedStandId) {
    const { data: stand, error: standError } = await supabase
      .from("event_registration_stands")
      .select("*")
      .eq("id", input.approvedStandId)
      .single();

    if (standError) throw standError;

    const typedStand = stand as RegistrationStand;
    if (typedStand.campaign_id !== typedApplication.campaign_id) {
      throw new Error("Valgt stand tilhører en annen registreringskampanje.");
    }
    if (typedStand.package_tier !== typedPackage.mapped_package) {
      throw new Error("Valgt stand matcher ikke godkjent pakke.");
    }

    if (typedStand.assigned_application_id === typedApplication.id && typedStand.status === "assigned") {
      claimedStand = typedStand;
    } else {
      const { data: claimed, error: claimError } = await supabase
        .from("event_registration_stands")
        .update({
          status: "assigned",
          assigned_application_id: typedApplication.id,
          updated_at: now,
        })
        .eq("id", typedStand.id)
        .eq("status", "available")
        .is("assigned_application_id", null)
        .select("*")
        .single();

      if (claimError) {
        throw new Error("Standplassen er ikke lenger ledig. Oppdater siden og prøv igjen.");
      }

      claimedStand = claimed as RegistrationStand;
      shouldReleaseClaimedStand = true;
    }
  }

  try {
    const { company } = await ensureCompanyFromApplication({ application: typedApplication });
    const eventCompany = await ensureEventCompanyFromApplication({
      application: typedApplication,
      company,
      packageTier: typedPackage.mapped_package,
      standCode: claimedStand?.stand_code ?? null,
    });

    const { error: updateError } = await supabase
      .from("event_registration_applications")
      .update({
        company_id: company.id,
        event_company_id: eventCompany.id,
        approved_stand_id: claimedStand?.id ?? null,
        updated_at: now,
      })
      .eq("id", typedApplication.id);

    if (updateError) throw updateError;

    if (previousApprovedStandId && previousApprovedStandId !== claimedStand?.id) {
      await releaseStandReservation(previousApprovedStandId);
    }

    return {
      applicationId: typedApplication.id,
      companyId: company.id,
      eventId: typedApplication.event_id,
      campaignId: typedApplication.campaign_id,
    };
  } catch (error) {
    if (claimedStand && shouldReleaseClaimedStand) {
      await supabase
        .from("event_registration_stands")
        .update({
          status: "available",
          assigned_application_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", claimedStand.id);
    }
    throw error;
  }
}

export async function rejectRegistrationApplication(input: {
  applicationId: string;
  rejectionReason?: string | null;
  approverId: string;
}) {
  const supabase = createAdminSupabaseClient();
  const { data: application, error } = await supabase
    .from("event_registration_applications")
    .select("*")
    .eq("id", input.applicationId)
    .single();
  if (error) throw error;
  const typedApplication = application as RegistrationApplication;
  if (typedApplication.status !== "pending") {
    throw new Error("Only pending applications can be rejected.");
  }

  const now = new Date().toISOString();
  const { data: campaign, error: campaignError } = await supabase
    .from("event_registration_campaigns")
    .select("*, event:events(*)")
    .eq("id", typedApplication.campaign_id)
    .single();

  if (campaignError) throw campaignError;

  const typedCampaign = campaign as RegistrationCampaign & { event: Event };

  await syncCrmLeadEntry({
    leadId: buildRegistrationLeadId(typedApplication.id),
    fields: {
      company: typedApplication.company_name,
      contactName: `${typedApplication.contact_first_name} ${typedApplication.contact_last_name}`.trim(),
      contactEmail: typedApplication.contact_email,
      subject: "Registrering avslått",
      companyStatus: "Tapt",
      leadStatus: "registration_rejected",
      stopReason: "registration_rejected",
      eventName: typedCampaign.event.name,
    },
  });
  await syncCompanyEventPipelineStage(typedApplication.company_name, typedCampaign.event.name, "Tapt");

  const { error: updateError } = await supabase
    .from("event_registration_applications")
    .update({
      status: "rejected",
      rejected_at: now,
      rejected_by: input.approverId,
      rejection_reason: input.rejectionReason || null,
      updated_at: now,
    })
    .eq("id", input.applicationId);

  if (updateError) throw updateError;
  await releaseStandReservation(typedApplication.requested_stand_id);
  try {
    await syncDynamicEmailGroups({ campaignId: typedApplication.campaign_id });
  } catch (syncError) {
    console.error("Dynamic email group sync failed after rejection", syncError);
  }
}

export async function resendCompanyPortalInvite(inviteId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: invite, error } = await supabase
    .from("company_portal_invites")
    .select("*")
    .eq("id", inviteId)
    .single();
  if (error) throw error;

  const typedInvite = invite as CompanyPortalInvite;
  const [{ data: company }, { data: application }] = await Promise.all([
    supabase.from("companies").select("*").eq("id", typedInvite.company_id).single(),
    typedInvite.application_id
      ? supabase.from("event_registration_applications").select("*").eq("id", typedInvite.application_id).single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (!company || !application) {
    throw new Error("Could not resolve invite context.");
  }

  await sendCompanyPortalInvite({
    invite: typedInvite,
    company: company as Company,
    application: application as RegistrationApplication,
  });
}

export async function reconcileApprovedCompanyPortalInvites(userId: string, email: string | null | undefined) {
  if (!email) return 0;
  const normalizedEmail = normalizeEmail(email);
  const supabase = createAdminSupabaseClient();

  const { data: invites, error } = await supabase
    .from("company_portal_invites")
    .select("*")
    .eq("email", normalizedEmail)
    .in("status", ["pending", "invited"]);

  if (error) throw error;
  if (!invites || invites.length === 0) return 0;

  for (const invite of invites as CompanyPortalInvite[]) {
    const [{ data: company }, { data: application }] = await Promise.all([
      supabase.from("companies").select("*").eq("id", invite.company_id).maybeSingle(),
      invite.application_id
        ? supabase.from("event_registration_applications").select("*").eq("id", invite.application_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (company && application) {
      await ensureCompanyPortalAccessRequest({
        userId,
        email: normalizedEmail,
        company: company as Company,
        application: application as RegistrationApplication,
      });
    }

    const { error: inviteUpdateError } = await supabase
      .from("company_portal_invites")
      .update({
        user_id: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    if (inviteUpdateError) throw inviteUpdateError;
  }

  return invites.length;
}
