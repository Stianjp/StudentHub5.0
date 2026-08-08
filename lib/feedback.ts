import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import type { TableRow } from "@/lib/types/database";

export const FEEDBACK_QUESTION_KINDS = [
  "short_text",
  "long_text",
  "rating",
  "single_choice",
  "multi_choice",
  "number",
  "email",
  "yes_no",
] as const;

export type FeedbackQuestionKind = (typeof FEEDBACK_QUESTION_KINDS)[number];

export type FeedbackFolder = TableRow<"feedback_folders">;
export type FeedbackForm = TableRow<"feedback_forms">;
export type FeedbackQuestion = TableRow<"feedback_questions">;
export type FeedbackResponse = TableRow<"feedback_responses">;

export type FeedbackFormWithMeta = FeedbackForm & {
  questionCount: number;
  responseCount: number;
};

export type FeedbackFolderWithForms = FeedbackFolder & {
  forms: FeedbackFormWithMeta[];
  formCount: number;
  responseCount: number;
};

export type FeedbackFormDetail = {
  folder: FeedbackFolder;
  form: FeedbackForm;
  questions: FeedbackQuestion[];
  responses: FeedbackResponse[];
};

export function buildFeedbackSlug(value: string) {
  const result = slugify(value);
  return result.length > 0 ? result : "nytt-skjema";
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function isPublishedForm(form: FeedbackForm) {
  return form.is_published;
}

function groupBy<T extends { [key in K]: string }, K extends keyof T>(rows: T[], key: K) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const groupKey = row[key];
    const current = map.get(groupKey) ?? [];
    current.push(row);
    map.set(groupKey, current);
  }
  return map;
}

function sortByOrderThenCreated<T extends { sort_order: number; created_at: string }>(rows: T[]) {
  return [...rows].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }
    return left.created_at.localeCompare(right.created_at);
  });
}

function buildFolderOverview(
  folders: FeedbackFolder[],
  forms: FeedbackForm[],
  questions: FeedbackQuestion[],
  responses: FeedbackResponse[],
) {
  const formsByFolder = groupBy(forms, "folder_id");
  const questionsByForm = groupBy(questions, "form_id");
  const responsesByForm = groupBy(responses, "form_id");

  return sortByOrderThenCreated(folders).map((folder) => {
    const folderForms = sortByOrderThenCreated(formsByFolder.get(folder.id) ?? []).map((form) => {
      const folderQuestions = sortByOrderThenCreated(questionsByForm.get(form.id) ?? []);
      const folderResponses = sortByOrderThenCreated(responsesByForm.get(form.id) ?? []);

      return {
        ...form,
        questionCount: folderQuestions.length,
        responseCount: folderResponses.length,
      };
    });

    return {
      ...folder,
      forms: folderForms,
      formCount: folderForms.length,
      responseCount: folderForms.reduce((sum, form) => sum + form.responseCount, 0),
    };
  });
}

export async function getPublicFeedbackLandingData() {
  const supabase = await createServerSupabaseClient();
  const [foldersResult, formsResult, questionsResult] = await Promise.all([
    supabase
      .from("feedback_folders")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("feedback_forms")
      .select("*")
      .eq("is_published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("feedback_questions")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (foldersResult.error) throw foldersResult.error;
  if (formsResult.error) throw formsResult.error;
  if (questionsResult.error) throw questionsResult.error;

  return buildFolderOverview(
    (foldersResult.data ?? []) as FeedbackFolder[],
    (formsResult.data ?? []) as FeedbackForm[],
    (questionsResult.data ?? []) as FeedbackQuestion[],
    [],
  );
}

export async function getPublicFeedbackFolder(folderSlug: string) {
  const supabase = await createServerSupabaseClient();
  const { data: folder, error: folderError } = await supabase
    .from("feedback_folders")
    .select("*")
    .eq("slug", folderSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (folderError) throw folderError;
  if (!folder) {
    return null;
  }

  const [{ data: forms, error: formsError }, { data: questions, error: questionsError }] = await Promise.all([
    supabase
      .from("feedback_forms")
      .select("*")
      .eq("is_published", true)
      .eq("folder_id", folder.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("feedback_questions")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (formsError) throw formsError;
  if (questionsError) throw questionsError;

  const questionsByForm = groupBy((questions ?? []) as FeedbackQuestion[], "form_id");

  return {
    folder,
    forms: sortByOrderThenCreated((forms ?? []) as FeedbackForm[]).map((form) => ({
      ...form,
      questionCount: (questionsByForm.get(form.id) ?? []).length,
      responseCount: 0,
    })),
    questions: (questions ?? []) as FeedbackQuestion[],
  };
}

export async function getPublicFeedbackForm(folderSlug: string, formSlug: string) {
  const supabase = await createServerSupabaseClient();

  const { data: folder, error: folderError } = await supabase
    .from("feedback_folders")
    .select("*")
    .eq("slug", folderSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (folderError) throw folderError;
  if (!folder) return null;

  const { data: form, error: formError } = await supabase
    .from("feedback_forms")
    .select("*")
    .eq("folder_id", folder.id)
    .eq("slug", formSlug)
    .eq("is_published", true)
    .maybeSingle();

  if (formError) throw formError;
  if (!form) return null;

  const { data: questions, error: questionsError } = await supabase
    .from("feedback_questions")
    .select("*")
    .eq("form_id", form.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (questionsError) throw questionsError;

  return {
    folder: folder as FeedbackFolder,
    form: form as FeedbackForm,
    questions: (questions ?? []) as FeedbackQuestion[],
  };
}

export async function getAdminFeedbackOverview() {
  const supabase = createAdminSupabaseClient();
  const [foldersResult, formsResult, questionsResult, responsesResult] = await Promise.all([
    supabase
      .from("feedback_folders")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("feedback_forms")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("feedback_questions")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("feedback_responses")
      .select("*")
      .order("submitted_at", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (foldersResult.error) throw foldersResult.error;
  if (formsResult.error) throw formsResult.error;
  if (questionsResult.error) throw questionsResult.error;
  if (responsesResult.error) throw responsesResult.error;

  return buildFolderOverview(
    (foldersResult.data ?? []) as FeedbackFolder[],
    (formsResult.data ?? []) as FeedbackForm[],
    (questionsResult.data ?? []) as FeedbackQuestion[],
    (responsesResult.data ?? []) as FeedbackResponse[],
  );
}

export async function listAdminFeedbackResponses() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("feedback_responses")
    .select("*")
    .order("submitted_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FeedbackResponse[];
}

export async function getAdminFeedbackForm(formId: string): Promise<FeedbackFormDetail | null> {
  const supabase = createAdminSupabaseClient();

  const [{ data: form, error: formError }, { data: responses, error: responsesError }] = await Promise.all([
    supabase.from("feedback_forms").select("*").eq("id", formId).maybeSingle(),
    supabase
      .from("feedback_responses")
      .select("*")
      .eq("form_id", formId)
      .order("submitted_at", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (formError) throw formError;
  if (responsesError) throw responsesError;
  if (!form) return null;

  const [{ data: folder, error: folderError }, { data: questions, error: questionsError }] = await Promise.all([
    supabase.from("feedback_folders").select("*").eq("id", form.folder_id).maybeSingle(),
    supabase
      .from("feedback_questions")
      .select("*")
      .eq("form_id", form.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (folderError) throw folderError;
  if (questionsError) throw questionsError;
  if (!folder) return null;

  return {
    folder: folder as FeedbackFolder,
    form: form as FeedbackForm,
    questions: (questions ?? []) as FeedbackQuestion[],
    responses: (responses ?? []) as FeedbackResponse[],
  };
}

export function normalizeFeedbackOptions(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseFeedbackAnswers(
  questions: FeedbackQuestion[],
  formData: FormData,
) {
  const answers: Record<string, string | number | boolean | string[]> = {};

  for (const question of questions) {
    const rawValues = formData.getAll(question.id).map((entry) => String(entry).trim()).filter(Boolean);

    if (question.kind === "multi_choice") {
      answers[question.id] = rawValues;
      continue;
    }

    const rawValue = rawValues[0] ?? "";
    if (question.kind === "rating" || question.kind === "number") {
      const parsed = Number(rawValue);
      answers[question.id] = Number.isFinite(parsed) ? parsed : rawValue;
      continue;
    }

    if (question.kind === "yes_no") {
      answers[question.id] = rawValue === "yes";
      continue;
    }

    answers[question.id] = rawValue;
  }

  return answers;
}

export function questionOptions(question: FeedbackQuestion) {
  return asStringArray(question.options);
}

export function publishedFormsByFolder(folders: FeedbackFolderWithForms[]) {
  return folders
    .map((folder) => ({
      ...folder,
      forms: folder.forms.filter((form) => isPublishedForm(form)),
    }))
    .filter((folder) => folder.forms.length > 0);
}

export function sortFeedbackFolders(folders: FeedbackFolderWithForms[]) {
  return [...folders].sort((left, right) => {
    if (left.sort_order !== right.sort_order) return left.sort_order - right.sort_order;
    return left.created_at.localeCompare(right.created_at);
  });
}

export function deriveFeedbackSlug(value: string) {
  return buildFeedbackSlug(value);
}
