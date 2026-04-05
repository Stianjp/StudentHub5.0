"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  isUploadedFile,
  removeEmailTemplateAttachment,
  uploadEmailTemplateAttachment,
} from "@/lib/email-assets";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function extractVariables(text: string): string[] {
  const matches = text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

function norm(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createTemplate(formData: FormData) {
  await requireRole("admin");

  const name = norm(formData.get("name"));
  const subject = norm(formData.get("subject"));
  const htmlBody = norm(formData.get("html_body"));
  const isActive = formData.get("is_active") === "on";
  const attachment = formData.get("attachment");

  if (!name) throw new Error("Navn er påkrevd.");
  if (!subject) throw new Error("Emne er påkrevd.");
  if (!htmlBody) throw new Error("Innhold er påkrevd.");

  const variables = extractVariables(subject + " " + htmlBody);
  const supabase = createAdminSupabaseClient();
  const uploadedAttachment = isUploadedFile(attachment)
    ? await uploadEmailTemplateAttachment({ file: attachment })
    : null;

  const { error } = await supabase.from("email_templates").insert({
    name,
    subject,
    html_body: htmlBody,
    attachment_path: uploadedAttachment?.path ?? null,
    attachment_name: uploadedAttachment?.name ?? null,
    attachment_content_type: uploadedAttachment?.contentType ?? null,
    variables,
    is_active: isActive,
  });

  if (error) throw new Error(`Kunne ikke opprette mal: ${error.message}`);

  redirect("/admin/email/templates");
}

export async function updateTemplate(formData: FormData) {
  await requireRole("admin");

  const id = norm(formData.get("id"));
  const name = norm(formData.get("name"));
  const subject = norm(formData.get("subject"));
  const htmlBody = norm(formData.get("html_body"));
  const isActive = formData.get("is_active") === "on";
  const attachment = formData.get("attachment");
  const removeAttachment = formData.get("remove_attachment") === "on";

  if (!id) throw new Error("Mal-ID mangler.");
  if (!name) throw new Error("Navn er påkrevd.");
  if (!subject) throw new Error("Emne er påkrevd.");

  const variables = extractVariables(subject + " " + htmlBody);
  const supabase = createAdminSupabaseClient();
  const { data: existingTemplate } = await supabase
    .from("email_templates")
    .select("attachment_path")
    .eq("id", id)
    .maybeSingle();

  const uploadedAttachment = isUploadedFile(attachment)
    ? await uploadEmailTemplateAttachment({ file: attachment, templateId: id })
    : null;

  if ((removeAttachment || uploadedAttachment) && existingTemplate?.attachment_path) {
    await removeEmailTemplateAttachment(existingTemplate.attachment_path);
  }

  const { error } = await supabase
    .from("email_templates")
    .update({
      name,
      subject,
      html_body: htmlBody,
      attachment_path: uploadedAttachment
        ? uploadedAttachment.path
        : removeAttachment
          ? null
          : undefined,
      attachment_name: uploadedAttachment
        ? uploadedAttachment.name
        : removeAttachment
          ? null
          : undefined,
      attachment_content_type: uploadedAttachment
        ? uploadedAttachment.contentType
        : removeAttachment
          ? null
          : undefined,
      variables,
      is_active: isActive,
    })
    .eq("id", id);

  if (error) throw new Error(`Kunne ikke oppdatere mal: ${error.message}`);

  revalidatePath("/admin/email/templates");
  redirect("/admin/email/templates");
}

export async function deleteTemplate(formData: FormData) {
  await requireRole("admin");

  const id = norm(formData.get("id"));
  if (!id) throw new Error("Mal-ID mangler.");

  const supabase = createAdminSupabaseClient();
  const { data: existingTemplate } = await supabase
    .from("email_templates")
    .select("attachment_path")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("email_templates").delete().eq("id", id);
  if (error) throw new Error(`Kunne ikke slette mal: ${error.message}`);

  if (existingTemplate?.attachment_path) {
    await removeEmailTemplateAttachment(existingTemplate.attachment_path);
  }

  revalidatePath("/admin/email/templates");
  redirect("/admin/email/templates");
}
