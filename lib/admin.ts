import type { TableRow } from "@/lib/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/resend";
import { getBaseUrlForRole } from "@/lib/auth-urls";
import { syncDynamicEmailGroups } from "@/lib/email-groups";
import { deleteCrmEntriesForCompanyEvent } from "@/lib/crm-supabase";

type Event = TableRow<"events">;
type Company = TableRow<"companies">;
type EventCompany = TableRow<"event_companies">;
type CompanyDomain = TableRow<"company_domains">;
type CompanyUser = TableRow<"company_users">;
type CompanyUserRequest = TableRow<"company_user_requests">;
type CompanyPortalInvite = TableRow<"company_portal_invites">;
type Profile = TableRow<"profiles">;
type Lead = TableRow<"leads">;
type Consent = TableRow<"consents">;
type RegistrationApplication = TableRow<"event_registration_applications">;
type RegistrationCampaign = TableRow<"event_registration_campaigns">;
type RegistrationPackage = TableRow<"event_registration_packages">;
type RegistrationPortalEmail = TableRow<"event_registration_portal_emails">;
type RegistrationStand = TableRow<"event_registration_stands">;
const COMPANY_PORTAL_FALLBACK_URL = "https://bedrift.oslostudenthub.no";
const REGISTRATION_LOGO_BUCKET = "event-registration-assets";

type EventWithStats = Event & {
  companyCount: number;
  visitCount: number;
  leadCount: number;
};

export type CompanyPortalAccessUser = CompanyUser & {
  email: string | null;
  fullName: string | null;
};

export type CompanyPortalAccessRequest = CompanyUserRequest & {
  fullName: string | null;
};

export type CompanyPortalAccessInviteSummary = CompanyPortalInvite & {
  fullName: string | null;
};

export type CompanyPortalAccessOverview = {
  activeUsers: CompanyPortalAccessUser[];
  pendingRequests: CompanyPortalAccessRequest[];
  portalInvites: CompanyPortalAccessInviteSummary[];
};

export type CompanyRegistrationApplicationOverview = {
  application: RegistrationApplication;
  campaign: (RegistrationCampaign & { event?: Event | null }) | null;
  event: Event | null;
  requestedPackage: RegistrationPackage | null;
  approvedPackage: RegistrationPackage | null;
  requestedStand: RegistrationStand | null;
  approvedStand: RegistrationStand | null;
  portalEmails: RegistrationPortalEmail[];
  logoUrl: string | null;
};

function normalizeOrgNumber(value: string | null | undefined) {
  return value?.replace(/\s+/g, "") ?? "";
}

async function getAuthEmailByUserId(supabase: ReturnType<typeof createAdminSupabaseClient>, userId: string) {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) return null;
  return data.user?.email?.trim() || null;
}

export async function listEventsWithStats(): Promise<EventWithStats[]> {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fallback
  }
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: false });

  if (eventsError) throw eventsError;

  const eventRows = (events ?? []) as Event[];

  const results: EventWithStats[] = [];
  for (const event of eventRows) {
    const [{ count: companyCount }, { count: visitCount }, { count: leadCount }] = await Promise.all([
      supabase
        .from("event_companies")
        .select("id, event_id", { count: "exact", head: true })
        .eq("event_id" as never, event.id as never),
      supabase
        .from("stand_visits")
        .select("id, event_id", { count: "exact", head: true })
        .eq("event_id" as never, event.id as never),
      supabase
        .from("consents")
        .select("id, event_id, consent", { count: "exact", head: true })
        .eq("event_id" as never, event.id as never)
        .eq("consent" as never, true as never),
    ]);

    results.push({
      ...event,
      companyCount: companyCount ?? 0,
      visitCount: visitCount ?? 0,
      leadCount: leadCount ?? 0,
    });
  }

  return results;
}

export async function listCompanies() {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fallback
  }
  const { data, error } = await supabase.from("companies").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Company[];
}

export async function createCompany(input: {
  name: string;
  orgNumber?: string | null;
  industry?: string | null;
  location?: string | null;
}) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fallback
  }
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("companies")
    .insert({
      name: input.name,
      org_number: input.orgNumber ?? null,
      industry: input.industry ?? null,
      location: input.location ?? null,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Company;
}

export async function listCompanyDomains() {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fallback
  }
  const { data, error } = await supabase
    .from("company_domains")
    .select("*, company:companies(id, name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Array<CompanyDomain & { company?: Company | null }>;
}

export async function addCompanyDomain(input: { companyId: string; domain: string }) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fallback
  }
  const { error } = await supabase.from("company_domains").insert({
    company_id: input.companyId,
    domain: input.domain,
  });
  if (error) throw error;
}

export async function listCompanyAccessRequests() {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fallback
  }
  const { data, error } = await supabase
    .from("company_user_requests")
    .select("*, company:companies(id, name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Array<CompanyUserRequest & { company?: Company | null }>;
}

export async function approveCompanyAccess(input: { requestId: string; companyId: string; userId: string }) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data: request, error: requestError } = await supabase
    .from("company_user_requests")
    .select("*")
    .eq("id", input.requestId)
    .single();

  if (requestError) throw requestError;

  const { error: insertError } = await supabase.from("company_users").upsert(
    {
      company_id: input.companyId,
      user_id: input.userId,
      approved_at: now,
    },
    { onConflict: "company_id,user_id" },
  );
  if (insertError) throw insertError;

  const typedRequest = request as CompanyUserRequest;
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", input.companyId)
    .single();

  if (companyError) throw companyError;

  const { error: inviteUpdateError } = await supabase
    .from("company_portal_invites")
    .update({
      status: "accepted",
      accepted_at: now,
      user_id: input.userId,
      updated_at: now,
    })
    .eq("company_id", input.companyId)
    .eq("email", typedRequest.email.toLowerCase().trim())
    .in("status", ["pending", "invited"]);

  if (inviteUpdateError) throw inviteUpdateError;

  const { error: deleteError } = await supabase
    .from("company_user_requests")
    .delete()
    .eq("id", input.requestId);
  if (deleteError) throw deleteError;

  const companyPortalUrl = getBaseUrlForRole("company", COMPANY_PORTAL_FALLBACK_URL) || COMPANY_PORTAL_FALLBACK_URL;
  const signInUrl = `${companyPortalUrl}/auth/sign-in?role=company&next=%2Fcompany`;

  await sendTransactionalEmail({
    to: typedRequest.email,
    subject: `Tilgangen din til ${company.name} er godkjent`,
    type: "company_access_approved",
    html: `<p>Hei,</p>
<p>Tilgangen din til <strong>${company.name}</strong> er nå godkjent av Oslo Student Hub.</p>
<p>Du kan logge inn på bedriftsportalen her:</p>
<p><a href="${signInUrl}">${signInUrl}</a></p>
<p>Når du logger inn med <strong>${typedRequest.email}</strong>, får du tilgang til bedriftssiden.</p>`,
    payload: {
      companyId: input.companyId,
      requestId: input.requestId,
      userId: input.userId,
      approvedAt: now,
      signInUrl,
    },
    supabase,
  });
}

export async function listEventCompanies(eventId: string) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fallback
  }
  const { data, error } = await supabase
    .from("event_companies")
    .select("*, company:companies(*)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Array<EventCompany & { company: Company }>;
}

export async function getCompanyWithDetails(companyId: string) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fallback
  }
  const { data, error } = await supabase.from("companies").select("*").eq("id", companyId).single();
  if (error) throw error;
  return data as Company;
}

export async function listCompanyRegistrationApplications(companyId: string): Promise<CompanyRegistrationApplicationOverview[]> {
  const supabase = createAdminSupabaseClient();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, org_number")
    .eq("id", companyId)
    .single();

  if (companyError) throw companyError;

  const normalizedOrgNumber = normalizeOrgNumber(company.org_number);
  let applicationQuery = supabase
    .from("event_registration_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (normalizedOrgNumber) {
    applicationQuery = applicationQuery.or(`company_id.eq.${companyId},org_number.eq.${normalizedOrgNumber}`);
  } else {
    applicationQuery = applicationQuery.eq("company_id", companyId);
  }

  const { data: applications, error: applicationsError } = await applicationQuery;
  if (applicationsError) throw applicationsError;

  const typedApplications = (applications ?? []) as RegistrationApplication[];
  if (typedApplications.length === 0) return [];

  const campaignIds = [...new Set(typedApplications.map((application) => application.campaign_id).filter(Boolean))];
  const packageIds = [
    ...new Set(
      typedApplications
        .flatMap((application) => [application.requested_package_id, application.approved_package_id])
        .filter((packageId): packageId is string => Boolean(packageId)),
    ),
  ];
  const standIds = [
    ...new Set(
      typedApplications
        .flatMap((application) => [application.requested_stand_id, application.approved_stand_id])
        .filter((standId): standId is string => Boolean(standId)),
    ),
  ];
  const applicationIds = typedApplications.map((application) => application.id);

  const [{ data: campaigns, error: campaignsError }, { data: packages, error: packagesError }, { data: stands, error: standsError }, { data: portalEmails, error: portalEmailsError }] = await Promise.all([
    supabase.from("event_registration_campaigns").select("*, event:events(*)").in("id", campaignIds),
    packageIds.length > 0
      ? supabase.from("event_registration_packages").select("*").in("id", packageIds)
      : Promise.resolve({ data: [], error: null }),
    standIds.length > 0
      ? supabase.from("event_registration_stands").select("*").in("id", standIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("event_registration_portal_emails")
      .select("*")
      .in("application_id", applicationIds)
      .order("created_at", { ascending: true }),
  ]);

  if (campaignsError) throw campaignsError;
  if (packagesError) throw packagesError;
  if (standsError) throw standsError;
  if (portalEmailsError) throw portalEmailsError;

  const campaignMap = new Map(
    ((campaigns ?? []) as Array<RegistrationCampaign & { event?: Event | null }>).map((campaign) => [campaign.id, campaign]),
  );
  const packageMap = new Map(((packages ?? []) as RegistrationPackage[]).map((pkg) => [pkg.id, pkg]));
  const standMap = new Map(((stands ?? []) as RegistrationStand[]).map((stand) => [stand.id, stand]));
  const portalEmailMap = new Map<string, RegistrationPortalEmail[]>();

  for (const portalEmail of (portalEmails ?? []) as RegistrationPortalEmail[]) {
    const existing = portalEmailMap.get(portalEmail.application_id) ?? [];
    existing.push(portalEmail);
    portalEmailMap.set(portalEmail.application_id, existing);
  }

  const logoUrlEntries = await Promise.all(
    typedApplications.map(async (application) => {
      if (!application.logo_path) return [application.id, null] as const;
      const { data } = await supabase.storage.from(REGISTRATION_LOGO_BUCKET).createSignedUrl(application.logo_path, 60 * 60);
      return [application.id, data?.signedUrl ?? null] as const;
    }),
  );
  const logoUrlMap = new Map<string, string | null>(logoUrlEntries);

  return typedApplications.map((application) => {
    const campaign = campaignMap.get(application.campaign_id) ?? null;
    return {
      application,
      campaign,
      event: campaign?.event ?? null,
      requestedPackage: application.requested_package_id ? packageMap.get(application.requested_package_id) ?? null : null,
      approvedPackage: application.approved_package_id ? packageMap.get(application.approved_package_id) ?? null : null,
      requestedStand: application.requested_stand_id ? standMap.get(application.requested_stand_id) ?? null : null,
      approvedStand: application.approved_stand_id ? standMap.get(application.approved_stand_id) ?? null : null,
      portalEmails: portalEmailMap.get(application.id) ?? [],
      logoUrl: logoUrlMap.get(application.id) ?? null,
    };
  });
}

export async function getCompanyPortalAccessOverview(companyId: string): Promise<CompanyPortalAccessOverview> {
  const supabase = createAdminSupabaseClient();

  const [{ data: memberships, error: membershipsError }, { data: requests, error: requestsError }, { data: invites, error: invitesError }] = await Promise.all([
    supabase
      .from("company_users")
      .select("*")
      .eq("company_id", companyId)
      .order("approved_at", { ascending: false }),
    supabase
      .from("company_user_requests")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("company_portal_invites")
      .select("*")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false }),
  ]);

  if (membershipsError) throw membershipsError;
  if (requestsError) throw requestsError;
  if (invitesError) throw invitesError;

  const typedMemberships = (memberships ?? []) as CompanyUser[];
  const typedRequests = (requests ?? []) as CompanyUserRequest[];
  const typedInvites = (invites ?? []) as CompanyPortalInvite[];

  const userIds = Array.from(
    new Set(
      [...typedMemberships.map((membership) => membership.user_id), ...typedRequests.map((request) => request.user_id), ...typedInvites.map((invite) => invite.user_id)]
        .filter((userId): userId is string => Boolean(userId)),
    ),
  );

  const profileMap = new Map<string, Profile>();
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, role, created_at, updated_at")
      .in("id", userIds);

    if (profilesError) throw profilesError;
    for (const profile of (profiles ?? []) as Profile[]) {
      profileMap.set(profile.id, profile);
    }
  }

  const authEmailEntries = await Promise.all(
    userIds.map(async (userId) => [userId, await getAuthEmailByUserId(supabase, userId)] as const),
  );
  const authEmailMap = new Map<string, string | null>(authEmailEntries);

  return {
    activeUsers: typedMemberships.map((membership) => ({
      ...membership,
      email:
        authEmailMap.get(membership.user_id) ??
        typedInvites.find((invite) => invite.user_id === membership.user_id)?.email ??
        null,
      fullName: profileMap.get(membership.user_id)?.full_name ?? null,
    })),
    pendingRequests: typedRequests.map((request) => ({
      ...request,
      fullName: profileMap.get(request.user_id)?.full_name ?? null,
    })),
    portalInvites: typedInvites.map((invite) => ({
      ...invite,
      fullName: invite.user_id ? profileMap.get(invite.user_id)?.full_name ?? null : null,
    })),
  };
}

export async function getPreferredCompanyContactEmail(companyId: string) {
  const supabase = createAdminSupabaseClient();
  const overview = await getCompanyPortalAccessOverview(companyId);

  const candidateEmails = [
    ...overview.activeUsers
      .sort((a, b) => (b.approved_at ?? "").localeCompare(a.approved_at ?? ""))
      .map((user) => user.email),
    ...overview.portalInvites
      .filter((invite) => invite.status === "accepted" || invite.status === "invited" || invite.status === "pending")
      .map((invite) => invite.email),
    ...overview.pendingRequests.map((request) => request.email),
  ]
    .map((email) => email?.trim().toLowerCase() ?? "")
    .filter(Boolean);

  if (candidateEmails.length > 0) {
    return candidateEmails[0] ?? null;
  }

  const { data: application, error: applicationError } = await supabase
    .from("event_registration_applications")
    .select("contact_email")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (applicationError) throw applicationError;
  if (application?.contact_email?.trim()) {
    return application.contact_email.trim().toLowerCase();
  }

  const { data: eventCompany, error: eventCompanyError } = await supabase
    .from("event_companies")
    .select("invited_email")
    .eq("company_id", companyId)
    .not("invited_email", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (eventCompanyError) throw eventCompanyError;
  return eventCompany?.invited_email?.trim().toLowerCase() ?? null;
}

export async function deleteCompany(companyId: string) {
  const supabase = createAdminSupabaseClient();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) throw companyError;
  if (!company) {
    throw new Error("Fant ikke bedriften som skulle slettes.");
  }

  const { data: affectedStudents, error: studentsError } = await supabase
    .from("students")
    .select("id, liked_company_ids")
    .contains("liked_company_ids", [companyId]);
  if (studentsError) throw studentsError;

  for (const student of affectedStudents ?? []) {
    const nextLikedCompanyIds = ((student.liked_company_ids ?? []) as string[]).filter(
      (likedCompanyId) => likedCompanyId !== companyId,
    );
    const { error: updateStudentError } = await supabase
      .from("students")
      .update({
        liked_company_ids: nextLikedCompanyIds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", student.id);
    if (updateStudentError) throw updateStudentError;
  }

  await deleteCrmEntriesForCompanyEvent(company.name, "");

  const { error: deleteError } = await supabase.from("companies").delete().eq("id", companyId);
  if (deleteError) throw deleteError;

  return company as Company;
}

export async function listCompanyLeads(companyId: string) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fallback
  }
  const { data: leads, error } = await supabase
    .from("leads")
    .select("*, student:students(*), event:events(id, name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const leadRows = (leads ?? []) as Array<Lead & { student?: TableRow<"students"> | null; event?: Pick<Event, "id" | "name"> | null }>;
  if (leadRows.length === 0) return [];

  const studentIds = leadRows.map((row) => row.student_id);
  const { data: consents } = await supabase
    .from("consents")
    .select("*")
    .eq("company_id", companyId)
    .in("student_id", studentIds);

  const typedConsents = (consents ?? []) as Consent[];
  const consentMap = new Map(typedConsents.map((row) => [row.student_id, row]));

  return leadRows.map((lead) => ({
    lead,
    consent: consentMap.get(lead.student_id) ?? null,
    student: lead.student ?? null,
    event: lead.event ?? null,
  }));
}

export async function listCompanyRegistrations(companyId: string) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fallback
  }
  const { data, error } = await supabase
    .from("event_companies")
    .select("*, event:events(*)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const typedRegistrations = (data ?? []) as EventCompany[];
  const registrationIds = typedRegistrations.map((row) => row.id);
  const applicationMap = new Map<string, { id: string; campaign_id: string }>();

  if (registrationIds.length > 0) {
    const { data: applications, error: applicationsError } = await supabase
      .from("event_registration_applications")
      .select("id, event_company_id, campaign_id, created_at")
      .in("event_company_id", registrationIds)
      .order("created_at", { ascending: false });

    if (applicationsError) throw applicationsError;

    for (const application of (applications ?? []) as Array<
      Pick<RegistrationApplication, "id" | "event_company_id" | "campaign_id" | "created_at">
    >) {
      if (application.event_company_id && !applicationMap.has(application.event_company_id)) {
        applicationMap.set(application.event_company_id, {
          id: application.id,
          campaign_id: application.campaign_id,
        });
      }
    }
  }

  return typedRegistrations.map((registration) => ({
    ...registration,
    application_id: applicationMap.get(registration.id)?.id ?? null,
    application_campaign_id: applicationMap.get(registration.id)?.campaign_id ?? null,
  }));
}

export async function getEventWithRegistrations(eventId: string) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fallback
  }
  const [{ data: event, error: eventError }, { data: registrations, error: regError }] = await Promise.all([
    supabase.from("events").select("*").eq("id", eventId).single(),
    supabase.from("event_companies").select("*, company:companies(*)").eq("event_id", eventId),
  ]);

  if (eventError) throw eventError;
  if (regError) throw regError;

  const typedRegistrations = (registrations ?? []) as Array<EventCompany & { company: Company }>;
  const registrationIds = typedRegistrations.map((row) => row.id);
  const applicationMap = new Map<string, { id: string; campaign_id: string }>();

  if (registrationIds.length > 0) {
    const { data: applications, error: applicationsError } = await supabase
      .from("event_registration_applications")
      .select("id, event_company_id, campaign_id, created_at")
      .in("event_company_id", registrationIds)
      .order("created_at", { ascending: false });

    if (applicationsError) throw applicationsError;

    for (const application of (applications ?? []) as Array<
      Pick<RegistrationApplication, "id" | "event_company_id" | "campaign_id" | "created_at">
    >) {
      if (application.event_company_id && !applicationMap.has(application.event_company_id)) {
        applicationMap.set(application.event_company_id, {
          id: application.id,
          campaign_id: application.campaign_id,
        });
      }
    }
  }

  return {
    event: event as Event,
    registrations: typedRegistrations.map((registration) => ({
      ...registration,
      application_id: applicationMap.get(registration.id)?.id ?? null,
      application_campaign_id: applicationMap.get(registration.id)?.campaign_id ?? null,
    })),
  };
}

export async function upsertEvent(input: {
  id?: string;
  name: string;
  slug: string;
  description?: string | null;
  location?: string | null;
  registration_form_url?: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fallback
  }
  const now = new Date().toISOString();

  const payload = {
    ...input,
    description: input.description || null,
    location: input.location || null,
    registration_form_url: input.registration_form_url || null,
    updated_at: now,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("events")
    .insert({ ...payload, created_at: now })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function inviteCompanyToEvent(input: {
  eventId: string;
  companyId: string;
  email: string;
}) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fallback
  }
  const now = new Date().toISOString();

  const { data: eventCompany, error: upsertError } = await supabase
    .from("event_companies")
    .upsert(
      {
        event_id: input.eventId,
        company_id: input.companyId,
        invited_email: input.email,
        invited_at: now,
        updated_at: now,
      },
      { onConflict: "event_id,company_id" },
    )
    .select("*")
    .single();

  if (upsertError) throw upsertError;

  const [{ data: event }, { data: company }] = await Promise.all([
    supabase.from("events").select("*").eq("id", input.eventId).single(),
    supabase.from("companies").select("*").eq("id", input.companyId).single(),
  ]);

  await sendTransactionalEmail({
    to: input.email,
    subject: `Invitasjon til ${event?.name ?? "OSH event"}`,
    type: "invite_company",
    html: `<p>Hei ${company?.name ?? "bedrift"},</p>
<p>Dere er invitert til ${event?.name ?? "et OSH-event"}.</p>
<p>Logg inn på bedriftsportalen for å bekrefte deltakelse.</p>`,
    payload: {
      eventId: input.eventId,
      companyId: input.companyId,
    },
    supabase,
  });

  return eventCompany;
}

export async function setPackageForCompany(input: {
  eventId: string;
  companyId: string;
  package: "standard" | "silver" | "gold" | "platinum";
  accessFrom?: string | null;
  accessUntil?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("event_companies")
    .upsert(
      {
        event_id: input.eventId,
        company_id: input.companyId,
        package: input.package,
        access_from: input.accessFrom || null,
        access_until: input.accessUntil || null,
        updated_at: now,
      },
      { onConflict: "event_id,company_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function registerCompanyForEvent(input: {
  eventId: string;
  companyId: string;
  standType?: string | null;
  package?: "standard" | "silver" | "gold" | "platinum";
  categoryTags?: string[];
}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  let categoryTags = input.categoryTags ?? [];

  if (categoryTags.length === 0) {
    const { data: company } = await supabase
      .from("companies")
      .select("id, recruitment_fields")
      .eq("id", input.companyId)
      .single();
    categoryTags = company?.recruitment_fields ?? [];
  }

  const basePayload = {
    event_id: input.eventId,
    company_id: input.companyId,
    stand_type: input.standType ?? "Standard",
    package: input.package ?? "standard",
    registered_at: now,
    updated_at: now,
  };

  const payloadWithCategories = {
    ...basePayload,
    category_tags: categoryTags,
  };

  let result = await supabase
    .from("event_companies")
    .upsert(payloadWithCategories, { onConflict: "event_id,company_id" })
    .select("*")
    .single();

  if (result.error) {
    const message = `${result.error.message ?? ""} ${result.error.details ?? ""}`.toLowerCase();
    const missingCategoryTagsColumn =
      message.includes("category_tags") &&
      (message.includes("schema cache") || message.includes("column"));

    if (!missingCategoryTagsColumn) {
      throw result.error;
    }

    // Some environments are missing event_companies.category_tags.
    result = await supabase
      .from("event_companies")
      .upsert(basePayload, { onConflict: "event_id,company_id" })
      .select("*")
      .single();

    if (result.error) throw result.error;
  }

  if (categoryTags.length > 0) {
    const { error: updateCompanyError } = await supabase
      .from("companies")
      .update({
        recruitment_fields: categoryTags,
        updated_at: now,
      })
      .eq("id", input.companyId);
    if (updateCompanyError) throw updateCompanyError;
  }

  return result.data;
}

export async function updateEventCompanyStandType(input: {
  registrationId: string;
  standType: string;
}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("event_companies")
    .update({
      stand_type: input.standType,
      updated_at: now,
    })
    .eq("id", input.registrationId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateEventCompanyPackageSettings(input: {
  registrationId: string;
  package: "standard" | "silver" | "gold" | "platinum";
  standType: "Standard" | "Silver" | "Gold" | "Platinum";
  extraAttendeeTickets: number;
  accessFrom?: string | null;
  accessUntil?: string | null;
  canViewRoi: boolean;
  canViewLeads: boolean;
  canPublishJobs: boolean;
  canPublishThesis: boolean;
}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("event_companies")
    .update({
      package: input.package,
      stand_type: input.standType,
      extra_attendee_tickets: input.extraAttendeeTickets,
      access_from: input.accessFrom || null,
      access_until: input.accessUntil || null,
      can_view_roi: input.canViewRoi,
      can_view_leads: input.canViewLeads,
      can_publish_jobs: input.canPublishJobs,
      can_publish_thesis: input.canPublishThesis,
      updated_at: now,
    })
    .eq("id", input.registrationId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function removeCompanyFromEvent(registrationId: string) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data: registration, error: registrationError } = await supabase
    .from("event_companies")
    .select("*")
    .eq("id", registrationId)
    .single();

  if (registrationError) throw registrationError;

  const typedRegistration = registration as EventCompany;

  const [{ data: campaigns, error: campaignsError }, { data: applications, error: applicationsError }] =
    await Promise.all([
      supabase
        .from("event_registration_campaigns")
        .select("id, slug")
        .eq("event_id", typedRegistration.event_id),
      supabase
        .from("event_registration_applications")
        .select("id, campaign_id, requested_stand_id, approved_stand_id")
        .eq("event_id", typedRegistration.event_id)
        .eq("company_id", typedRegistration.company_id),
    ]);

  if (campaignsError) throw campaignsError;
  if (applicationsError) throw applicationsError;

  const typedCampaigns = (campaigns ?? []) as Array<{ id: string; slug: string }>;
  const typedApplications = (applications ?? []) as Array<
    Pick<RegistrationApplication, "id" | "campaign_id" | "requested_stand_id" | "approved_stand_id">
  >;

  const applicationIds = typedApplications.map((application) => application.id);
  const campaignIds = typedCampaigns.map((campaign) => campaign.id);
  const releasedStandIds = new Set<string>();

  typedApplications.forEach((application) => {
    if (application.requested_stand_id) releasedStandIds.add(application.requested_stand_id);
    if (application.approved_stand_id) releasedStandIds.add(application.approved_stand_id);
  });

  if (applicationIds.length > 0) {
    const { data: assignedStands, error: assignedStandsError } = await supabase
      .from("event_registration_stands")
      .select("id")
      .in("assigned_application_id", applicationIds);

    if (assignedStandsError) throw assignedStandsError;

    for (const stand of (assignedStands ?? []) as Array<Pick<RegistrationStand, "id">>) {
      releasedStandIds.add(stand.id);
    }
  }

  if (typedRegistration.stand_code && campaignIds.length > 0) {
    const { data: standMatches, error: standMatchesError } = await supabase
      .from("event_registration_stands")
      .select("id")
      .in("campaign_id", campaignIds)
      .eq("stand_code", typedRegistration.stand_code);

    if (standMatchesError) throw standMatchesError;

    for (const stand of (standMatches ?? []) as Array<Pick<RegistrationStand, "id">>) {
      releasedStandIds.add(stand.id);
    }
  }

  if (releasedStandIds.size > 0) {
    const { error: releaseStandError } = await supabase
      .from("event_registration_stands")
      .update({
        status: "available",
        assigned_application_id: null,
        updated_at: now,
      })
      .in("id", [...releasedStandIds]);

    if (releaseStandError) throw releaseStandError;
  }

  if (applicationIds.length > 0) {
    const { error: updateApplicationsError } = await supabase
      .from("event_registration_applications")
      .update({
        approved_stand_id: null,
        updated_at: now,
      })
      .in("id", applicationIds);

    if (updateApplicationsError) throw updateApplicationsError;

    const { error: revokeInvitesError } = await supabase
      .from("company_portal_invites")
      .update({
        status: "revoked",
        updated_at: now,
      })
      .eq("company_id", typedRegistration.company_id)
      .in("application_id", applicationIds)
      .in("status", ["pending", "invited"]);

    if (revokeInvitesError) throw revokeInvitesError;
  }

  const { error: deleteTicketsError } = await supabase
    .from("event_tickets")
    .delete()
    .eq("event_id", typedRegistration.event_id)
    .eq("company_id", typedRegistration.company_id);

  if (deleteTicketsError) throw deleteTicketsError;

  const { error: deleteRegistrationError } = await supabase
    .from("event_companies")
    .delete()
    .eq("id", registrationId);

  if (deleteRegistrationError) throw deleteRegistrationError;

  if (campaignIds.length > 0) {
    await Promise.all(
      campaignIds.map(async (campaignId) => {
        try {
          await syncDynamicEmailGroups({ campaignId });
        } catch (syncError) {
          console.error("Dynamic email group sync failed after event company removal", syncError);
        }
      }),
    );
  }

  return {
    eventId: typedRegistration.event_id,
    companyId: typedRegistration.company_id,
    campaignIds,
    campaignSlugs: typedCampaigns.map((campaign) => campaign.slug).filter(Boolean),
  };
}
