"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  eventId: string;
  companyId: string;
};

export function AiSummary({ eventId, companyId }: Props) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/ai/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, company_id: companyId }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error ?? "Kunne ikke generere oppsummering.");
      setLoading(false);
      return;
    }

    setSummary(payload.summary ?? "Ingen oppsummering tilgjengelig.");
    setLoading(false);
  }

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">AI (Gemini)</p>
        <h3 className="text-lg font-bold text-primary">Oppsummering og anbefalinger</h3>
        <p className="text-sm text-ink/80">Kalles kun server-side via API route.</p>
      </div>
      <Button onClick={generate} disabled={loading}>
        {loading ? "Genererer…" : "Generer oppsummering"}
      </Button>
      {summary ? <p className="text-sm text-ink/90 whitespace-pre-line">{summary}</p> : null}
      {error ? <p className="text-sm font-semibold text-error">{error}</p> : null}
    </Card>
  );
}
