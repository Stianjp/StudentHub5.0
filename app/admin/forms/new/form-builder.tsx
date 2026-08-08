"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FeedbackFolder, FeedbackSlugSuggestionGroup } from "@/lib/feedback";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SlugPicker } from "@/components/admin/slug-picker";
import { Input } from "@/components/ui/input";

type QuestionKind = "short_text" | "long_text" | "yes_no" | "single_choice" | "multi_choice";

type QuestionDraft = {
  id: string;
  kind: QuestionKind;
  label: string;
  helpText: string;
  options: string;
  required: boolean;
};

function createQuestionDraft(): QuestionDraft {
  return {
    id: crypto.randomUUID(),
    kind: "short_text",
    label: "",
    helpText: "",
    options: "",
    required: false,
  };
}

function isChoiceKind(kind: QuestionKind) {
  return kind === "yes_no" || kind === "single_choice" || kind === "multi_choice";
}

type BuilderProps = {
  folders: Pick<FeedbackFolder, "id" | "name" | "slug" | "description">[];
  slugGroups: FeedbackSlugSuggestionGroup[];
  action: (formData: FormData) => void | Promise<void>;
};

export function FeedbackFormBuilder({ folders, slugGroups, action }: BuilderProps) {
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => [createQuestionDraft()]);

  function updateQuestion(id: string, patch: Partial<QuestionDraft>) {
    setQuestions((current) =>
      current.map((question) => (question.id === id ? { ...question, ...patch } : question)),
    );
  }

  function removeQuestion(id: string) {
    setQuestions((current) => {
      if (current.length === 1) return current;
      return current.filter((question) => question.id !== id);
    });
  }

  function updateQuestionKind(id: string, kind: QuestionKind) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id
          ? {
              ...question,
              kind,
              options: kind === "yes_no" ? "Ja, Nei" : kind === "short_text" || kind === "long_text" ? "" : question.options || "",
            }
          : question,
      ),
    );
  }

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="questionOrder" value={questions.map((question) => question.id).join(",")} />

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="admin-light-surface flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-bold text-primary">Skjemaoppsett</h3>
            <p className="text-sm text-primary/70">
              Velg arrangement, gi skjemaet en tydelig tittel og bestem om det skal publiseres nå.
            </p>
          </div>

          <label className="text-sm font-semibold text-primary">
            Arrangementmappe
            <Select name="folderId" required defaultValue={folders[0]?.id ?? ""}>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </Select>
          </label>

          <label className="text-sm font-semibold text-primary">
            Skjematittel
            <Input name="title" required placeholder="Hva synes du om arrangementet?" />
          </label>

          <SlugPicker
            name="slug"
            label="Slug"
            groups={slugGroups}
            placeholder="hva-synes-du-om-arrangementet"
            helpText="Velg en eksisterende slug eller legg til ny nederst i menyen."
          />

          <label className="text-sm font-semibold text-primary">
            Kort beskrivelse
            <Textarea name="description" rows={3} placeholder="Kort forklaring av hva skjemaet brukes til." />
          </label>

          <label className="text-sm font-semibold text-primary">
            Introtekst
            <Textarea name="introText" rows={4} placeholder="Forklar kort hvorfor folk skal fylle ut skjemaet." />
          </label>

          <label className="text-sm font-semibold text-primary">
            Knappetekst
            <Input name="ctaLabel" defaultValue="Start" />
          </label>

          <label className="text-sm font-semibold text-primary">
            Takk-tekst
            <Textarea name="thankYouText" rows={3} defaultValue="Takk for tilbakemeldingen." />
          </label>

          <label className="admin-light-surface text-sm font-semibold text-primary">
            Sortering
            <Input name="sortOrder" type="number" defaultValue={0} />
          </label>

          <label className="admin-light-surface flex items-start gap-3 rounded-2xl border border-primary/10 bg-[#FBF8F4] p-4 text-sm font-semibold text-primary">
            <input
              type="checkbox"
              name="isPublished"
              className="mt-1 size-4 rounded border-primary/30 text-secondary"
            />
            Publiser skjemaet med en gang
          </label>
        </Card>

        <Card className="admin-light-surface flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-primary">Spørsmål</h3>
              <p className="text-sm text-primary/70">
                Legg til ett eller flere spørsmål. Velg type, fyll inn alternativer når det trengs, og marker obligatorisk svar.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setQuestions((current) => [...current, createQuestionDraft()])}
            >
              Legg til spørsmål
            </Button>
          </div>

          <div className="grid gap-4">
            {questions.map((question, index) => (
              <Card key={question.id} className="admin-light-surface border border-primary/10 bg-[#FBF8F4] p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary/50">
                        Spørsmål {index + 1}
                      </p>
                      <p className="text-base font-bold text-primary">Rediger feltet under</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeQuestion(question.id)}
                      disabled={questions.length === 1}
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-primary/15 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/30 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Fjern
                    </button>
                  </div>

                  <label className="text-sm font-semibold text-primary">
                    Spørsmålstekst
                    <Input
                      name={`question_${question.id}_label`}
                      value={question.label}
                      onChange={(event) => updateQuestion(question.id, { label: event.target.value })}
                      placeholder="Skriv spørsmålet her"
                      required
                    />
                  </label>

                  <label className="text-sm font-semibold text-primary">
                    Type svar
                    <Select
                      name={`question_${question.id}_kind`}
                      value={question.kind}
                      onChange={(event) => updateQuestionKind(question.id, event.target.value as QuestionKind)}
                    >
                      <option value="short_text">Tekstsvar</option>
                      <option value="long_text">Langt tekstsvar</option>
                      <option value="yes_no">Ja / nei</option>
                      <option value="single_choice">Radioknapper</option>
                      <option value="multi_choice">Flervalg</option>
                    </Select>
                  </label>

                  {isChoiceKind(question.kind) ? (
                    <label className="text-sm font-semibold text-primary">
                      Svaralternativer
                      <Textarea
                        name={`question_${question.id}_options`}
                        rows={3}
                        value={question.options}
                        onChange={(event) => updateQuestion(question.id, { options: event.target.value })}
                        placeholder={question.kind === "yes_no" ? "Ja, Nei" : "Alternativ 1, Alternativ 2, Alternativ 3"}
                        required={question.kind !== "yes_no"}
                        readOnly={question.kind === "yes_no"}
                      />
                      {question.kind === "yes_no" ? (
                        <span className="mt-1 block text-xs font-normal text-primary/55">
                          Ja / nei fylles inn automatisk.
                        </span>
                      ) : (
                        <span className="mt-1 block text-xs font-normal text-primary/55">
                          Skriv alternativene separert med komma.
                        </span>
                      )}
                    </label>
                  ) : null}

                  <label className="admin-light-surface text-sm font-semibold text-primary">
                    Hjelpetekst
                    <Textarea
                      name={`question_${question.id}_helpText`}
                      rows={2}
                      value={question.helpText}
                      onChange={(event) => updateQuestion(question.id, { helpText: event.target.value })}
                      placeholder="Valgfri forklaring under spørsmålet."
                    />
                  </label>

                  <label className="admin-light-surface flex items-start gap-3 rounded-2xl border border-white/80 bg-white px-4 py-3 text-sm font-semibold text-primary">
                    <input
                      type="checkbox"
                      name={`question_${question.id}_required`}
                      checked={question.required}
                      onChange={(event) => updateQuestion(question.id, { required: event.target.checked })}
                      className="mt-1 size-4 rounded border-primary/30 text-secondary"
                    />
                    Obligatorisk å svare
                  </label>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/admin/forms" className="button-link text-sm">
          Tilbake til oversikt
        </Link>
        <Button type="submit" className="w-full sm:w-auto">
          Opprett skjema
        </Button>
      </div>
    </form>
  );
}
