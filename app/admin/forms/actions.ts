"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  buildFeedbackSlug,
  FEEDBACK_QUESTION_KINDS,
  normalizeFeedbackOptions,
  type FeedbackQuestion,
  type FeedbackQuestionKind,
} from "@/lib/feedback";
import { isUuid } from "@/lib/utils";

function isNextRedirectError(error: unknown) {
  const digest = (error as { digest?: string })?.digest;
  const message = (error as { message?: string })?.message;
  return digest === "NEXT_REDIRECT" || message === "NEXT_REDIRECT";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  const message = (error as { message?: string })?.message;
  if (typeof message === "string" && message.length > 0) return message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Ukjent feil";
  }
}

function getFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  if (value !== null) return value;

  for (const [key, entry] of formData.entries()) {
    const normalized = key.replace(/^\d+_/, "");
    if (normalized === name || normalized.endsWith(name)) {
      return entry;
    }
  }

  return null;
}

function isChecked(formData: FormData, name: string) {
  const value = formData.get(name);
  return value === "on" || value === "true" || value === "1";
}

function getQuestionField(formData: FormData, questionId: string, field: string) {
  const direct = formData.get(`question_${questionId}_${field}`);
  if (direct !== null) return direct;

  for (const [key, value] of formData.entries()) {
    if (key === `${questionId}_${field}` || key === `question_${questionId}_${field}`) {
      return value;
    }
  }

  return null;
}

function parseBuilderQuestions(formData: FormData) {
  const orderRaw = String(getFormValue(formData, "questionOrder") ?? "").trim();
  const questionIds = orderRaw.split(",").map((item) => item.trim()).filter(Boolean);

  if (questionIds.length === 0) {
    throw new Error("Legg til minst ett spørsmål.");
  }

  return questionIds.map((questionId, index) => {
    const label = String(getQuestionField(formData, questionId, "label") ?? "").trim();
    const kind = String(getQuestionField(formData, questionId, "kind") ?? "").trim();
    const helpText = String(getQuestionField(formData, questionId, "helpText") ?? "").trim();
    const options = normalizeFeedbackOptions(String(getQuestionField(formData, questionId, "options") ?? ""));
    const required = isChecked(formData, `question_${questionId}_required`);

    if (!label) {
      throw new Error(`Spørsmål ${index + 1} må ha en tittel.`);
    }
    if (!kind) {
      throw new Error(`Spørsmål ${index + 1} må ha en type.`);
    }
    if (!FEEDBACK_QUESTION_KINDS.includes(kind as FeedbackQuestionKind)) {
      throw new Error(`Spørsmål ${index + 1} har ugyldig type.`);
    }
    if ((kind === "single_choice" || kind === "multi_choice") && options.length === 0) {
      throw new Error(`Spørsmål ${index + 1} må ha minst ett alternativ.`);
    }

    return {
      label,
      kind: kind as FeedbackQuestion["kind"],
      help_text: helpText || null,
      required,
      options,
      sort_order: index,
    };
  });
}

function redirectBack(returnTo: FormDataEntryValue | null, path: string) {
  if (typeof returnTo === "string" && returnTo.startsWith("/")) {
    redirect(`${path}?saved=1`);
  }
}

export async function createFeedbackFolderAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");

  try {
    const name = String(getFormValue(formData, "name") ?? "").trim();
    const slugValue = String(getFormValue(formData, "slug") ?? "").trim();
    const description = String(getFormValue(formData, "description") ?? "").trim();
    const sortOrderValue = String(getFormValue(formData, "sortOrder") ?? "").trim();

    if (!name) {
      throw new Error("Navn på arrangementmappe er påkrevd.");
    }

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("feedback_folders").insert({
      name,
      slug: slugValue ? buildFeedbackSlug(slugValue) : buildFeedbackSlug(name),
      description: description || null,
      sort_order: sortOrderValue ? Number(sortOrderValue) : 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    revalidatePath("/admin/forms");
    revalidatePath("/feedback");
    redirectBack(returnTo, "/admin/forms");
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?error=${encodeURIComponent(getErrorMessage(error))}`);
    }
    throw error;
  }
}

export async function createFeedbackFormAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");

  try {
    const folderId = String(getFormValue(formData, "folderId") ?? "").trim();
    const title = String(getFormValue(formData, "title") ?? "").trim();
    const slugValue = String(getFormValue(formData, "slug") ?? "").trim();
    const description = String(getFormValue(formData, "description") ?? "").trim();
    const introText = String(getFormValue(formData, "introText") ?? "").trim();
    const ctaLabel = String(getFormValue(formData, "ctaLabel") ?? "").trim();
    const thankYouText = String(getFormValue(formData, "thankYouText") ?? "").trim();
    const sortOrderValue = String(getFormValue(formData, "sortOrder") ?? "").trim();

    if (!isUuid(folderId)) {
      throw new Error("Velg en gyldig mappe.");
    }
    if (!title) {
      throw new Error("Tittel er påkrevd.");
    }

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("feedback_forms").insert({
      folder_id: folderId,
      title,
      slug: slugValue ? buildFeedbackSlug(slugValue) : buildFeedbackSlug(title),
      description: description || null,
      intro_text: introText || null,
      cta_label: ctaLabel || "Start",
      thank_you_text: thankYouText || "Takk for tilbakemeldingen.",
      sort_order: sortOrderValue ? Number(sortOrderValue) : 0,
      is_published: isChecked(formData, "isPublished"),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    revalidatePath("/admin/forms");
    revalidatePath("/feedback");
    redirectBack(returnTo, "/admin/forms");
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?error=${encodeURIComponent(getErrorMessage(error))}`);
    }
    throw error;
  }
}

export async function createFeedbackFormWizardAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");

  try {
    const folderId = String(getFormValue(formData, "folderId") ?? "").trim();
    const title = String(getFormValue(formData, "title") ?? "").trim();
    const slugValue = String(getFormValue(formData, "slug") ?? "").trim();
    const description = String(getFormValue(formData, "description") ?? "").trim();
    const introText = String(getFormValue(formData, "introText") ?? "").trim();
    const ctaLabel = String(getFormValue(formData, "ctaLabel") ?? "").trim();
    const thankYouText = String(getFormValue(formData, "thankYouText") ?? "").trim();
    const sortOrderValue = String(getFormValue(formData, "sortOrder") ?? "").trim();

    if (!isUuid(folderId)) {
      throw new Error("Velg en gyldig mappe.");
    }
    if (!title) {
      throw new Error("Tittel er påkrevd.");
    }

    const questions = parseBuilderQuestions(formData);
    const supabase = createAdminSupabaseClient();
    const now = new Date().toISOString();

    const [{ data: folder, error: folderError }, { data: form, error: formError }] = await Promise.all([
      supabase.from("feedback_folders").select("id, slug").eq("id", folderId).maybeSingle(),
      supabase.from("feedback_forms").insert({
        folder_id: folderId,
        title,
        slug: slugValue ? buildFeedbackSlug(slugValue) : buildFeedbackSlug(title),
        description: description || null,
        intro_text: introText || null,
        cta_label: ctaLabel || "Start",
        thank_you_text: thankYouText || "Takk for tilbakemeldingen.",
        sort_order: sortOrderValue ? Number(sortOrderValue) : 0,
        is_published: isChecked(formData, "isPublished"),
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single(),
    ]);

    if (folderError) throw folderError;
    if (formError) throw formError;
    if (!folder || !form) {
      throw new Error("Kunne ikke opprette skjema.");
    }

    for (const question of questions) {
      const { error } = await supabase.from("feedback_questions").insert({
        form_id: form.id,
        label: question.label,
        kind: question.kind,
        help_text: question.help_text,
        required: question.required,
        options: question.options,
        sort_order: question.sort_order,
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
    }

    revalidatePath("/admin/forms");
    revalidatePath("/feedback");
    revalidatePath(`/feedback/${folder.slug}`);
    if (form.is_published) {
      revalidatePath(`/feedback/${folder.slug}/${form.slug}`);
    }
    redirect(`/admin/forms/${form.id}?saved=1`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?error=${encodeURIComponent(getErrorMessage(error))}`);
    }
    throw error;
  }
}

export async function saveFeedbackFormAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");

  try {
    const formId = String(getFormValue(formData, "formId") ?? "").trim();
    const folderId = String(getFormValue(formData, "folderId") ?? "").trim();
    const title = String(getFormValue(formData, "title") ?? "").trim();
    const slugValue = String(getFormValue(formData, "slug") ?? "").trim();
    const description = String(getFormValue(formData, "description") ?? "").trim();
    const introText = String(getFormValue(formData, "introText") ?? "").trim();
    const ctaLabel = String(getFormValue(formData, "ctaLabel") ?? "").trim();
    const thankYouText = String(getFormValue(formData, "thankYouText") ?? "").trim();
    const sortOrderValue = String(getFormValue(formData, "sortOrder") ?? "").trim();

    if (!isUuid(formId)) {
      throw new Error("Ugyldig skjema.");
    }
    if (!isUuid(folderId)) {
      throw new Error("Velg en gyldig mappe.");
    }
    if (!title) {
      throw new Error("Tittel er påkrevd.");
    }

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("feedback_forms")
      .update({
        folder_id: folderId,
        title,
        slug: slugValue ? buildFeedbackSlug(slugValue) : buildFeedbackSlug(title),
        description: description || null,
        intro_text: introText || null,
        cta_label: ctaLabel || "Start",
        thank_you_text: thankYouText || "Takk for tilbakemeldingen.",
        sort_order: sortOrderValue ? Number(sortOrderValue) : 0,
        is_published: isChecked(formData, "isPublished"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", formId);
    if (error) throw error;

    revalidatePath("/admin/forms");
    revalidatePath("/feedback");
    redirectBack(returnTo, "/admin/forms");
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?error=${encodeURIComponent(getErrorMessage(error))}`);
    }
    throw error;
  }
}

export async function setFeedbackFormPublishedAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");

  try {
    const formId = String(getFormValue(formData, "formId") ?? "").trim();
    const isPublished = isChecked(formData, "isPublished");

    if (!isUuid(formId)) {
      throw new Error("Ugyldig skjema.");
    }

    const supabase = createAdminSupabaseClient();
    const { data: form, error: formError } = await supabase
      .from("feedback_forms")
      .select("id, slug, folder_id")
      .eq("id", formId)
      .maybeSingle();

    if (formError) throw formError;
    if (!form) {
      throw new Error("Skjemaet finnes ikke.");
    }

    const { data: folder, error: folderError } = await supabase
      .from("feedback_folders")
      .select("slug")
      .eq("id", form.folder_id)
      .maybeSingle();

    if (folderError) throw folderError;
    if (!folder) {
      throw new Error("Mappen til skjemaet ble ikke funnet.");
    }

    const { error } = await supabase
      .from("feedback_forms")
      .update({
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      })
      .eq("id", formId);
    if (error) throw error;

    revalidatePath("/admin/forms");
    revalidatePath("/feedback");
    revalidatePath(`/feedback/${folder.slug}`);
    revalidatePath(`/feedback/${folder.slug}/${form.slug}`);
    redirectBack(returnTo, `/admin/forms/${formId}`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?error=${encodeURIComponent(getErrorMessage(error))}`);
    }
    throw error;
  }
}

export async function deleteFeedbackFormAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");

  try {
    const formId = String(getFormValue(formData, "formId") ?? "").trim();

    if (!isUuid(formId)) {
      throw new Error("Ugyldig skjema.");
    }

    const supabase = createAdminSupabaseClient();
    const { data: form, error: formError } = await supabase
      .from("feedback_forms")
      .select("id, slug, folder_id")
      .eq("id", formId)
      .maybeSingle();

    if (formError) throw formError;
    if (!form) {
      throw new Error("Skjemaet finnes ikke.");
    }

    const { data: folder, error: folderError } = await supabase
      .from("feedback_folders")
      .select("slug")
      .eq("id", form.folder_id)
      .maybeSingle();

    if (folderError) throw folderError;

    const { error } = await supabase.from("feedback_forms").delete().eq("id", formId);
    if (error) throw error;

    revalidatePath("/admin/forms");
    revalidatePath("/feedback");
    if (folder?.slug) {
      revalidatePath(`/feedback/${folder.slug}`);
      revalidatePath(`/feedback/${folder.slug}/${form.slug}`);
    }

    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?deleted=1`);
    }
    redirect("/admin/forms?deleted=1");
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?error=${encodeURIComponent(getErrorMessage(error))}`);
    }
    throw error;
  }
}

export async function createFeedbackQuestionAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");

  try {
    const formId = String(getFormValue(formData, "formId") ?? "").trim();
    const label = String(getFormValue(formData, "label") ?? "").trim();
    const kind = String(getFormValue(formData, "kind") ?? "").trim();
    const helpText = String(getFormValue(formData, "helpText") ?? "").trim();
    const sortOrderValue = String(getFormValue(formData, "sortOrder") ?? "").trim();

    if (!isUuid(formId)) {
      throw new Error("Velg et skjema.");
    }
    if (!label) {
      throw new Error("Spørsmålet må ha en tittel.");
    }
    if (!kind) {
      throw new Error("Velg en spørsmåls-type.");
    }
    if (!FEEDBACK_QUESTION_KINDS.includes(kind as FeedbackQuestionKind)) {
      throw new Error("Ugyldig spørsmålstype.");
    }

    const options = normalizeFeedbackOptions(String(getFormValue(formData, "options") ?? ""));

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from("feedback_questions").insert({
      form_id: formId,
      label,
      kind,
      help_text: helpText || null,
      required: isChecked(formData, "required"),
      options,
      sort_order: sortOrderValue ? Number(sortOrderValue) : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    revalidatePath("/admin/forms");
    revalidatePath(`/admin/forms/${formId}`);
    revalidatePath("/feedback");
    redirectBack(returnTo, `/admin/forms/${formId}`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?error=${encodeURIComponent(getErrorMessage(error))}`);
    }
    throw error;
  }
}

export async function toggleFeedbackFormPublishedAction(formData: FormData) {
  await requireRole("admin");
  const returnTo = formData.get("returnTo");

  try {
    const formId = String(getFormValue(formData, "formId") ?? "").trim();
    const published = isChecked(formData, "isPublished");

    if (!isUuid(formId)) {
      throw new Error("Ugyldig skjema.");
    }

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from("feedback_forms")
      .update({
        is_published: published,
        updated_at: new Date().toISOString(),
      })
      .eq("id", formId);
    if (error) throw error;

    revalidatePath("/admin/forms");
    revalidatePath("/feedback");
    redirectBack(returnTo, `/admin/forms/${formId}`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    if (typeof returnTo === "string" && returnTo.startsWith("/")) {
      redirect(`${returnTo}?error=${encodeURIComponent(getErrorMessage(error))}`);
    }
    throw error;
  }
}
