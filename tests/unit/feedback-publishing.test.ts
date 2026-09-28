import { describe, expect, it, vi } from "vitest";
import { feedbackPublicUrl } from "@/lib/feedback-url";

const { adminClient, requireRole } = vi.hoisted(() => ({ adminClient: vi.fn(), requireRole: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabaseClient: adminClient }));
vi.mock("@/lib/auth", () => ({ requireRole }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw Object.assign(new Error("NEXT_REDIRECT"), { path }); } }));

function setup(questionError: Error | null) {
  const publish = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  const cleanup = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  const insertForm = vi.fn().mockReturnValue({ select: () => ({ single: async () => ({ data: { id: "new-form", slug: "test" }, error: null }) }) });
  const insertQuestions = vi.fn().mockResolvedValue({ error: questionError });
  adminClient.mockReturnValue({ from: (table: string) => {
    if (table === "feedback_folders") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "folder", slug: "event", is_active: true }, error: null }) }) }) };
    if (table === "feedback_questions") return { insert: insertQuestions };
    return { insert: insertForm, update: publish, delete: cleanup };
  } });
  const data = new FormData();
  Object.entries({ folderId: "00000000-0000-4000-8000-000000000070", title: "Test", isPublished: "on", questionOrder: "stable-id", "question_stable-id_label": "How was it?", "question_stable-id_kind": "short_text" }).forEach(([key, value]) => data.set(key, value));
  return { data, publish, cleanup, insertForm };
}

function setupQuestionUpdate() {
  const updateQuestion = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) });
  adminClient.mockReturnValue({ from: (table: string) => {
    if (table === "feedback_forms") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "00000000-0000-4000-8000-000000000101", slug: "test", folder_id: "00000000-0000-4000-8000-000000000070" }, error: null }) }) }) };
    if (table === "feedback_folders") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { slug: "event" }, error: null }) }) }) };
    if (table === "feedback_questions") return { update: updateQuestion };
    throw new Error(`Unexpected table ${table}`);
  } });
  const data = new FormData();
  Object.entries({
    returnTo: "/admin/forms/00000000-0000-4000-8000-000000000101",
    formId: "00000000-0000-4000-8000-000000000101",
    questionId: "00000000-0000-4000-8000-000000000102",
    label: "Updated question",
    kind: "single_choice",
    options: "Yes, No",
    required: "on",
    sortOrder: "2",
  }).forEach(([key, value]) => data.set(key, value));
  return { data, updateQuestion };
}

describe("feedback publishing", () => {
  it("uses the feedback host for public links", () => {
    expect(feedbackPublicUrl()).toBe("https://feedback.oslostudenthub.no/#skjemaer");
    expect(feedbackPublicUrl("event", "form")).toBe("https://feedback.oslostudenthub.no/event/form");
  });
  it("creates an unpublished form and publishes only after saving questions", async () => {
    const mocks = setup(null);
    const { createFeedbackFormWizardAction } = await import("@/app/admin/forms/actions");
    await expect(createFeedbackFormWizardAction(mocks.data)).rejects.toMatchObject({ message: "NEXT_REDIRECT" });
    expect(requireRole).toHaveBeenCalledWith("admin");
    expect(mocks.insertForm).toHaveBeenCalledWith(expect.objectContaining({ is_published: false }));
    expect(mocks.publish).toHaveBeenCalledWith(expect.objectContaining({ is_published: true }));
    expect(mocks.cleanup).not.toHaveBeenCalled();
  });
  it("does not publish partial forms when saving questions fails", async () => {
    const mocks = setup(new Error("Question save failed"));
    const { createFeedbackFormWizardAction } = await import("@/app/admin/forms/actions");
    await expect(createFeedbackFormWizardAction(mocks.data)).rejects.toThrow("Question save failed");
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.cleanup).toHaveBeenCalled();
  });
  it("updates an existing feedback question", async () => {
    const mocks = setupQuestionUpdate();
    const { updateFeedbackQuestionAction } = await import("@/app/admin/forms/actions");
    await expect(updateFeedbackQuestionAction(mocks.data)).rejects.toMatchObject({ message: "NEXT_REDIRECT" });
    expect(requireRole).toHaveBeenCalledWith("admin");
    expect(mocks.updateQuestion).toHaveBeenCalledWith(expect.objectContaining({
      label: "Updated question",
      kind: "single_choice",
      options: ["Yes", "No"],
      required: true,
      sort_order: 2,
    }));
  });
});
