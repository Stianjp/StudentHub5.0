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
  supabase: SupabaseClient<Database>;
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

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  type,
  payload = {},
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
  return htmlBody.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
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
  supabase: SupabaseClient<Database>;
};

export async function sendBulkEmail({
  recipients,
  subject,
  htmlBody,
  type,
  templateId,
  batchId,
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

    const logPayload: Json = { providerMessageId, status, errorMessage };

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
