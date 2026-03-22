"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function extractVariables(text: string): string[] {
  const matches = text.matchAll(/\{\{(\w+)\}\}/g);
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

  if (!name) throw new Error("Navn er påkrevd.");
  if (!subject) throw new Error("Emne er påkrevd.");
  if (!htmlBody) throw new Error("Innhold er påkrevd.");

  const variables = extractVariables(subject + " " + htmlBody);
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase.from("email_templates").insert({
    name,
    subject,
    html_body: htmlBody,
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

  if (!id) throw new Error("Mal-ID mangler.");
  if (!name) throw new Error("Navn er påkrevd.");
  if (!subject) throw new Error("Emne er påkrevd.");

  const variables = extractVariables(subject + " " + htmlBody);
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase
    .from("email_templates")
    .update({ name, subject, html_body: htmlBody, variables, is_active: isActive })
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
  const { error } = await supabase.from("email_templates").delete().eq("id", id);
  if (error) throw new Error(`Kunne ikke slette mal: ${error.message}`);

  revalidatePath("/admin/email/templates");
  redirect("/admin/email/templates");
}
