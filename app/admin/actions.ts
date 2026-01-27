"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
import { isUuid } from "@/lib/utils";

function getFormValue(formData: FormData, name: string) {
  const direct = formData.get(name);
  if (direct !== null) return direct;

  for (const [key, value] of formData.entries()) {
    if (key === name) continue;
    if (key.endsWith(`_${name}`) || key.endsWith(name)) {
      return value;
    }
  }

  return null;
}

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
  const returnTo = formData.get("returnTo");
  try {
    const parsed = inviteCompanySchema.safeParse({
      eventId: getFormValue(formData, "eventId"),
      companyId: getFormValue(formData, "companyId"),
      email: getFormValue(formData, "email"),
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
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?saved=1`);
    }
  } catch (error) {
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = error instanceof Error ? error.message : "Ukjent feil";
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
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = error instanceof Error ? error.message : "Ukjent feil";
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function registerCompany(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");
  try {
    const parsed = registerCompanySchema.safeParse({
      eventId: getFormValue(formData, "eventId"),
      companyId: getFormValue(formData, "companyId"),
      standType: getFormValue(formData, "standType"),
      package: getFormValue(formData, "package"),
    });

    if (!parsed.success) {
      throw new Error("Ugyldig event eller bedrift. Velg på nytt.");
    }

    await registerCompanyForEvent({
      eventId: parsed.data.eventId,
      companyId: parsed.data.companyId,
      standType: parsed.data.standType || "Standard",
      package: parsed.data.package ?? "standard",
    });

    revalidatePath("/admin/companies");
    revalidatePath("/company/events");
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?saved=1`);
    }
  } catch (error) {
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = error instanceof Error ? error.message : "Ukjent feil";
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}

export async function registerCompaniesBulk(formData: FormData) {
  await requireRole("admin");
  const eventId = String(getFormValue(formData, "eventId") ?? "");
  const standType = String(getFormValue(formData, "standType") ?? "Standard");
  const packageTier = String(getFormValue(formData, "package") ?? "standard");
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
        registerCompanyForEvent({ eventId, companyId, standType, package: packageTier as "standard" | "silver" | "gold" | "platinum" }),
      ),
    );

    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath("/admin/companies");
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?saved=1`);
    }
  } catch (error) {
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = error instanceof Error ? error.message : "Ukjent feil";
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}
