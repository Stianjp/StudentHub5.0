"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FeedbackQuestionKind } from "@/lib/feedback";

type QuestionKind = FeedbackQuestionKind;

type QuestionCreateFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  formId: string;
  returnTo: string;
};

type OptionRow = {
  id: string;
  value: string;
};

const KIND_OPTIONS: Array<{
  value: QuestionKind;
  label: string;
  description: string;
}> = [
  { value: "short_text", label: "Kort tekst", description: "Én kort svarlinje." },
  { value: "long_text", label: "Lang tekst", description: "Flere linjer med tekst." },
  { value: "yes_no", label: "Ja / nei", description: "Raske binære svar." },
  { value: "single_choice", label: "Radioknapper", description: "Velg ett alternativ." },
  { value: "multi_choice", label: "Flervalg", description: "Velg flere alternativer." },
  { value: "number", label: "Tall", description: "Kun numerisk svar." },
  { value: "email", label: "E-post", description: "E-postadresse." },
  { value: "rating", label: "Vurdering", description: "Skala fra 1 til 5." },
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

export function QuestionCreateForm({ action, formId, returnTo }: QuestionCreateFormProps) {
  const [label, setLabel] = useState("");
  const [helpText, setHelpText] = useState("");
  const [kind, setKind] = useState<QuestionKind>("short_text");
  const [options, setOptions] = useState<OptionRow[]>(() => []);
  const [required, setRequired] = useState(false);
  const [sortOrder, setSortOrder] = useState("0");

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

  const optionValues = options.map((option) => option.value).filter(Boolean);

  return (
    <Card className="admin-light-surface flex flex-col gap-5">
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-primary">Nytt spørsmål</h3>
        <p className="text-sm leading-6 text-primary/70">
          Skriv spørsmålet, velg type, og legg inn svaralternativer bare når det trengs.
        </p>
      </div>

      <form action={action} className="grid gap-4">
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="formId" value={formId} />
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="options" value={kind === "yes_no" ? "Ja, Nei" : optionValues.join(", ")} />

        <label className="text-sm font-semibold text-primary">
          Spørsmål
          <Input
            name="label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            required
            placeholder="Hvor fornøyd var du?"
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
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-secondary bg-secondary/15 text-primary shadow-soft"
                      : "border-primary/10 bg-white text-primary hover:border-secondary/50 hover:bg-[#FBF8F4]"
                  }`}
                >
                  <span className="block text-sm font-bold">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-primary/60">{option.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Card className="admin-light-surface border border-primary/10 bg-[#FBF8F4] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/50">Forhåndsvisning</p>
          <div className="mt-3 rounded-2xl border border-primary/10 bg-white p-4">
            <p className="text-sm font-bold text-primary">{label || "Skriv spørsmålet her"}</p>
            <div className="mt-3">
              {kind === "short_text" ? (
                <div className="h-11 rounded-full border border-primary/20 bg-surface px-4 py-3 text-sm text-primary/45">
                  Kort svar
                </div>
              ) : null}
              {kind === "long_text" ? (
                <div className="min-h-24 rounded-2xl border border-primary/20 bg-surface px-4 py-3 text-sm text-primary/45">
                  Flere linjer med tekst
                </div>
              ) : null}
              {kind === "email" ? (
                <div className="h-11 rounded-full border border-primary/20 bg-surface px-4 py-3 text-sm text-primary/45">
                  navn@eksempel.no
                </div>
              ) : null}
              {kind === "number" ? (
                <div className="h-11 rounded-full border border-primary/20 bg-surface px-4 py-3 text-sm text-primary/45">
                  0
                </div>
              ) : null}
              {kind === "rating" ? (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <span key={value} className="inline-flex size-10 items-center justify-center rounded-full border border-primary/20 bg-surface text-sm font-semibold text-primary/55">
                      {value}
                    </span>
                  ))}
                </div>
              ) : null}
              {kind === "yes_no" ? (
                <div className="flex flex-wrap gap-2">
                  {["Ja", "Nei"].map((value) => (
                    <span key={value} className="inline-flex min-h-11 items-center justify-center rounded-full border border-primary/20 bg-surface px-4 text-sm font-semibold text-primary/70">
                      {value}
                    </span>
                  ))}
                </div>
              ) : null}
              {isChoiceKind(kind) ? (
                <div className="grid gap-2">
                  {optionValues.length > 0 ? (
                    optionValues.map((value) => (
                      <div key={value} className="rounded-2xl border border-primary/10 bg-surface px-4 py-3 text-sm text-primary/70">
                        {kind === "multi_choice" ? "☐" : "◯"} {value}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-primary/55">Legg til svaralternativer.</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </Card>

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
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-primary/15 px-4 text-sm font-semibold text-primary transition hover:border-primary/30 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
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

        <label className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-white p-4 text-sm font-semibold text-primary">
          <input
            type="checkbox"
            name="required"
            checked={required}
            onChange={(event) => setRequired(event.target.checked)}
            className="mt-1 size-4 rounded border-primary/30 text-secondary"
          />
          Obligatorisk
        </label>

        <div className="flex items-center justify-end">
          <Button type="submit">Legg til spørsmål</Button>
        </div>
      </form>
    </Card>
  );
}
