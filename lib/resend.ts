import { Resend } from "resend";
import type { Database, Json } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type EmailType = "invite_company" | "event_confirmation" | "roi_ready";

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
        from: "OSH StudentHub <noreply@oslostudenthub.no>",
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
