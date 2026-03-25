import { randomUUID } from "crypto";
import { unstable_cache } from "next/cache";
import type { Json, TableRow } from "@/lib/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
import { hasSupabaseEnv, shouldBypassSupabaseInDev } from "@/lib/supabase/env";
import {
  listCompanyEventCrmEntries,
  syncCompanyEventPipelineStage,
  syncCrmLeadEntry,
} from "@/lib/crm-supabase";

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
type PublicCampaignDetail = {
  campaign: PublicCampaign;
  packages: RegistrationPackage[];
  stands: RegistrationStand[];
};

const LOGO_BUCKET = "event-registration-assets";
const COMPANY_PORTAL_FALLBACK_URL = "https://bedrift.oslostudenthub.no";

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

const loadPublicRegistrationCampaigns = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("event_registration_campaigns")
      .select(`*, event:events(${PUBLIC_EVENT_FIELDS})`)
      .order("opens_at", { ascending: true });

    if (error) throw error;

    const campaigns = (data ?? []) as unknown as PublicCampaign[];
    return campaigns.filter((campaign) => isCampaignOpen(campaign));
  },
  ["event-registration-public-campaigns"],
  { revalidate: 300 },
);

const loadPublicRegistrationCampaignDetail = unstable_cache(
  async (slug: string): Promise<PublicCampaignDetail | null> => {
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

    return {
      campaign: typedCampaign,
      packages: (packages ?? []) as RegistrationPackage[],
      stands: (stands ?? []) as RegistrationStand[],
    };
  },
  ["event-registration-public-campaign-detail"],
  { revalidate: 300 },
);

function inferStandTypeFromPackage(packageTier: RegistrationPackage["mapped_package"]) {
  if (packageTier === "gold" || packageTier === "platinum") return "Premium";
  return "Standard";
}

async function logEmailEvent(input: {
  to: string;
  subject: string;
  type: string;
  payload?: Json;
}) {
  const supabase = createAdminSupabaseClient();
  await supabase.from("email_logs").insert({
    to_email: input.to,
    subject: input.subject,
    type: input.type,
    payload: input.payload ?? {},
    sent_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });
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

async function sendCompanyPortalInvite(input: {
  invite: CompanyPortalInvite;
  company: Company;
  application: RegistrationApplication;
}) {
  const supabase = createAdminSupabaseClient();
  const companyPortalUrl = getBaseUrlForRole("company", COMPANY_PORTAL_FALLBACK_URL) || COMPANY_PORTAL_FALLBACK_URL;
  const normalizedEmail = normalizeEmail(input.invite.email);
  const now = new Date().toISOString();
  const subject = `Access to ${input.company.name} on OSH StudentHub`;
  const loginUrl = `${companyPortalUrl}/auth/sign-in?role=company&next=%2Fcompany`;
  const existingUser = await findAuthUserByEmail(normalizedEmail);
  const { data: event } = await supabase
    .from("events")
    .select("name")
    .eq("id", input.application.event_id)
    .maybeSingle();
  const eventName = event?.name ?? "your event";

  if (!existingUser) {
    const redirectTo = `${companyPortalUrl}/auth/callback?role=company&mode=verify&next=%2Fcompany`;
    const { error } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo,
    });
    if (error) throw error;

    await logEmailEvent({
      to: normalizedEmail,
      subject,
      type: "company_portal_invite",
      payload: {
        companyId: input.company.id,
        applicationId: input.application.id,
        delivery: "supabase_invite",
      },
    });
  } else {
    await sendTransactionalEmail({
      to: normalizedEmail,
      subject,
      type: "company_portal_invite",
      html: `<p>Hello,</p>
<p>OSH has approved ${input.company.name} for ${eventName}.</p>
<p>You now have access to the company portal. Sign in here: <a href="${loginUrl}">${loginUrl}</a></p>`,
      payload: {
        companyId: input.company.id,
        applicationId: input.application.id,
        delivery: "login_notice",
      },
      supabase,
    });
  }

  const { error: updateError } = await supabase
    .from("company_portal_invites")
    .update({
      status: "invited",
      invited_at: now,
      updated_at: now,
    })
    .eq("id", input.invite.id);

  if (updateError) throw updateError;
}

export async function listPublicRegistrationCampaigns() {
  if (shouldUsePreviewRegistrationData()) {
    return listPreviewRegistrationCampaigns();
  }
  return loadPublicRegistrationCampaigns();
}

export async function getPublicRegistrationCampaignBySlug(slug: string): Promise<PublicCampaignDetail | null> {
  if (shouldUsePreviewRegistrationData()) {
    return getPreviewRegistrationDetail(slug);
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
    const { data: existingCompany } = await supabase
      .from("companies")
      .select("*")
      .eq("org_number", normalizeOrgNumber(typedApplication.org_number))
      .maybeSingle();

    let company: Company;
    if (existingCompany) {
      const { data: updatedCompany, error: updateCompanyError } = await supabase
        .from("companies")
        .update({
          name: typedApplication.company_name,
          org_number: normalizeOrgNumber(typedApplication.org_number),
          location: `${typedApplication.city}, ${typedApplication.country}`,
          updated_at: now,
        })
        .eq("id", existingCompany.id)
        .select("*")
        .single();
      if (updateCompanyError) throw updateCompanyError;
      company = updatedCompany as Company;
    } else {
      const { data: createdCompany, error: createCompanyError } = await supabase
        .from("companies")
        .insert({
          name: typedApplication.company_name,
          org_number: normalizeOrgNumber(typedApplication.org_number),
          location: `${typedApplication.city}, ${typedApplication.country}`,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single();
      if (createCompanyError) throw createCompanyError;
      company = createdCompany as Company;
    }

    await ensurePackageEmailGroupMembership({
      campaign: typedCampaign,
      packageTier: typedPackage.mapped_package,
      company,
      companyName: typedApplication.company_name,
      contactEmail: typedApplication.contact_email,
    });

    const standCode = claimedStand?.stand_code ?? null;
    const { data: eventCompany, error: eventCompanyError } = await supabase
      .from("event_companies")
      .upsert(
        {
          event_id: typedApplication.event_id,
          company_id: company.id,
          package: typedPackage.mapped_package,
          stand_type: inferStandTypeFromPackage(typedPackage.mapped_package),
          stand_code: standCode,
          registered_at: now,
          updated_at: now,
        },
        { onConflict: "event_id,company_id" },
      )
      .select("*")
      .single();

    if (eventCompanyError) throw eventCompanyError;

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
  const now = new Date().toISOString();

  const { data: invites, error } = await supabase
    .from("company_portal_invites")
    .select("*")
    .eq("email", normalizedEmail)
    .in("status", ["pending", "invited"]);

  if (error) throw error;
  if (!invites || invites.length === 0) return 0;

  for (const invite of invites as CompanyPortalInvite[]) {
    const { error: membershipError } = await supabase
      .from("company_users")
      .upsert(
        {
          company_id: invite.company_id,
          user_id: userId,
          role: invite.role || "member",
          approved_at: now,
        },
        { onConflict: "company_id,user_id" },
      );

    if (membershipError) throw membershipError;

    const { error: inviteUpdateError } = await supabase
      .from("company_portal_invites")
      .update({
        status: "accepted",
        accepted_at: now,
        user_id: userId,
        updated_at: now,
      })
      .eq("id", invite.id);

    if (inviteUpdateError) throw inviteUpdateError;
  }

  return invites.length;
}
