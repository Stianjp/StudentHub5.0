"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FeedbackQuestion, FeedbackQuestionKind } from "@/lib/feedback";

type QuestionKind = FeedbackQuestionKind;

type QuestionEditFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  formId: string;
  question: FeedbackQuestion;
  returnTo: string;
};

type OptionRow = {
  id: string;
  value: string;
};

const KIND_OPTIONS: Array<{
  value: QuestionKind;
  label: string;
}> = [
  { value: "short_text", label: "Kort tekst" },
  { value: "long_text", label: "Lang tekst" },
  { value: "yes_no", label: "Ja / nei" },
  { value: "single_choice", label: "Radioknapper" },
  { value: "multi_choice", label: "Flervalg" },
  { value: "number", label: "Tall" },
  { value: "email", label: "E-post" },
  { value: "rating", label: "Vurdering" },
];

function createOptionRow(value = ""): OptionRow {
  return {
    id: crypto.randomUUID(),
    value,
  };
}

function isChoiceKind(kind: QuestionKind) {
  return kind === "single_choice" || kind === "multi_choice";
}

function questionOptions(question: FeedbackQuestion) {
  if (!Array.isArray(question.options)) return [];
  return question.options.map((option) => String(option)).filter(Boolean);
}

export function QuestionEditForm({ action, formId, question, returnTo }: QuestionEditFormProps) {
  const [label, setLabel] = useState(question.label);
  const [helpText, setHelpText] = useState(question.help_text ?? "");
  const [kind, setKind] = useState<QuestionKind>(question.kind);
  const [options, setOptions] = useState<OptionRow[]>(() => questionOptions(question).map(createOptionRow));
  const [required, setRequired] = useState(question.required);
  const [sortOrder, setSortOrder] = useState(String(question.sort_order));

  function syncKind(nextKind: QuestionKind) {
    setKind(nextKind);
    if (nextKind === "yes_no") {
      setOptions([createOptionRow("Ja"), createOptionRow("Nei")]);
      return;
    }
    if (isChoiceKind(nextKind)) {
      setOptions((current) => (current.length > 0 ? current : [createOptionRow("")]));
      return;
    }
    setOptions([]);
  }

  function updateOption(id: string, value: string) {
    setOptions((current) => current.map((option) => (option.id === id ? { ...option, value } : option)));
  }

  function addOption() {
    setOptions((current) => [...current, createOptionRow("")]);
  }

  function removeOption(id: string) {
    setOptions((current) => {
      if (current.length === 1) return current;
      return current.filter((option) => option.id !== id);
    });
  }

  const optionValues = options.map((option) => option.value.trim()).filter(Boolean);

  return (
    <details className="group mt-4">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center justify-center rounded-full border border-primary/15 bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/30 hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">
        <span className="group-open:hidden">Rediger spørsmål</span>
        <span className="hidden group-open:inline">Lukk redigering</span>
      </summary>

        <Card className="admin-light-surface mt-4 border border-primary/10 bg-white p-4">
          <form action={action} className="grid gap-4">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="formId" value={formId} />
            <input type="hidden" name="questionId" value={question.id} />
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="options" value={kind === "yes_no" ? "Ja, Nei" : optionValues.join(", ")} />

            <label className="text-sm font-semibold text-primary">
              Spørsmålstekst
              <Input
                name="label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                required
                placeholder="Skriv spørsmålet"
              />
            </label>

            <div className="grid gap-2">
              <p className="text-sm font-semibold text-primary">Type</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {KIND_OPTIONS.map((option) => {
                  const active = kind === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => syncKind(option.value)}
                      className={`min-h-11 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
                        active
                          ? "border-secondary bg-secondary/15 text-primary shadow-soft"
                          : "border-primary/10 bg-white text-primary hover:border-secondary/50 hover:bg-[#FBF8F4]"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {kind === "yes_no" ? (
              <Card className="admin-light-surface border border-primary/10 bg-[#FBF8F4] p-4 text-sm text-primary/70">
                Ja / nei settes automatisk som svaralternativer.
              </Card>
            ) : null}

            {isChoiceKind(kind) ? (
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-primary">Svaralternativer</p>
                  <Button type="button" variant="secondary" onClick={addOption}>
                    Legg til alternativ
                  </Button>
                </div>
                <div className="grid gap-2">
                  {options.map((option, index) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <Input
                        value={option.value}
                        onChange={(event) => updateOption(option.id, event.target.value)}
                        placeholder={`Alternativ ${index + 1}`}
                      />
                      <button
                        type="button"
                        disabled={options.length === 1}
                        onClick={() => removeOption(option.id)}
                        className="inline-flex min-h-11 items-center justify-center rounded-full border border-primary/15 px-4 text-sm font-semibold text-primary transition hover:border-primary/30 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                      >
                        Fjern
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="text-sm font-semibold text-primary">
              Hjelpetekst
              <Textarea
                name="helpText"
                value={helpText}
                onChange={(event) => setHelpText(event.target.value)}
                rows={3}
                placeholder="Valgfri forklaring under spørsmålet."
              />
            </label>

            <label className="text-sm font-semibold text-primary">
              Sortering
              <Input name="sortOrder" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} type="number" />
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-[#FBF8F4] p-4 text-sm font-semibold text-primary">
              <input
                type="checkbox"
                name="required"
                checked={required}
                onChange={(event) => setRequired(event.target.checked)}
                className="mt-1 size-4 rounded border-primary/30 text-secondary"
              />
              Obligatorisk
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button type="submit">Lagre spørsmål</Button>
            </div>
          </form>
        </Card>
    </details>
  );
}
