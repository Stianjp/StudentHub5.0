"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  inviteCompanySchema,
  eventSchema,
  registerCompanySchema,
  setPackageSchema,
} from "@/lib/validation/admin";
import {
  inviteCompanyToEvent,
  registerCompanyForEvent,
  setPackageForCompany,
  upsertEvent,
} from "@/lib/admin";

export async function saveEvent(formData: FormData) {
  await requireRole("admin");

  const parsed = eventSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    location: formData.get("location"),
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
    starts_at: parsed.data.startsAt,
    ends_at: parsed.data.endsAt,
    is_active: parsed.data.isActive,
  });

  revalidatePath("/admin/events");
  revalidatePath("/admin");
}

export async function inviteCompany(formData: FormData) {
  await requireRole("admin");
  const parsed = inviteCompanySchema.safeParse({
    eventId: formData.get("eventId"),
    companyId: formData.get("companyId"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  await inviteCompanyToEvent({
    eventId: parsed.data.eventId,
    companyId: parsed.data.companyId,
    email: parsed.data.email,
  });

  revalidatePath("/admin/companies");
  revalidatePath("/admin/events");
}

export async function setPackage(formData: FormData) {
  await requireRole("admin");
  const parsed = setPackageSchema.safeParse({
    eventId: formData.get("eventId"),
    companyId: formData.get("companyId"),
    package: formData.get("package"),
    accessFrom: formData.get("accessFrom"),
    accessUntil: formData.get("accessUntil"),
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
}

export async function registerCompany(formData: FormData) {
  await requireRole("admin");
  const parsed = registerCompanySchema.safeParse({
    eventId: formData.get("eventId"),
    companyId: formData.get("companyId"),
    standType: formData.get("standType"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  await registerCompanyForEvent({
    eventId: parsed.data.eventId,
    companyId: parsed.data.companyId,
    standType: parsed.data.standType || "Standard",
  });

  revalidatePath("/admin/companies");
  revalidatePath("/company/events");
}
