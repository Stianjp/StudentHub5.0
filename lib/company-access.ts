import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { TableRow } from "@/lib/types/database";
import { normalizeStudyCategories } from "@/lib/company-categories";
import { normalizeEmailAddress } from "@/lib/auth-registration";
import { sendTransactionalEmail } from "@/lib/resend";

type Company = TableRow<"companies">;

export const COMPANY_LOGO_BUCKET = "event-registration-assets";

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

type ResolveCompanyResult = {
  company: Company | null;
  source: "invite" | "org" | "domain" | "none";
};

export type EnsureCompanyAccessRequestInput = {
  userId: string;
  email: string;
  orgNumber?: string | null;
  companyName?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  logoPath?: string | null;
  recruitmentFields?: string[] | null;
};

export function normalizeOrgNumber(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, "");
}

export function getEmailDomain(email: string) {
  const normalized = normalizeEmailAddress(email);
  return normalized.split("@")[1] ?? "";
}

export function buildCompanyLocation(input: {
  city?: string | null;
  country?: string | null;
  fallback?: string | null;
}) {
  const location = [input.city?.trim(), input.country?.trim()].filter(Boolean).join(", ");
  return location || input.fallback || null;
}

function isPersonalDomain(domain: string) {
  return PERSONAL_EMAIL_DOMAINS.has(domain);
}

export async function findAuthUserByEmail(email: string) {
  const supabase = createAdminSupabaseClient();
  const target = normalizeEmailAddress(email);
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;

    const match = data.users.find((user) => normalizeEmailAddress(user.email ?? "") === target);
    if (match) return match;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function resolveCompanyForRequest(input: {
  email: string;
  orgNumber?: string | null;
}): Promise<ResolveCompanyResult> {
  const supabase = createAdminSupabaseClient();
  const normalizedEmail = normalizeEmailAddress(input.email);
  const domain = getEmailDomain(normalizedEmail);
  const normalizedOrgNumber = normalizeOrgNumber(input.orgNumber);

  const { data: portalInvite, error: inviteError } = await supabase
    .from("company_portal_invites")
    .select("company:companies(*)")
    .eq("email", normalizedEmail)
    .in("status", ["pending", "invited", "accepted"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inviteError) throw inviteError;
  if (portalInvite?.company) {
    return { company: portalInvite.company as unknown as Company, source: "invite" };
  }

  if (normalizedOrgNumber) {
    const { data: orgCompany, error: orgError } = await supabase
      .from("companies")
      .select("*")
      .eq("org_number", normalizedOrgNumber)
      .maybeSingle();

    if (orgError) throw orgError;
    if (orgCompany) {
      return { company: orgCompany as Company, source: "org" };
    }
  }

  if (domain) {
    const { data: domainMatch, error: domainError } = await supabase
      .from("company_domains")
      .select("company:companies(*)")
      .eq("domain", domain)
      .maybeSingle();

    if (domainError) throw domainError;
    if (domainMatch?.company) {
      return { company: domainMatch.company as unknown as Company, source: "domain" };
    }
  }

  return { company: null, source: "none" };
}

async function upsertCompanyDomain(companyId: string, domain: string) {
  if (!domain || isPersonalDomain(domain)) return;

  const supabase = createAdminSupabaseClient();
  const { data: existing, error: existingError } = await supabase
    .from("company_domains")
    .select("company_id")
    .eq("domain", domain)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing?.company_id) return;

  const { error } = await supabase.from("company_domains").insert({
    company_id: companyId,
    domain,
  });

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    throw error;
  }
}

async function createCompanyFromRegistration(input: {
  userId: string;
  companyName: string;
  orgNumber?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  logoPath?: string | null;
  recruitmentFields?: string[] | null;
}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("companies")
    .insert({
      user_id: input.userId,
      name: input.companyName.trim(),
      org_number: normalizeOrgNumber(input.orgNumber) || null,
      address: input.address?.trim() || null,
      postal_code: input.postalCode?.trim() || null,
      city: input.city?.trim() || null,
      country: input.country?.trim() || null,
      location: buildCompanyLocation(input),
      logo_path: input.logoPath?.trim() || null,
      recruitment_fields: normalizeStudyCategories(input.recruitmentFields ?? []),
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Company;
}

async function syncExistingCompanyFromRegistration(company: Company, input: EnsureCompanyAccessRequestInput) {
  const supabase = createAdminSupabaseClient();
  const update: Partial<Company> & { updated_at: string } = {
    updated_at: new Date().toISOString(),
  };

  if (input.companyName?.trim()) update.name = input.companyName.trim();
  if (normalizeOrgNumber(input.orgNumber)) {
    update.org_number = company.org_number || normalizeOrgNumber(input.orgNumber);
  }
  if (input.address?.trim()) update.address = input.address.trim();
  if (input.postalCode?.trim()) update.postal_code = input.postalCode.trim();
  if (input.city?.trim()) update.city = input.city.trim();
  if (input.country?.trim()) update.country = input.country.trim();
  if (input.logoPath?.trim() && !company.logo_path) update.logo_path = input.logoPath.trim();

  const recruitmentFields = normalizeStudyCategories(input.recruitmentFields ?? []);
  if (recruitmentFields.length > 0) {
    update.recruitment_fields = recruitmentFields;
  }

  const location = buildCompanyLocation({
    city: update.city ?? company.city,
    country: update.country ?? company.country,
    fallback: company.location,
  });
  if (location) {
    update.location = location;
  }

  const meaningfulUpdateKeys = Object.keys(update).filter((key) => key !== "updated_at");
  if (meaningfulUpdateKeys.length === 0) {
    return company;
  }

  const { data, error } = await supabase
    .from("companies")
    .update(update)
    .eq("id", company.id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Company;
}

export async function uploadCompanyLogo(input: {
  userId: string;
  file: File;
  orgNumber?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  const extension = input.file.name.includes(".") ? input.file.name.split(".").pop() : "png";
  const normalizedOrgNumber = normalizeOrgNumber(input.orgNumber);
  const safeName = input.file.name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const path = `company-profiles/${normalizedOrgNumber || input.userId}/${Date.now()}-${safeName || `logo.${extension}`}`;

  const { error } = await supabase.storage
    .from(COMPANY_LOGO_BUCKET)
    .upload(path, Buffer.from(await input.file.arrayBuffer()), {
      contentType: input.file.type,
      upsert: true,
    });

  if (error) throw error;
  return path;
}

export async function ensureCompanyAccessRequest(input: EnsureCompanyAccessRequestInput) {
  const supabase = createAdminSupabaseClient();
  const normalizedEmail = normalizeEmailAddress(input.email);
  const domain = getEmailDomain(normalizedEmail);
  const normalizedOrgNumber = normalizeOrgNumber(input.orgNumber);

  const { data: revokedInvite, error: revokedInviteError } = await supabase
    .from("company_portal_invites")
    .select("id")
    .eq("email", normalizedEmail)
    .eq("status", "revoked")
    .limit(1)
    .maybeSingle();

  if (revokedInviteError) throw revokedInviteError;
  if (revokedInvite) {
    throw new Error("Denne e-postadressen er blokkert for bedriftsportalen. Kontakt OSH hvis dette er feil.");
  }

  const existingAuthUser = await findAuthUserByEmail(normalizedEmail);
  if (!existingAuthUser || existingAuthUser.id !== input.userId) {
    throw new Error("Fant ikke bruker i Auth ennå. Bekreft e-posten og prøv igjen.");
  }

  const { data: existingMembership } = await supabase
    .from("company_users")
    .select("company:companies(*)")
    .eq("user_id", input.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingMembership?.company) {
    return {
      company: existingMembership.company as unknown as Company,
      createdCompany: false,
      source: "member" as const,
    };
  }

  const { data: existingRequest, error: existingRequestError } = await supabase
    .from("company_user_requests")
    .select("id, email, domain, company_id, org_number")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (existingRequestError) throw existingRequestError;

  const resolved = await resolveCompanyForRequest({
    email: normalizedEmail,
    orgNumber: normalizedOrgNumber,
  });

  let company = resolved.company;
  let createdCompany = false;

  if (!company) {
    if (!input.companyName?.trim()) {
      throw new Error("Kunne ikke koble brukeren til en bedrift uten firmanavn.");
    }
    company = await createCompanyFromRegistration({
      userId: input.userId,
      companyName: input.companyName,
      orgNumber: normalizedOrgNumber,
      address: input.address,
      postalCode: input.postalCode,
      city: input.city,
      country: input.country,
      logoPath: input.logoPath,
      recruitmentFields: input.recruitmentFields,
    });
    createdCompany = true;
  } else {
    company = await syncExistingCompanyFromRegistration(company, input);
  }

  await upsertCompanyDomain(company.id, domain);

  const { error: requestError } = await supabase
    .from("company_user_requests")
    .upsert(
      {
        user_id: input.userId,
        email: normalizedEmail,
        domain,
        company_id: company.id,
        org_number: normalizedOrgNumber || company.org_number || null,
      },
      { onConflict: "user_id" },
    );

  if (requestError) throw requestError;

  const shouldNotifyAdmin =
    !existingRequest ||
    existingRequest.email !== normalizedEmail ||
    existingRequest.domain !== domain ||
    existingRequest.company_id !== company.id ||
    (existingRequest.org_number ?? "") !== (normalizedOrgNumber || company.org_number || "");

  await supabase
    .from("company_portal_invites")
    .update({
      user_id: input.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("email", normalizedEmail)
    .in("status", ["pending", "invited"]);

  if (shouldNotifyAdmin) {
    const companyAdminUrl = `https://admin.oslostudenthub.no/admin/companies/${company.id}`;

    await sendTransactionalEmail({
      to: "stian@oslostudenthub.no",
      subject: `Ny forespørsel om bedriftsprofiltilgang: ${company.name}`,
      type: "company_access_request_admin_notification",
      html: `<p>Hei,</p>
<p><strong>${normalizedEmail}</strong> har bedt om tilgang til bedriftsprofilen for <strong>${company.name}</strong>.</p>
<p><strong>Firmanavn:</strong> ${company.name}<br />
<strong>Org.nr:</strong> ${normalizeOrgNumber(company.org_number) || "—"}<br />
<strong>Domene:</strong> ${domain || "—"}</p>
<p>Åpne bedriften i admin her:</p>
<p><a href="${companyAdminUrl}">${companyAdminUrl}</a></p>`,
      payload: {
        companyId: company.id,
        companyName: company.name,
        requestedBy: normalizedEmail,
        domain,
        orgNumber: normalizeOrgNumber(company.org_number) || null,
      },
      supabase,
    });
  }

  return {
    company,
    createdCompany,
    source: createdCompany ? ("created" as const) : resolved.source,
  };
}
