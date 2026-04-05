import { randomUUID } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { EmailAttachmentInput } from "@/lib/resend";

export const EMAIL_TEMPLATE_ASSET_BUCKET = "email-template-assets";

function sanitizeFileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0;
}

export async function uploadEmailTemplateAttachment(input: {
  file: File;
  templateId?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  const safeName = sanitizeFileName(input.file.name) || "attachment";
  const path = `templates/${input.templateId || "drafts"}/${Date.now()}-${randomUUID()}-${safeName}`;

  const { error } = await supabase.storage
    .from(EMAIL_TEMPLATE_ASSET_BUCKET)
    .upload(path, Buffer.from(await input.file.arrayBuffer()), {
      contentType: input.file.type || "application/octet-stream",
      upsert: true,
    });

  if (error) throw new Error(`Kunne ikke laste opp vedlegg: ${error.message}`);

  return {
    path,
    name: input.file.name,
    contentType: input.file.type || "application/octet-stream",
  };
}

export async function removeEmailTemplateAttachment(path: string | null | undefined) {
  if (!path) return;
  const supabase = createAdminSupabaseClient();
  await supabase.storage.from(EMAIL_TEMPLATE_ASSET_BUCKET).remove([path]).catch(() => undefined);
}

export async function loadEmailTemplateAttachment(input: {
  path: string | null | undefined;
  filename?: string | null;
  contentType?: string | null;
}): Promise<EmailAttachmentInput | null> {
  if (!input.path) return null;
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.storage.from(EMAIL_TEMPLATE_ASSET_BUCKET).download(input.path);
  if (error) throw new Error(`Kunne ikke lese mallagret vedlegg: ${error.message}`);

  return {
    filename: input.filename?.trim() || input.path.split("/").pop() || "attachment",
    content: Buffer.from(await data.arrayBuffer()),
    contentType: input.contentType?.trim() || data.type || "application/octet-stream",
  };
}

export async function parseFormAttachments(formData: FormData, name = "attachments") {
  const files = formData.getAll(name).filter(isUploadedFile);
  return Promise.all(
    files.map(async (file) => ({
      filename: file.name,
      content: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || "application/octet-stream",
    })),
  );
}
