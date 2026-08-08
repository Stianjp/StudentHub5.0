"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseFeedbackAnswers, type FeedbackQuestion } from "@/lib/feedback";

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

export async function submitFeedbackForm(formData: FormData) {
  const folderSlug = String(formData.get("folderSlug") ?? "").trim();
  const formSlug = String(formData.get("formSlug") ?? "").trim();
  const formId = String(formData.get("formId") ?? "").trim();

  try {
    const supabase = await createServerSupabaseClient();

    const [{ data: form, error: formError }, { data: questions, error: questionsError }] = await Promise.all([
      supabase
        .from("feedback_forms")
        .select("*")
        .eq("id", formId)
        .eq("is_published", true)
        .maybeSingle(),
      supabase
        .from("feedback_questions")
        .select("*")
        .eq("form_id", formId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    if (formError) throw formError;
    if (questionsError) throw questionsError;
    if (!form) {
      throw new Error("Skjemaet finnes ikke.");
    }

    const answers = parseFeedbackAnswers((questions ?? []) as FeedbackQuestion[], formData);
    const now = new Date().toISOString();
    const requestHeaders = await headers();

    const { error: insertError } = await supabase.from("feedback_responses").insert({
      form_id: form.id,
      answers,
      metadata: {
        folder_slug: folderSlug || null,
        form_slug: formSlug || null,
        host: requestHeaders.get("host"),
        user_agent: requestHeaders.get("user-agent"),
        referer: requestHeaders.get("referer"),
      },
      submitted_at: now,
      created_at: now,
    });
    if (insertError) throw insertError;

    redirect(`/feedback/${folderSlug}/${formSlug}?submitted=1`);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    const message = getErrorMessage(error);
    if (folderSlug && formSlug) {
      redirect(`/feedback/${folderSlug}/${formSlug}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
}
