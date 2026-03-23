"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { renderTemplate, sendBulkEmail } from "@/lib/resend";

function norm(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

type Recipient = { email: string; variables?: Record<string, string> };

type ActionState = { sent?: number; failed?: number; skipped?: number; error?: string } | null;

export async function sendEmailAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("admin");

  const templateId = norm(formData.get("template_id")) || undefined;
  const subjectOverride = norm(formData.get("subject"));
  const htmlOverride = norm(formData.get("html_body"));
  const recipientMode = norm(formData.get("recipient_mode")); // "group" | "custom"
  const groupId = norm(formData.get("group_id")) || undefined;
  const customEmails = norm(formData.get("custom_emails"));

  const supabase = createAdminSupabaseClient();

  let subject = subjectOverride;
  let htmlBody = htmlOverride;

  if (templateId) {
    const { data: template } = await supabase
      .from("email_templates")
      .select("subject, html_body")
      .eq("id", templateId)
      .single();

    if (template) {
      if (!subjectOverride) subject = template.subject;
      if (!htmlOverride) htmlBody = template.html_body;
    }
  }

  if (!subject) throw new Error("Emne er påkrevd.");
  if (!htmlBody) throw new Error("Innhold er påkrevd.");

  const recipients: Recipient[] = [];

  if (recipientMode === "group" && groupId) {
    const { data: members } = await supabase
      .from("email_group_members")
      .select("email, display_name")
      .eq("group_id", groupId);

    for (const m of members ?? []) {
      if (m.email) {
        recipients.push({
          email: m.email,
          variables: { displayName: m.display_name ?? "" },
        });
      }
    }
  } else if (recipientMode === "custom" && customEmails) {
    const emails = customEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    for (const email of emails) {
      recipients.push({ email });
    }
  }

  if (recipients.length === 0) {
    return { sent: 0, failed: 0, skipped: 0, error: "Ingen gyldige mottakere funnet." };
  }

  const batchId = crypto.randomUUID();
  const result = await sendBulkEmail({
    recipients,
    subject,
    htmlBody,
    type: "bulk_admin",
    templateId,
    batchId,
    supabase,
  });

  revalidatePath("/admin/email");
  return result;
}
