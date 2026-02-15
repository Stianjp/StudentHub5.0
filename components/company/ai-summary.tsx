"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  eventId: string;
  companyId: string;
};

const EXAMPLE_QUESTION =
  "Hvor mange studenter fra arrangementet Student Connect som vi snakket med var klare for sommerjobb eller graduate hos oss?";

export function AiSummary({ eventId, companyId }: Props) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(mode: "summary" | "question") {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/ai/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        company_id: companyId,
        question: mode === "question" ? question : "",
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error ?? "Kunne ikke hente AI-svar.");
      setLoading(false);
      return;
    }

    setSummary(payload.summary ?? "Ingen svar tilgjengelig.");
    setLoading(false);
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">AI (Gemini)</p>
        <h3 className="text-lg font-bold text-primary">Sporsmal om egne data</h3>
        <p className="text-sm text-ink/80">
          Still sporsmal om ROI/leads for valgt event. AI bruker kun deres egne eventdata.
        </p>
      </div>

      <label className="text-sm font-semibold text-primary">
        Sporsmal (valgfritt)
        <Textarea
          rows={3}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="F.eks. Hvor mange vi snakket med pa stand var klare for sommerjobb eller graduate?"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => setQuestion(EXAMPLE_QUESTION)}>
          Bruk eksempel
        </Button>
        <Button type="button" onClick={() => run("question")} disabled={loading || question.trim().length === 0}>
          {loading ? "Henter..." : "Spør AI"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => run("summary")} disabled={loading}>
          {loading ? "Genererer..." : "Generer oppsummering"}
        </Button>
      </div>

      {summary ? <p className="whitespace-pre-line text-sm text-ink/90">{summary}</p> : null}
      {error ? <p className="text-sm font-semibold text-error">{error}</p> : null}
    </Card>
  );
}

