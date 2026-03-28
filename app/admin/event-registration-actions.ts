"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  approveRegistrationApplication,
  rejectRegistrationApplication,
  resendCompanyPortalInvite,
  updateApprovedRegistrationApplicationStand,
} from "@/lib/event-registration";
import {
  upsertRegistrationCampaign,
  upsertRegistrationPackage,
  upsertRegistrationStand,
} from "@/lib/event-registration";
import {
  approveRegistrationApplicationSchema,
  registrationCampaignSchema,
  registrationPackageSchema,
  registrationStandSchema,
  rejectRegistrationApplicationSchema,
  resendPortalInviteSchema,
  updateApprovedRegistrationStandSchema,
} from "@/lib/validation/event-registration";

function isNextRedirectError(error: unknown) {
  const digest = (error as { digest?: string })?.digest;
  const message = (error as { message?: string })?.message;
  return digest === "NEXT_REDIRECT" || message === "NEXT_REDIRECT";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  const message = (error as { message?: string })?.message;
  if (typeof message === "string" && message.length > 0) return message;
  return "Ukjent feil";
}

function getSafeReturnTo(formData: FormData) {
  const value = formData.get("returnTo");
  return typeof value === "string" && value.startsWith("/") ? value : null;
}

function redirectWithResult(returnTo: string | null, status: "saved" | "error", message?: string) {
  if (!returnTo) return;
  if (status === "saved") {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}saved=1`);
  }
  redirect(
    `${returnTo}${returnTo.includes("?") ? "&" : "?"}error=${encodeURIComponent(message || "Ukjent feil")}`,
  );
}

function revalidateRegistrationPaths(eventId: string, campaignId?: string | null, slug?: string | null) {
  revalidatePath("/admin/events");
  revalidatePath("/admin/events/overview");
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/registration`);
  if (campaignId) {
    revalidatePath(`/admin/events/${eventId}/registration/${campaignId}`);
  }
  revalidatePath("/event-register");
  if (slug) {
    revalidatePath(`/event-register/${slug}`);
  }
}

export async function saveRegistrationCampaign(formData: FormData) {
  const admin = await requireRole("admin");
  void admin;
  const returnTo = getSafeReturnTo(formData);

  try {
    const parsed = registrationCampaignSchema.safeParse({
      eventId: formData.get("eventId"),
      campaignId: formData.get("campaignId"),
      slug: formData.get("slug"),
      publicTitle: formData.get("publicTitle"),
      publicSubtitle: formData.get("publicSubtitle"),
      publicDescription: formData.get("publicDescription"),
      floorplanImagePath: formData.get("floorplanImagePath"),
      emailGroupPrefix: formData.get("emailGroupPrefix"),
      opensAt: formData.get("opensAt"),
      closesAt: formData.get("closesAt"),
      isPublished: formData.get("isPublished"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    const campaign = await upsertRegistrationCampaign({
      campaignId: parsed.data.campaignId,
      eventId: parsed.data.eventId,
      slug: parsed.data.slug,
      publicTitle: parsed.data.publicTitle,
      publicSubtitle: parsed.data.publicSubtitle || null,
      publicDescription: parsed.data.publicDescription || null,
      floorplanImagePath: parsed.data.floorplanImagePath || null,
      emailGroupPrefix: parsed.data.emailGroupPrefix || null,
      opensAt: parsed.data.opensAt || null,
      closesAt: parsed.data.closesAt || null,
      isPublished: parsed.data.isPublished,
    });

    revalidateRegistrationPaths(parsed.data.eventId, campaign.id, parsed.data.slug);
    redirectWithResult(returnTo, "saved");
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirectWithResult(returnTo, "error", getErrorMessage(error));
    throw error;
  }
}

export async function saveRegistrationPackage(formData: FormData) {
  await requireRole("admin");
  const returnTo = getSafeReturnTo(formData);

  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim() || null;
    const parsed = registrationPackageSchema.safeParse({
      campaignId: formData.get("campaignId"),
      packageId: formData.get("packageId"),
      packageKey: formData.get("packageKey"),
      publicName: formData.get("publicName"),
      description: formData.get("description"),
      mappedPackage: formData.get("mappedPackage"),
      internalCapacity: formData.get("internalCapacity"),
      isActive: formData.get("isActive"),
      sortOrder: formData.get("sortOrder"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    await upsertRegistrationPackage({
      packageId: parsed.data.packageId,
      campaignId: parsed.data.campaignId,
      packageKey: parsed.data.packageKey,
      publicName: parsed.data.publicName,
      description: parsed.data.description || null,
      mappedPackage: parsed.data.mappedPackage,
      internalCapacity: parsed.data.internalCapacity,
      isActive: parsed.data.isActive,
      sortOrder: parsed.data.sortOrder,
    });

    revalidateRegistrationPaths(eventId, parsed.data.campaignId, slug);
    redirectWithResult(returnTo, "saved");
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirectWithResult(returnTo, "error", getErrorMessage(error));
    throw error;
  }
}

export async function saveRegistrationStand(formData: FormData) {
  await requireRole("admin");
  const returnTo = getSafeReturnTo(formData);

  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim() || null;
    const parsed = registrationStandSchema.safeParse({
      campaignId: formData.get("campaignId"),
      standId: formData.get("standId"),
      standCode: formData.get("standCode"),
      displayLabel: formData.get("displayLabel"),
      packageTier: formData.get("packageTier"),
      x: formData.get("x"),
      y: formData.get("y"),
      width: formData.get("width"),
      height: formData.get("height"),
      sortOrder: formData.get("sortOrder"),
      status: formData.get("status"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    await upsertRegistrationStand({
      standId: parsed.data.standId,
      campaignId: parsed.data.campaignId,
      standCode: parsed.data.standCode,
      displayLabel: parsed.data.displayLabel || null,
      packageTier: parsed.data.packageTier,
      x: parsed.data.x,
      y: parsed.data.y,
      width: parsed.data.width,
      height: parsed.data.height,
      sortOrder: parsed.data.sortOrder,
      status: parsed.data.status,
    });

    revalidateRegistrationPaths(eventId, parsed.data.campaignId, slug);
    redirectWithResult(returnTo, "saved");
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirectWithResult(returnTo, "error", getErrorMessage(error));
    throw error;
  }
}

export async function approveRegistrationApplicationAction(formData: FormData) {
  const admin = await requireRole("admin");
  const returnTo = getSafeReturnTo(formData);

  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const campaignId = String(formData.get("campaignId") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim() || null;
    const parsed = approveRegistrationApplicationSchema.safeParse({
      applicationId: formData.get("applicationId"),
      approvedPackageId: formData.get("approvedPackageId"),
      approvedStandId: formData.get("approvedStandId"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    await approveRegistrationApplication({
      applicationId: parsed.data.applicationId,
      approvedPackageId: parsed.data.approvedPackageId,
      approvedStandId: parsed.data.approvedStandId,
      approverId: admin.id,
    });

    revalidateRegistrationPaths(eventId, campaignId, slug);
    redirectWithResult(returnTo, "saved");
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirectWithResult(returnTo, "error", getErrorMessage(error));
    throw error;
  }
}

export async function rejectRegistrationApplicationAction(formData: FormData) {
  const admin = await requireRole("admin");
  const returnTo = getSafeReturnTo(formData);

  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const campaignId = String(formData.get("campaignId") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim() || null;
    const parsed = rejectRegistrationApplicationSchema.safeParse({
      applicationId: formData.get("applicationId"),
      rejectionReason: formData.get("rejectionReason"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    await rejectRegistrationApplication({
      applicationId: parsed.data.applicationId,
      rejectionReason: parsed.data.rejectionReason || null,
      approverId: admin.id,
    });

    revalidateRegistrationPaths(eventId, campaignId, slug);
    redirectWithResult(returnTo, "saved");
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirectWithResult(returnTo, "error", getErrorMessage(error));
    throw error;
  }
}

export async function updateApprovedRegistrationStandAction(formData: FormData) {
  const admin = await requireRole("admin");
  const returnTo = getSafeReturnTo(formData);

  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const campaignId = String(formData.get("campaignId") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim() || null;
    void admin;
    const parsed = updateApprovedRegistrationStandSchema.safeParse({
      applicationId: formData.get("applicationId"),
      approvedStandId: formData.get("approvedStandId"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    const result = await updateApprovedRegistrationApplicationStand({
      applicationId: parsed.data.applicationId,
      approvedStandId: parsed.data.approvedStandId,
    });

    revalidateRegistrationPaths(eventId || result.eventId, campaignId || result.campaignId, slug);
    revalidatePath(`/admin/companies/${result.companyId}`);
    revalidatePath(`/admin/events/${result.eventId}`);
    revalidatePath("/company");
    revalidatePath("/company/events");
    redirectWithResult(returnTo, "saved");
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirectWithResult(returnTo, "error", getErrorMessage(error));
    throw error;
  }
}

export async function resendCompanyPortalInviteAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = getSafeReturnTo(formData);

  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const campaignId = String(formData.get("campaignId") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim() || null;
    const parsed = resendPortalInviteSchema.safeParse({
      inviteId: formData.get("inviteId"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
    }

    await resendCompanyPortalInvite(parsed.data.inviteId);
    revalidateRegistrationPaths(eventId, campaignId, slug);
    redirectWithResult(returnTo, "saved");
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirectWithResult(returnTo, "error", getErrorMessage(error));
    throw error;
  }
}
