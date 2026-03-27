"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import {
  archiveContactCompany,
  createManualContactCase,
  createManualContactCompany,
  mergeContactCases,
  moveContactCaseMessage,
  sendContactCaseEmail,
  syncContactOverviewMailbox,
  toggleContactCaseChecklistItem,
  updateContactCase,
  updateContactCompanyOwner,
} from "@/lib/email-contact-overview";

function isNextRedirectError(error: unknown) {
  const digest = (error as { digest?: string })?.digest;
  const message = (error as { message?: string })?.message;
  return digest === "NEXT_REDIRECT" || message === "NEXT_REDIRECT";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  const message = (error as { message?: string })?.message;
  if (typeof message === "string" && message) return message;
  return "Ukjent feil";
}

function getFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function appendQuery(url: string, key: string, value: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${key}=${encodeURIComponent(value)}`;
}

function parseEmails(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.includes("@"));
}

const createCompanySchema = z.object({
  displayName: z.string().min(2, "Bedriftsnavn er påkrevd."),
  primaryDomain: z.string().min(3, "Domene er påkrevd."),
  primaryEmail: z.string().email("Ugyldig e-post.").optional().or(z.literal("")),
  eventId: z.string().uuid().optional().or(z.literal("")),
  ownerProfileId: z.string().uuid().optional().or(z.literal("")),
});

const createCaseSchema = z.object({
  contactCompanyId: z.string().uuid(),
  eventId: z.string().uuid().optional().or(z.literal("")),
  contactName: z.string().optional().or(z.literal("")),
  contactEmail: z.string().email("Ugyldig e-post.").optional().or(z.literal("")),
  title: z.string().optional().or(z.literal("")),
  status: z.enum(["unsorted", "open", "closed", "archived"]).optional(),
});

const updateCaseSchema = z.object({
  caseId: z.string().uuid(),
  title: z.string().min(2, "Sakstittel er påkrevd."),
  eventId: z.string().uuid().optional().or(z.literal("")),
  contactName: z.string().optional().or(z.literal("")),
  contactEmail: z.string().email("Ugyldig e-post.").optional().or(z.literal("")),
  status: z.enum(["unsorted", "open", "closed", "archived"]),
});

const toggleChecklistSchema = z.object({
  itemId: z.string().uuid(),
  completed: z.enum(["0", "1"]),
});

const moveMessageSchema = z.object({
  messageId: z.string().uuid(),
  targetCaseId: z.string().uuid(),
});

const mergeCaseSchema = z.object({
  sourceCaseId: z.string().uuid(),
  targetCaseId: z.string().uuid(),
});

const archiveCompanySchema = z.object({
  contactCompanyId: z.string().uuid(),
});

const updateOwnerSchema = z.object({
  contactCompanyId: z.string().uuid(),
  ownerProfileId: z.string().uuid().optional().or(z.literal("")),
});

const sendCaseMailSchema = z.object({
  caseId: z.string().uuid(),
  to: z.string().min(3, "Mottaker er påkrevd."),
  cc: z.string().optional().or(z.literal("")),
  subject: z.string().min(2, "Emne er påkrevd."),
  htmlBody: z.string().min(2, "Melding er påkrevd."),
});

export async function syncContactOverviewAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = getFormValue(formData, "returnTo") || "/admin/email/contact-overview";
  try {
    const result = await syncContactOverviewMailbox();
    revalidatePath("/admin/email/contact-overview");
    redirect(
      appendQuery(
        appendQuery(returnTo, "synced", String(result.syncedMessages)),
        "created",
        `${result.createdCompanies}/${result.createdCases}`,
      ),
    );
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirect(appendQuery(returnTo, "error", getErrorMessage(error)));
  }
}

export async function createContactCompanyAction(formData: FormData) {
  await requireRole("admin");
  try {
    const parsed = createCompanySchema.parse({
      displayName: getFormValue(formData, "displayName"),
      primaryDomain: getFormValue(formData, "primaryDomain"),
      primaryEmail: getFormValue(formData, "primaryEmail"),
      eventId: getFormValue(formData, "eventId"),
      ownerProfileId: getFormValue(formData, "ownerProfileId"),
    });

    const company = await createManualContactCompany({
      displayName: parsed.displayName,
      primaryDomain: parsed.primaryDomain,
      primaryEmail: parsed.primaryEmail || null,
      eventId: parsed.eventId || null,
      ownerProfileId: parsed.ownerProfileId || null,
    });

    revalidatePath("/admin/email/contact-overview");
    redirect(`/admin/email/contact-overview/${company.id}?saved=1`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirect(appendQuery("/admin/email/contact-overview/new", "error", getErrorMessage(error)));
  }
}

export async function createContactCaseAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = getFormValue(formData, "returnTo") || "/admin/email/contact-overview";
  try {
    const parsed = createCaseSchema.parse({
      contactCompanyId: getFormValue(formData, "contactCompanyId"),
      eventId: getFormValue(formData, "eventId"),
      contactName: getFormValue(formData, "contactName"),
      contactEmail: getFormValue(formData, "contactEmail"),
      title: getFormValue(formData, "title"),
      status: getFormValue(formData, "status") || "open",
    });

    const caseRow = await createManualContactCase({
      contactCompanyId: parsed.contactCompanyId,
      eventId: parsed.eventId || null,
      contactName: parsed.contactName || null,
      contactEmail: parsed.contactEmail || null,
      title: parsed.title || null,
      status: parsed.status,
    });

    revalidatePath("/admin/email/contact-overview");
    redirect(appendQuery(returnTo, "case", caseRow.id));
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirect(appendQuery(returnTo, "error", getErrorMessage(error)));
  }
}

export async function updateContactCaseAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = getFormValue(formData, "returnTo") || "/admin/email/contact-overview";
  try {
    const parsed = updateCaseSchema.parse({
      caseId: getFormValue(formData, "caseId"),
      title: getFormValue(formData, "title"),
      eventId: getFormValue(formData, "eventId"),
      contactName: getFormValue(formData, "contactName"),
      contactEmail: getFormValue(formData, "contactEmail"),
      status: getFormValue(formData, "status"),
    });

    await updateContactCase({
      caseId: parsed.caseId,
      title: parsed.title,
      eventId: parsed.eventId || null,
      contactName: parsed.contactName || null,
      contactEmail: parsed.contactEmail || null,
      status: parsed.status,
    });

    revalidatePath("/admin/email/contact-overview");
    redirect(appendQuery(returnTo, "saved", "1"));
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirect(appendQuery(returnTo, "error", getErrorMessage(error)));
  }
}

export async function toggleChecklistItemAction(formData: FormData) {
  const profile = await requireRole("admin");
  const returnTo = getFormValue(formData, "returnTo") || "/admin/email/contact-overview";
  try {
    const parsed = toggleChecklistSchema.parse({
      itemId: getFormValue(formData, "itemId"),
      completed: getFormValue(formData, "completed"),
    });

    await toggleContactCaseChecklistItem({
      itemId: parsed.itemId,
      completed: parsed.completed === "1",
      completedBy: profile.id,
    });

    revalidatePath("/admin/email/contact-overview");
    redirect(appendQuery(returnTo, "saved", "1"));
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirect(appendQuery(returnTo, "error", getErrorMessage(error)));
  }
}

export async function moveMessageAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = getFormValue(formData, "returnTo") || "/admin/email/contact-overview";
  try {
    const parsed = moveMessageSchema.parse({
      messageId: getFormValue(formData, "messageId"),
      targetCaseId: getFormValue(formData, "targetCaseId"),
    });
    await moveContactCaseMessage(parsed);
    revalidatePath("/admin/email/contact-overview");
    redirect(appendQuery(returnTo, "saved", "1"));
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirect(appendQuery(returnTo, "error", getErrorMessage(error)));
  }
}

export async function mergeCaseAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = getFormValue(formData, "returnTo") || "/admin/email/contact-overview";
  try {
    const parsed = mergeCaseSchema.parse({
      sourceCaseId: getFormValue(formData, "sourceCaseId"),
      targetCaseId: getFormValue(formData, "targetCaseId"),
    });
    await mergeContactCases(parsed);
    revalidatePath("/admin/email/contact-overview");
    redirect(appendQuery(appendQuery(returnTo, "case", parsed.targetCaseId), "saved", "1"));
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirect(appendQuery(returnTo, "error", getErrorMessage(error)));
  }
}

export async function archiveContactCompanyAction(formData: FormData) {
  await requireRole("admin");
  try {
    const parsed = archiveCompanySchema.parse({
      contactCompanyId: getFormValue(formData, "contactCompanyId"),
    });
    await archiveContactCompany(parsed.contactCompanyId);
    revalidatePath("/admin/email/contact-overview");
    redirect("/admin/email/contact-overview?saved=1");
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirect(appendQuery("/admin/email/contact-overview", "error", getErrorMessage(error)));
  }
}

export async function updateContactCompanyOwnerAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = getFormValue(formData, "returnTo") || "/admin/email/contact-overview";
  try {
    const parsed = updateOwnerSchema.parse({
      contactCompanyId: getFormValue(formData, "contactCompanyId"),
      ownerProfileId: getFormValue(formData, "ownerProfileId"),
    });
    await updateContactCompanyOwner({
      contactCompanyId: parsed.contactCompanyId,
      ownerProfileId: parsed.ownerProfileId || null,
    });
    revalidatePath("/admin/email/contact-overview");
    redirect(appendQuery(returnTo, "saved", "1"));
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirect(appendQuery(returnTo, "error", getErrorMessage(error)));
  }
}

export async function sendContactCaseEmailAction(formData: FormData) {
  const profile = await requireRole("admin");
  const returnTo = getFormValue(formData, "returnTo") || "/admin/email/contact-overview";
  try {
    const parsed = sendCaseMailSchema.parse({
      caseId: getFormValue(formData, "caseId"),
      to: getFormValue(formData, "to"),
      cc: getFormValue(formData, "cc"),
      subject: getFormValue(formData, "subject"),
      htmlBody: getFormValue(formData, "htmlBody"),
    });

    const to = parseEmails(parsed.to);
    const cc = parseEmails(parsed.cc ?? "");
    if (to.length === 0) {
      throw new Error("Minst én mottaker må angis.");
    }

    await sendContactCaseEmail({
      caseId: parsed.caseId,
      to,
      cc,
      subject: parsed.subject,
      htmlBody: parsed.htmlBody.replace(/\n/g, "<br />"),
      createdBy: profile.id,
    });

    revalidatePath("/admin/email/contact-overview");
    redirect(appendQuery(returnTo, "sent", "1"));
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirect(appendQuery(returnTo, "error", getErrorMessage(error)));
  }
}
