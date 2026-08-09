import { questionOptions, type FeedbackQuestion, type FeedbackResponse } from "@/lib/feedback";

export type FeedbackAnswerCount = {
  label: string;
  count: number;
};

export type FeedbackQuestionSummary = {
  question: FeedbackQuestion;
  answeredCount: number;
  missingCount: number;
  totalCount: number;
  counts: FeedbackAnswerCount[];
  examples: string[];
  average: number | null;
};

export type FeedbackResponseCsvRow = Record<string, string | number>;

function getResponseAnswers(response: FeedbackResponse) {
  return (response.answers ?? {}) as Record<string, unknown>;
}

function hasAnswerValue(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function toAnswerStrings(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "boolean") {
    return [value ? "Ja" : "Nei"];
  }
  if (value === null || value === undefined) return [];
  const stringValue = String(value).trim();
  return stringValue ? [stringValue] : [];
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function formatFeedbackAnswer(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ");
  }
  if (value === true) return "Ja";
  if (value === false) return "Nei";
  if (value === null || value === undefined || value === "") return "Ingen verdi";
  return String(value);
}

export function buildFeedbackQuestionSummaries(
  questions: FeedbackQuestion[],
  responses: FeedbackResponse[],
) {
  return questions.map((question) => {
    const counts = new Map<string, number>();
    const examples: string[] = [];
    const numericValues: number[] = [];
    let answeredCount = 0;
    let missingCount = 0;

    for (const response of responses) {
      const answerValue = getResponseAnswers(response)[question.id];

      if (!hasAnswerValue(answerValue)) {
        missingCount += 1;
        continue;
      }

      answeredCount += 1;

      if (question.kind === "multi_choice") {
        for (const item of toAnswerStrings(answerValue)) {
          counts.set(item, (counts.get(item) ?? 0) + 1);
        }
        continue;
      }

      if (question.kind === "single_choice") {
        for (const item of toAnswerStrings(answerValue).slice(0, 1)) {
          counts.set(item, (counts.get(item) ?? 0) + 1);
        }
        continue;
      }

      if (question.kind === "yes_no") {
        const normalizedValue = String(answerValue).toLowerCase();
        const normalized =
          answerValue === true || normalizedValue === "yes" || normalizedValue === "true" ? "Ja" : "Nei";
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
        continue;
      }

      if (question.kind === "rating") {
        const parsed = Number(answerValue);
        if (Number.isFinite(parsed)) {
          const rounded = Math.trunc(parsed);
          numericValues.push(rounded);
          counts.set(String(rounded), (counts.get(String(rounded)) ?? 0) + 1);
        } else {
          const fallback = formatFeedbackAnswer(answerValue);
          counts.set(fallback, (counts.get(fallback) ?? 0) + 1);
        }
        continue;
      }

      if (question.kind === "number") {
        const parsed = Number(answerValue);
        if (Number.isFinite(parsed)) {
          numericValues.push(parsed);
        }
      }

      const values = toAnswerStrings(answerValue);
      for (const item of values) {
        if (examples.length < 3 && !examples.includes(item)) {
          examples.push(item);
        }
      }
    }

    const orderedCounts: FeedbackAnswerCount[] = [];

    if (question.kind === "single_choice" || question.kind === "multi_choice") {
      for (const option of questionOptions(question)) {
        orderedCounts.push({ label: option, count: counts.get(option) ?? 0 });
        counts.delete(option);
      }
      for (const [label, count] of [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0], "nb"))) {
        orderedCounts.push({ label, count });
      }
    } else if (question.kind === "yes_no") {
      for (const option of ["Ja", "Nei"]) {
        orderedCounts.push({ label: option, count: counts.get(option) ?? 0 });
        counts.delete(option);
      }
      for (const [label, count] of [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0], "nb"))) {
        orderedCounts.push({ label, count });
      }
    } else if (question.kind === "rating") {
      for (const rating of [1, 2, 3, 4, 5]) {
        orderedCounts.push({ label: String(rating), count: counts.get(String(rating)) ?? 0 });
        counts.delete(String(rating));
      }
      for (const [label, count] of [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0], "nb"))) {
        orderedCounts.push({ label, count });
      }
    } else {
      for (const [label, count] of counts.entries()) {
        orderedCounts.push({ label, count });
      }
    }

    return {
      question,
      answeredCount,
      missingCount,
      totalCount: responses.length,
      counts: orderedCounts,
      examples,
      average: question.kind === "rating" || question.kind === "number" ? average(numericValues) : null,
    };
  });
}

export function buildFeedbackResponsesCsvRows(
  formTitle: string,
  questions: FeedbackQuestion[],
  responses: FeedbackResponse[],
) {
  return responses.map((response, index) => {
    const row: FeedbackResponseCsvRow = {
      "Svarnummer": index + 1,
      "Svar-ID": response.id,
      "Innsendt": response.submitted_at,
      "Skjema": formTitle,
    };

    const answerMap = getResponseAnswers(response);

    questions.forEach((question, questionIndex) => {
      const key = `${questionIndex + 1}. ${question.label}`;
      const answerValue = answerMap[question.id];
      row[key] = formatFeedbackAnswer(answerValue);
    });

    return row;
  });
}
