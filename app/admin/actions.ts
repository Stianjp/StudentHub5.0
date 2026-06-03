"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  inviteCompanySchema,
  eventSchema,
  setPackageSchema,
  createCompanySchema,
  updateCompanyDetailsSchema,
  companyDomainSchema,
  approveCompanyAccessSchema,
  deleteCompanySchema,
  removeEventCompanySchema,
  rejectCompanyAccessSchema,
} from "@/lib/validation/admin";
import {
  addCompanyDomain,
  approveCompanyAccess,
  createCompany,
  deleteCompany,
  getCompanyWithDetails,
  inviteCompanyToEvent,
  removeCompanyFromEvent,
  rejectCompanyAccess,
  registerCompanyForEvent,
  setPackageForCompany,
  updateEventCompanyPackageSettings,
  updateEventCompanyStandType,
  upsertEvent,
} from "@/lib/admin";
import { isUuid } from "@/lib/utils";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/resend";
import { buildCompanyLocation, uploadCompanyLogo } from "@/lib/company-access";

const STAND_TYPE_VALUES = ["Standard", "Silver", "Gold", "Platinum"] as const;
const PACKAGE_VALUES = ["standard", "silver", "gold", "platinum"] as const;

function standTypeForPackage(packageTier: (typeof PACKAGE_VALUES)[number]) {
  if (packageTier === "silver") return "Silver";
  if (packageTier === "gold") return "Gold";
  if (packageTier === "platinum") return "Platinum";
  return "Standard";
}

function isNextRedirectError(error: unknown) {
  const digest = (error as { digest?: string })?.digest;
  const message = (error as { message?: string })?.message;
  return digest === "NEXT_REDIRECT" || message === "NEXT_REDIRECT";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  const message = (error as { message?: string })?.message;
  if (typeof message === "string" && message.length > 0) return message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Ukjent feil";
  }
}

function getFormValue(formData: FormData, name: string) {
  const direct = formData.get(name);
  if (direct !== null) return direct;

  for (const [key, value] of formData.entries()) {
    if (key === name) continue;
    const normalized = key.replace(/^\d+_/, "");
    if (normalized === name || normalized.endsWith(name)) {
      return value;
    }
  }

  return null;
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "");
}

function parseTags(value: FormDataEntryValue | FormDataEntryValue[] | null) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function updateEventTicketLimit(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");
  try {
    const eventId = String(getFormValue(formData, "eventId") ?? "").trim();
    const limitValue = String(getFormValue(formData, "ticketLimit") ?? "").trim();

    if (!isUuid(eventId)) {
      throw new Error("Ugyldig event.");
    }

    const ticketLimit = limitValue.length === 0 ? null : Number(limitValue);
    if (ticketLimit !== null && (!Number.isFinite(ticketLimit) || ticketLimit < 1)) {
      throw new Error("Maks antall billetter må være minst 1.");
    }

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("events")
      .update({ ticket_limit: ticketLimit, updated_at: new Date().toISOString() })
      .eq("id", eventId);
    if (error) throw error;

    revalidatePath("/admin/tickets");
    revalidatePath("/admin/events");
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?saved=1`);
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = getErrorMessage(error);
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function saveEvent(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");
  try {
    const parsed = eventSchema.safeParse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      location: formData.get("location"),
      registrationFormUrl: formData.get("registrationFormUrl"),
      startsAt: formData.get("startsAt"),
      endsAt: formData.get("endsAt"),
      isActive: formData.get("isActive"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    const id = formData.get("id");
    await upsertEvent({
      id: typeof id === "string" && id.length > 0 ? id : undefined,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      location: parsed.data.location || null,
      registration_form_url: parsed.data.registrationFormUrl || null,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      is_active: parsed.data.isActive,
    });

    revalidatePath("/admin/events");
    revalidatePath("/admin/events/overview");
    revalidatePath("/admin");
    revalidatePath("/company/events");
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?saved=1`);
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = getErrorMessage(error);
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function inviteCompany(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");
  try {
    const parsed = inviteCompanySchema.safeParse({
      eventId: getFormValue(formData, "eventId"),
      companyId: getFormValue(formData, "companyId"),
      email: getFormValue(formData, "email"),
    });

    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "field"}: ${issue.message}`)
        .join(", ");
      throw new Error(message);
    }

    await inviteCompanyToEvent({
      eventId: parsed.data.eventId,
      companyId: parsed.data.companyId,
      email: parsed.data.email,
    });

    revalidatePath("/admin/companies");
    revalidatePath("/admin/events");
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?saved=1`);
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = getErrorMessage(error);
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function createCompanyAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");
  try {
    const parsed = createCompanySchema.safeParse({
      name: getFormValue(formData, "name"),
      orgNumber: getFormValue(formData, "orgNumber"),
      industry: getFormValue(formData, "industry"),
      location: getFormValue(formData, "location"),
      domain: getFormValue(formData, "domain"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    const company = await createCompany({
      name: parsed.data.name,
      orgNumber: parsed.data.orgNumber || null,
      industry: parsed.data.industry || null,
      location: parsed.data.location || null,
    });

    const normalizedDomain = normalizeDomain(parsed.data.domain || "");
    if (normalizedDomain) {
      if (normalizedDomain.includes(" ")) {
        throw new Error("Ugyldig domene.");
      }
      await addCompanyDomain({ companyId: company.id, domain: normalizedDomain });
    }

    revalidatePath("/admin/companies");
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?saved=1`);
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = getErrorMessage(error);
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function deleteCompanyAction(formData: FormData) {
  await requireRole("admin");
  try {
    const parsed = deleteCompanySchema.safeParse({
      companyId: getFormValue(formData, "companyId"),
      confirmationName: getFormValue(formData, "confirmationName"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    const company = await getCompanyWithDetails(parsed.data.companyId);
    if (company.name.trim().toLowerCase() !== parsed.data.confirmationName.trim().toLowerCase()) {
      throw new Error("Bedriftsnavnet må skrives inn nøyaktig for å slette bedriften.");
    }

    await deleteCompany(parsed.data.companyId);

    revalidatePath("/admin");
    revalidatePath("/admin/companies");
    revalidatePath("/admin/companies/overview");
    revalidatePath("/admin/events");
    revalidatePath("/admin/company-packages");
    revalidatePath("/admin/email/contact-overview");
    revalidatePath("/admin/crm");
    redirect("/admin/companies/overview?deleted=1");
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    const companyId = String(getFormValue(formData, "companyId") ?? "").trim();
    const message = getErrorMessage(error);
    if (isUuid(companyId)) {
      redirect(`/admin/companies/${companyId}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function updateCompanyDetailsAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");

  try {
    const parsed = updateCompanyDetailsSchema.safeParse({
      companyId: getFormValue(formData, "companyId"),
      name: getFormValue(formData, "name"),
      orgNumber: getFormValue(formData, "orgNumber"),
      industry: getFormValue(formData, "industry"),
      size: getFormValue(formData, "size"),
      location: getFormValue(formData, "location"),
      address: getFormValue(formData, "address"),
      postalCode: getFormValue(formData, "postalCode"),
      city: getFormValue(formData, "city"),
      country: getFormValue(formData, "country"),
      website: getFormValue(formData, "website"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    const data = parsed.data;
    const location =
      (data.location ?? "").trim() ||
      buildCompanyLocation({
        city: (data.city ?? "").trim() || null,
        country: (data.country ?? "").trim() || null,
        fallback: null,
      });

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("companies")
      .update({
        name: data.name.trim(),
        org_number: (data.orgNumber ?? "").trim() || null,
        industry: (data.industry ?? "").trim() || null,
        size: (data.size ?? "").trim() || null,
        location: location || null,
        address: (data.address ?? "").trim() || null,
        postal_code: (data.postalCode ?? "").trim() || null,
        city: (data.city ?? "").trim() || null,
        country: (data.country ?? "").trim() || null,
        website: (data.website ?? "").trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.companyId);

    if (error) throw error;

    revalidatePath("/admin");
    revalidatePath("/admin/companies");
    revalidatePath("/admin/companies/overview");
    revalidatePath(`/admin/companies/${parsed.data.companyId}`);
    revalidatePath("/admin/company-packages");
    revalidatePath("/admin/events");
    revalidatePath("/admin/leads");
    revalidatePath("/admin/crm");
    revalidatePath("/admin/email/contact-overview");
    revalidatePath("/company");
    revalidatePath("/company/onboarding");
    revalidatePath("/company/onboarding/branding");
    revalidatePath("/company/representation");
    revalidatePath("/company/events");
    revalidatePath("/company/jobs");
    revalidatePath("/company/leads");
    revalidatePath("/company/roi");
    revalidatePath("/company/thesis-projects");
    revalidatePath("/student/companies");
    revalidatePath("/student/consents");
    revalidatePath("/student/events");
    revalidatePath("/student/dashboard");
    revalidatePath("/hovedside");
    revalidatePath("/hovedside/studentconnect2026");
    revalidatePath("/event-register");
    revalidatePath("/event/events");
    revalidateTag("approved-companies", "max");
    revalidateTag("event-registration-public-campaign-detail", "max");

    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?saved=1`);
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = getErrorMessage(error);
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function removeCompanyFromEventAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");

  try {
    const parsed = removeEventCompanySchema.safeParse({
      registrationId: getFormValue(formData, "registrationId"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    const result = await removeCompanyFromEvent(parsed.data.registrationId);

    revalidatePath("/admin");
    revalidatePath("/admin/events");
    revalidatePath("/admin/events/overview");
    revalidatePath(`/admin/events/${result.eventId}`);
    revalidatePath(`/admin/events/${result.eventId}/registration`);
    revalidatePath("/admin/company-packages");
    revalidatePath("/admin/companies");
    revalidatePath(`/admin/companies/${result.companyId}`);
    revalidatePath("/company/events");
    revalidatePath("/event-register");
    for (const campaignId of result.campaignIds) {
      revalidatePath(`/admin/events/${result.eventId}/registration/${campaignId}`);
    }
    for (const slug of result.campaignSlugs) {
      revalidatePath(`/event-register/${slug}`);
    }

    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}removed=1`);
    }

    redirect(`/admin/events/${result.eventId}?removed=1`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    const message = getErrorMessage(error);
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function uploadCompanyLogoAction(formData: FormData) {
  await requireRole("admin");
  try {
    const companyId = String(getFormValue(formData, "companyId") ?? "").trim();
    if (!isUuid(companyId)) {
      throw new Error("Ugyldig bedrift.");
    }

    const file = formData.get("logo");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Velg en logofil.");
    }
    if (file.size > 6 * 1024 * 1024) {
      throw new Error("Logoen kan ikke være større enn 6 MB.");
    }
    if (!file.type.startsWith("image/")) {
      throw new Error("Logoen må være en bildefil.");
    }

    const supabase = createAdminSupabaseClient();
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id, org_number, logo_path")
      .eq("id", companyId)
      .single();
    if (companyError) throw companyError;

    const logoPath = await uploadCompanyLogo({
      userId: companyId,
      file,
      orgNumber: company.org_number,
    });

    const { error: updateError } = await supabase
      .from("companies")
      .update({
        logo_path: logoPath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", companyId);
    if (updateError) throw updateError;

    if (company.logo_path && company.logo_path !== logoPath) {
      await supabase.storage.from("event-registration-assets").remove([company.logo_path]).catch(() => undefined);
    }

    revalidatePath("/admin/companies");
    revalidatePath(`/admin/companies/${companyId}`);
    revalidatePath("/student/companies");
    revalidatePath("/student/consents");
    revalidatePath("/student/events");
    revalidatePath("/student/dashboard");
    revalidatePath("/hovedside");
    revalidatePath("/hovedside/studentconnect2026");
    revalidatePath("/event-register");
    revalidatePath("/event/events");
    redirect(`/admin/companies/${companyId}?saved=1`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    const companyId = String(getFormValue(formData, "companyId") ?? "").trim();
    const message = getErrorMessage(error);
    if (isUuid(companyId)) {
      redirect(`/admin/companies/${companyId}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function addCompanyDomainAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");
  try {
    const parsed = companyDomainSchema.safeParse({
      companyId: getFormValue(formData, "companyId"),
      domain: getFormValue(formData, "domain"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    const normalized = String(parsed.data.domain)
      .trim()
      .toLowerCase()
      .replace(/^@/, "");

    if (!normalized || normalized.includes(" ")) {
      throw new Error("Ugyldig domene.");
    }

    await addCompanyDomain({ companyId: parsed.data.companyId, domain: normalized });

    revalidatePath("/admin/companies");
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?saved=1`);
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = getErrorMessage(error);
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function approveCompanyAccessAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");
  try {
    const parsed = approveCompanyAccessSchema.safeParse({
      requestId: getFormValue(formData, "requestId"),
      companyId: getFormValue(formData, "companyId"),
      userId: getFormValue(formData, "userId"),
      domain: getFormValue(formData, "domain"),
      orgNumber: getFormValue(formData, "orgNumber"),
      email: getFormValue(formData, "email"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    const normalizedDomain = parsed.data.domain.trim().toLowerCase().replace(/^@/, "");
    let companyId = parsed.data.companyId;

    if (companyId === "new") {
      const nameSource = normalizedDomain.split(".")[0] || parsed.data.email || "Ny bedrift";
      const cleaned = nameSource.replace(/[^a-zA-Z0-9]+/g, " ").trim();
      const derivedName = cleaned
        ? cleaned
            .split(" ")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(" ")
        : "Ny bedrift";

      const company = await createCompany({
        name: derivedName,
        orgNumber: parsed.data.orgNumber || null,
      });
      await addCompanyDomain({ companyId: company.id, domain: normalizedDomain });
      companyId = company.id;
    }

    await approveCompanyAccess({
      requestId: parsed.data.requestId,
      companyId,
      userId: parsed.data.userId,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/companies");
    revalidatePath("/admin/companies/register");
    revalidatePath("/admin/companies/overview");
    if (companyId !== "new") {
      revalidatePath(`/admin/companies/${companyId}`);
    }
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?saved=1`);
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = getErrorMessage(error);
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function rejectCompanyAccessAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");
  try {
    const parsed = rejectCompanyAccessSchema.safeParse({
      requestId: getFormValue(formData, "requestId"),
      companyId: getFormValue(formData, "companyId"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    await rejectCompanyAccess({
      requestId: parsed.data.requestId,
      companyId: parsed.data.companyId || null,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/companies");
    revalidatePath("/admin/companies/register");
    if (parsed.data.companyId) {
      revalidatePath(`/admin/companies/${parsed.data.companyId}`);
    }

    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?rejected=1`);
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = getErrorMessage(error);
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function setPackage(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");
  try {
    const parsed = setPackageSchema.safeParse({
      eventId: getFormValue(formData, "eventId"),
      companyId: getFormValue(formData, "companyId"),
      package: getFormValue(formData, "package"),
      accessFrom: getFormValue(formData, "accessFrom"),
      accessUntil: getFormValue(formData, "accessUntil"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    await setPackageForCompany({
      eventId: parsed.data.eventId,
      companyId: parsed.data.companyId,
      package: parsed.data.package,
      accessFrom: parsed.data.accessFrom || null,
      accessUntil: parsed.data.accessUntil || null,
    });

    revalidatePath("/admin/companies");
    revalidatePath("/company/roi");
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?saved=1`);
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = getErrorMessage(error);
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function registerCompany(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");
  try {
    const eventId = String(getFormValue(formData, "eventId") ?? "").trim();
    const companyId = String(getFormValue(formData, "companyId") ?? "").trim();
    const standType = String(getFormValue(formData, "standType") ?? "").trim();
    const packageTier = String(getFormValue(formData, "package") ?? "standard").trim();
    const categoryTags = parseTags(formData.getAll("categoryTags"));

    if (!isUuid(eventId)) {
      throw new Error(`eventId: Invalid UUID (${eventId || "tom"})`);
    }
    if (!isUuid(companyId)) {
      throw new Error(`companyId: Invalid UUID (${companyId || "tom"})`);
    }
    if (!["standard", "silver", "gold", "platinum"].includes(packageTier)) {
      throw new Error(`package: Ugyldig verdi (${packageTier || "tom"})`);
    }

    const normalizedStandType = STAND_TYPE_VALUES.includes(
      standType as (typeof STAND_TYPE_VALUES)[number],
    )
      ? standType
      : "Standard";

    await registerCompanyForEvent({
      eventId,
      companyId,
      standType: normalizedStandType,
      package: packageTier as "standard" | "silver" | "gold" | "platinum",
      categoryTags,
    });

    revalidatePath("/admin/companies");
    revalidatePath("/company/events");
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?saved=1`);
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = getErrorMessage(error);
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function registerCompaniesBulk(formData: FormData) {
  await requireRole("admin");
  const eventId = String(getFormValue(formData, "eventId") ?? "");
  const standType = String(getFormValue(formData, "standType") ?? "Standard");
  const normalizedStandType = STAND_TYPE_VALUES.includes(
    standType as (typeof STAND_TYPE_VALUES)[number],
  )
    ? standType
    : "Standard";
  const packageTier = String(getFormValue(formData, "package") ?? "standard");
  const categoryTags = parseTags(formData.getAll("categoryTags"));
  const companyIds = formData.getAll("companyIds").map((value) => String(value));
  const returnTo = formData.get("returnTo");

  try {
    if (!eventId || companyIds.length === 0) {
      throw new Error("Velg event og minst én bedrift.");
    }

    if (!isUuid(eventId) || companyIds.some((id) => !isUuid(id))) {
      throw new Error("Ugyldig event eller bedrift. Velg på nytt.");
    }

    await Promise.all(
      companyIds.map((companyId) =>
        registerCompanyForEvent({
          eventId,
          companyId,
          standType: normalizedStandType,
          package: packageTier as "standard" | "silver" | "gold" | "platinum",
          categoryTags,
        }),
      ),
    );

    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath("/admin/companies");
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?saved=1`);
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = getErrorMessage(error);
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function updateCompanyPackageSettings(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");
  try {
    const registrationId = String(getFormValue(formData, "registrationId") ?? "").trim();
    const packageTier = String(getFormValue(formData, "package") ?? "").trim();
    const extraAttendeeTicketsRaw = String(getFormValue(formData, "extraAttendeeTickets") ?? "0").trim();
    const accessFrom = String(getFormValue(formData, "accessFrom") ?? "").trim();
    const accessUntil = String(getFormValue(formData, "accessUntil") ?? "").trim();
    const canViewRoi = getFormValue(formData, "canViewRoi") !== null;
    const canViewLeads = getFormValue(formData, "canViewLeads") !== null;
    const canPublishJobs = getFormValue(formData, "canPublishJobs") !== null;
    const canPublishThesis = getFormValue(formData, "canPublishThesis") !== null;
    const extraAttendeeTickets = Number(extraAttendeeTicketsRaw);

    if (!isUuid(registrationId)) {
      throw new Error("Ugyldig registrering.");
    }
    if (!PACKAGE_VALUES.includes(packageTier as (typeof PACKAGE_VALUES)[number])) {
      throw new Error("Ugyldig pakke.");
    }
    if (!Number.isInteger(extraAttendeeTickets) || extraAttendeeTickets < 0) {
      throw new Error("Ekstra ansattbilletter må være et heltall lik eller større enn 0.");
    }

    const normalizedPackage = packageTier as (typeof PACKAGE_VALUES)[number];

    await updateEventCompanyPackageSettings({
      registrationId,
      package: normalizedPackage,
      standType: standTypeForPackage(normalizedPackage),
      extraAttendeeTickets,
      accessFrom: accessFrom || null,
      accessUntil: accessUntil || null,
      canViewRoi,
      canViewLeads,
      canPublishJobs,
      canPublishThesis,
    });

    revalidatePath("/admin/company-packages");
    revalidatePath("/admin/events");
    revalidatePath("/admin/companies/register-event");
    revalidatePath("/company/leads");
    revalidatePath("/company/roi");
    revalidatePath("/company/events");
    revalidatePath("/company/jobs");
    revalidatePath("/company/thesis-projects");
    revalidatePath("/jobs");
    revalidatePath("/thesis-projects");
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const separator = returnTo.includes("?") ? "&" : "?";
      redirect(`${returnTo}${separator}saved=1`);
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = getErrorMessage(error);
      const separator = returnTo.includes("?") ? "&" : "?";
      redirect(`${returnTo}${separator}error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function updateRegisteredCompanyStandType(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");
  try {
    const registrationId = String(getFormValue(formData, "registrationId") ?? "").trim();
    const standType = String(getFormValue(formData, "standType") ?? "").trim();

    if (!isUuid(registrationId)) {
      throw new Error("Ugyldig registrering.");
    }
    if (!standType) {
      throw new Error("Standtype er påkrevd.");
    }

    if (!STAND_TYPE_VALUES.includes(standType as (typeof STAND_TYPE_VALUES)[number])) {
      throw new Error("Ugyldig standnivå. Velg Standard, Silver, Gold eller Platinum.");
    }

    await updateEventCompanyStandType({
      registrationId,
      standType,
    });

    revalidatePath("/admin/events");
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?saved=1`);
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = getErrorMessage(error);
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function resendTicketEmail(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");
  const ticketId = String(getFormValue(formData, "ticketId") ?? "").trim();

  try {
    if (!ticketId) throw new Error("Ugyldig billett.");
    const supabase = createAdminSupabaseClient();
    const { data: ticket, error } = await supabase
      .from("event_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();
    if (error) throw error;

    const [{ data: student }, { data: event }] = await Promise.all([
      ticket.student_id
        ? supabase.from("students").select("*").eq("id", ticket.student_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("events").select("id, name").eq("id", ticket.event_id).single(),
    ]);

    const email = student?.email ?? ticket.attendee_email ?? "";
    const name = student?.full_name ?? ticket.attendee_name ?? "deltaker";

    if (!email) throw new Error("Mangler e-post for billett.");

    const ticketPayload = encodeURIComponent(ticket.ticket_number);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${ticketPayload}`;

    await sendTransactionalEmail({
      to: email,
      subject: `Billett til ${event?.name ?? "OSH event"}`,
      type: "event_confirmation",
      html: `<p>Hei ${name},</p>
<p>Her er billetten din til ${event?.name ?? "eventet"}.</p>
<p>Billettnummer: <strong>${ticket.ticket_number}</strong></p>
<p>Vis denne QR-koden i check-in:</p>
<p><img src="${qrUrl}" alt="QR-kode" /></p>`,
      payload: {
        eventId: ticket.event_id,
        ticketNumber: ticket.ticket_number,
        ticketId: ticket.id,
      },
      supabase,
    });

    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?saved=1`);
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = getErrorMessage(error);
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function deleteTicket(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");
  const ticketId = String(getFormValue(formData, "ticketId") ?? "").trim();

  try {
    if (!ticketId) throw new Error("Ugyldig billett.");
    const supabase = createAdminSupabaseClient();

    const { data: ticket, error: ticketError } = await supabase
      .from("event_tickets")
      .select("id, event_id, student_id")
      .eq("id", ticketId)
      .single();
    if (ticketError) throw ticketError;

    if (ticket.student_id) {
      await supabase
        .from("leads")
        .delete()
        .eq("event_id", ticket.event_id)
        .eq("student_id", ticket.student_id)
        .eq("source", "ticket");
    }

    const { error: deleteError } = await supabase.from("event_tickets").delete().eq("id", ticketId);
    if (deleteError) throw deleteError;

    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?saved=1`);
    }
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = getErrorMessage(error);
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}
