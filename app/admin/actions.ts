"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  inviteCompanySchema,
  eventSchema,
  registerCompanySchema,
  setPackageSchema,
  createCompanySchema,
  companyDomainSchema,
  approveCompanyAccessSchema,
} from "@/lib/validation/admin";
import {
  addCompanyDomain,
  approveCompanyAccess,
  createCompany,
  inviteCompanyToEvent,
  registerCompanyForEvent,
  setPackageForCompany,
  upsertEvent,
} from "@/lib/admin";
import { isUuid } from "@/lib/utils";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/resend";

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
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : JSON.stringify(error);
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
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : JSON.stringify(error);
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
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
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = error instanceof Error ? error.message : "Ukjent feil";
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

    await registerCompanyForEvent({
      eventId,
      companyId,
      standType: standType || "Standard",
      package: packageTier as "standard" | "silver" | "gold" | "platinum",
      categoryTags,
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
          standType,
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
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = error instanceof Error ? error.message : "Ukjent feil";
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

    const ticketPayload = encodeURIComponent(
      JSON.stringify({ t: ticket.ticket_number, e: ticket.event_id }),
    );
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
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = error instanceof Error ? error.message : "Ukjent feil";
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
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      const message = error instanceof Error ? error.message : "Ukjent feil";
      redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}
