"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { syncDynamicEmailGroups } from "@/lib/email-groups";
import {
  loadEmailTemplateAttachment,
  parseFormAttachments,
} from "@/lib/email-assets";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  appendSignatureToEmailHtml,
  buildEmailSignatureHtml,
  buildRecipientTemplateVariables,
  sendBulkEmail,
} from "@/lib/resend";

function norm(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

type Recipient = { email: string; variables?: Record<string, string> };

type ActionState = { sent?: number; failed?: number; skipped?: number; error?: string } | null;

export async function sendEmailAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireRole("admin");

  const templateId = norm(formData.get("template_id")) || undefined;
  const subjectOverride = norm(formData.get("subject"));
  const htmlOverride = norm(formData.get("html_body"));
  const recipientMode = norm(formData.get("recipient_mode")); // "group" | "custom"
  const groupId = norm(formData.get("group_id")) || undefined;
  const customEmails = norm(formData.get("custom_emails"));
  const signatureName = norm(formData.get("signature_name")) || profile.full_name || "";
  const signatureTitle = norm(formData.get("signature_title"));
  const signaturePhone = norm(formData.get("signature_phone"));

  const supabase = createAdminSupabaseClient();

  let subject = subjectOverride;
  let htmlBody = htmlOverride;
  let templateAttachment: Awaited<ReturnType<typeof loadEmailTemplateAttachment>> = null;

  if (templateId) {
    const { data: template } = await supabase
      .from("email_templates")
      .select("subject, html_body, attachment_path, attachment_name, attachment_content_type")
      .eq("id", templateId)
      .single();

    if (template) {
      if (!subjectOverride) subject = template.subject;
      if (!htmlOverride) htmlBody = template.html_body;
      templateAttachment = await loadEmailTemplateAttachment({
        path: template.attachment_path,
        filename: template.attachment_name,
        contentType: template.attachment_content_type,
      });
    }
  }

  if (!subject) throw new Error("Emne er påkrevd.");
  if (!htmlBody) throw new Error("Innhold er påkrevd.");

  const signatureHtml = buildEmailSignatureHtml({
    name: signatureName,
    title: signatureTitle,
    phone: signaturePhone,
    includeLogo: formData.get("signature_include_logo") === "on",
  });
  const resolvedHtmlBody = appendSignatureToEmailHtml(htmlBody, signatureHtml);
  const uploadedAttachments = await parseFormAttachments(formData);
  const attachments = [...(templateAttachment ? [templateAttachment] : []), ...uploadedAttachments];

  const recipients: Recipient[] = [];
  const seenEmails = new Set<string>();

  if (recipientMode === "group" && groupId) {
    await syncDynamicEmailGroups({ groupIds: [groupId] });

    const { data: members } = await supabase
      .from("email_group_members")
      .select("email, display_name")
      .eq("group_id", groupId);

    for (const m of members ?? []) {
      const normalizedEmail = m.email?.trim().toLowerCase();
      if (normalizedEmail && !seenEmails.has(normalizedEmail)) {
        seenEmails.add(normalizedEmail);
        recipients.push({
          email: normalizedEmail,
          variables: buildRecipientTemplateVariables({
            displayName: m.display_name ?? "",
            extras: {
              signature: signatureHtml,
              senderName: signatureName,
              senderTitle: signatureTitle,
              senderPhone: signaturePhone,
            },
          }),
        });
      }
    }
  } else if (recipientMode === "custom" && customEmails) {
    const emails = customEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    for (const email of emails) {
      const normalizedEmail = email.toLowerCase();
      if (!seenEmails.has(normalizedEmail)) {
        seenEmails.add(normalizedEmail);
        const derivedName = normalizedEmail.split("@")[0]?.replace(/[._-]+/g, " ").trim() ?? "";
        recipients.push({
          email: normalizedEmail,
          variables: buildRecipientTemplateVariables({
            displayName: derivedName,
            extras: {
              signature: signatureHtml,
              senderName: signatureName,
              senderTitle: signatureTitle,
              senderPhone: signaturePhone,
            },
          }),
        });
      }
    }
  }

  if (recipients.length === 0) {
    return { sent: 0, failed: 0, skipped: 0, error: "Ingen gyldige mottakere funnet." };
  }

  const batchId = crypto.randomUUID();
  const result = await sendBulkEmail({
    recipients,
    subject,
    htmlBody: resolvedHtmlBody,
    type: "bulk_admin",
    templateId,
    batchId,
    attachments,
    supabase,
  });

  revalidatePath("/admin/email");
  return result;
}
