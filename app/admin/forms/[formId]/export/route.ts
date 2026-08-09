import { requireRole } from "@/lib/auth";
import { buildFeedbackResponsesCsvRows } from "@/lib/feedback-report";
import { toCsv } from "@/lib/csv";
import { getAdminFeedbackForm } from "@/lib/feedback";

function safeFilename(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9æøå_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ formId: string }> },
) {
  await requireRole("admin");

  const { formId } = await params;
  const result = await getAdminFeedbackForm(formId);

  if (!result) {
    return new Response("Skjemaet ble ikke funnet.", { status: 404 });
  }

  const rows = buildFeedbackResponsesCsvRows(result.form.title, result.questions, result.responses);
  const headers = [
    "Svarnummer",
    "Svar-ID",
    "Innsendt",
    "Skjema",
    ...result.questions.map((question, index) => `${index + 1}. ${question.label}`),
  ];
  const csv = `\ufeff${toCsv(rows, headers)}`;
  const filename = `${safeFilename(result.folder.slug)}-${safeFilename(result.form.slug || result.form.title)}-svar.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
