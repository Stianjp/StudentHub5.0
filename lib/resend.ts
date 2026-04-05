import { Resend } from "resend";
import type { Database, Json } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type EmailType = "invite_company" | "event_confirmation" | "roi_ready" | "company_portal_invite" | "bulk_admin" | string;

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  type: EmailType;
  payload?: Json;
  attachments?: EmailAttachmentInput[];
  supabase: SupabaseClient<Database>;
};

export type EmailAttachmentInput = {
  filename: string;
  content: Buffer | string;
  contentType?: string | null;
};

export type EmailSignatureInput = {
  name?: string | null;
  title?: string | null;
  phone?: string | null;
  includeLogo?: boolean;
};

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getTransactionalFromAddress() {
  const configuredFrom =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "stian@oslostudenthub.no";

  const configuredName =
    process.env.RESEND_FROM_NAME?.trim() ||
    process.env.EMAIL_FROM_NAME?.trim() ||
    "Stian Pettersen | Oslo Student Hub";

  return `${configuredName} <${configuredFrom}>`;
}

function getSignatureLogoUrl() {
  return process.env.EMAIL_SIGNATURE_LOGO_URL?.trim() || "https://www.oslostudenthub.no/brand/Logo_OSH_Gradient.svg";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeTemplateKey(value: string) {
  return value.replace(/[\s_-]+/g, "").trim().toLowerCase();
}

function expandTemplateVariables(variables: Record<string, string>) {
  const expanded: Record<string, string> = {};

  for (const [key, value] of Object.entries(variables)) {
    expanded[key] = value;
    expanded[normalizeTemplateKey(key)] = value;
  }

  const displayName = expanded.displayName ?? expanded.display_name ?? expanded.displayname ?? expanded.name ?? expanded.navn ?? "";
  if (displayName) {
    expanded.displayName = displayName;
    expanded.display_name = displayName;
    expanded.displayname = displayName;
    expanded.name = displayName;
    expanded.navn = displayName;
  }

  const firstName =
    expanded.firstName ??
    expanded.first_name ??
    expanded.firstname ??
    expanded.fornavn ??
    (displayName ? displayName.split(" ").filter(Boolean)[0] ?? "" : "");
  if (firstName) {
    expanded.firstName = firstName;
    expanded.first_name = firstName;
    expanded.firstname = firstName;
    expanded.fornavn = firstName;
  }

  const lastName =
    expanded.lastName ??
    expanded.last_name ??
    expanded.lastname ??
    expanded.etternavn ??
    (displayName ? displayName.split(" ").filter(Boolean).slice(1).join(" ") : "");
  if (lastName) {
    expanded.lastName = lastName;
    expanded.last_name = lastName;
    expanded.lastname = lastName;
    expanded.etternavn = lastName;
  }

  const signature = expanded.signature ?? expanded.signatur ?? "";
  if (signature) {
    expanded.signature = signature;
    expanded.signatur = signature;
  }

  return expanded;
}

export function buildRecipientTemplateVariables(input: {
  displayName?: string | null;
  extras?: Record<string, string>;
}) {
  const displayName = input.displayName?.trim() ?? "";
  return expandTemplateVariables({
    displayName,
    ...(input.extras ?? {}),
  });
}

export function buildEmailSignatureHtml(input: EmailSignatureInput) {
  const name = input.name?.trim() ?? "";
  const title = input.title?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";
  const includeLogo = input.includeLogo !== false;
  const signatureLine = [name, title].filter(Boolean).join(" | ");
  const logoUrl = getSignatureLogoUrl();

  if (!signatureLine && !phone) {
    return "";
  }

  return [
    '<div style="margin-top:24px;padding-top:16px;border-top:1px solid #E2D9F3;font-family:Arial,sans-serif;color:#1A1626;">',
    '<p style="margin:0 0 10px 0;">Med vennlig hilsen</p>',
    `<p style="margin:0;line-height:1.6;"><strong>${escapeHtml(signatureLine || "Oslo Student Hub")}</strong><br />Oslo Student Hub${phone ? `<br />Tlf: ${escapeHtml(phone)}` : ""}<br /><a href="https://www.oslostudenthub.no" style="color:#140249;text-decoration:underline;">www.oslostudenthub.no</a></p>`,
    includeLogo
      ? `<div style="margin-top:14px;"><img src="${logoUrl}" alt="Oslo Student Hub" width="148" style="display:block;height:auto;border:0;" /></div>`
      : "",
    "</div>",
  ].join("");
}

export function appendSignatureToEmailHtml(htmlBody: string, signatureHtml: string) {
  if (!signatureHtml.trim()) return htmlBody;
  if (/\{\{\s*(signature|signatur)\s*\}\}/i.test(htmlBody)) {
    return htmlBody;
  }
  return `${htmlBody}${signatureHtml}`;
}

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  type,
  payload = {},
  attachments = [],
  supabase,
}: SendEmailInput) {
  const resend = getResendClient();
  const now = new Date().toISOString();

  let providerMessageId: string | null = null;
  let status: "sent" | "skipped" | "failed" = "skipped";
  let errorMessage: string | null = null;

  if (resend) {
    try {
      const response = await resend.emails.send({
        from: getTransactionalFromAddress(),
        to,
        subject,
        html,
        attachments: attachments.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType ?? undefined,
        })),
      });
      providerMessageId = response.data?.id ?? null;
      status = "sent";
    } catch (error) {
      status = "failed";
      errorMessage = error instanceof Error ? error.message : "Unknown resend error";
    }
  }

  const basePayload =
    payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};

  const logPayload: Json = {
    ...basePayload,
    providerMessageId,
    status,
    errorMessage,
    attachments: attachments.map((attachment) => ({
      filename: attachment.filename,
      contentType: attachment.contentType ?? null,
    })),
  };

  await supabase.from("email_logs").insert({
    to_email: to,
    type,
    subject,
    payload: logPayload,
    sent_at: now,
    created_at: now,
  });

  return { status, providerMessageId, errorMessage };
}

export function renderTemplate(htmlBody: string, variables: Record<string, string>): string {
  const expandedVariables = expandTemplateVariables(variables);
  return htmlBody.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const direct = expandedVariables[key];
    if (typeof direct === "string") return direct;
    const normalized = expandedVariables[normalizeTemplateKey(key)];
    return typeof normalized === "string" ? normalized : `{{${key}}}`;
  });
}

type BulkRecipient = {
  email: string;
  variables?: Record<string, string>;
};

type SendBulkEmailInput = {
  recipients: BulkRecipient[];
  subject: string;
  htmlBody: string;
  type: string;
  templateId?: string;
  batchId: string;
  attachments?: EmailAttachmentInput[];
  supabase: SupabaseClient<Database>;
};

export async function sendBulkEmail({
  recipients,
  subject,
  htmlBody,
  type,
  templateId,
  batchId,
  attachments = [],
  supabase,
}: SendBulkEmailInput): Promise<{ sent: number; failed: number; skipped: number }> {
  const resend = getResendClient();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const recipient of recipients) {
    const renderedHtml = renderTemplate(htmlBody, recipient.variables ?? {});
    const renderedSubject = renderTemplate(subject, recipient.variables ?? {});
    const now = new Date().toISOString();

    let providerMessageId: string | null = null;
    let status: "sent" | "skipped" | "failed" = "skipped";
    let errorMessage: string | null = null;

    if (resend) {
      try {
        const response = await resend.emails.send({
          from: getTransactionalFromAddress(),
          to: recipient.email,
          subject: renderedSubject,
          html: renderedHtml,
          attachments: attachments.map((attachment) => ({
            filename: attachment.filename,
            content: attachment.content,
            contentType: attachment.contentType ?? undefined,
          })),
        });
        providerMessageId = response.data?.id ?? null;
        status = "sent";
        sent++;
      } catch (error) {
        status = "failed";
        errorMessage = error instanceof Error ? error.message : "Unknown resend error";
        failed++;
      }
    } else {
      skipped++;
    }

    const logPayload: Json = {
      providerMessageId,
      status,
      errorMessage,
      attachments: attachments.map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType ?? null,
      })),
    };

    await supabase.from("email_logs").insert({
      to_email: recipient.email,
      type,
      subject: renderedSubject,
      payload: logPayload,
      sent_at: now,
      created_at: now,
      batch_id: batchId,
      template_id: templateId ?? null,
    });
  }

  return { sent, failed, skipped };
}
