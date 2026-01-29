"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type StandFormProps = {
  eventId: string;
  companyId: string;
  companyName: string;
  studentEmail: string;
  studyLevel?: string | null;
  studyYear?: number | null;
  fieldOfStudy?: string | null;
};

export function StandForm({
  eventId,
  companyId,
  companyName,
  studentEmail,
  studyLevel,
  studyYear,
  fieldOfStudy,
}: StandFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("idle");
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const consent = Boolean(formData.get("consent"));
    const interestTokens = [
      formData.get("motivation")?.toString(),
      formData.get("timing")?.toString(),
      formData.get("skills")?.toString(),
    ]
      .map((value) => value?.trim())
      .filter(Boolean) as string[];

    const payload = {
      email: studentEmail,
      eventId,
      studyLevel: studyLevel ?? "",
      studyYear: studyYear ? String(studyYear) : "",
      fieldOfStudy: fieldOfStudy ?? "",
      interests: interestTokens,
      jobTypes: [],
      consentToBeContacted: consent,
      source: "stand",
    };

    const response = await fetch(`/api/companies/${companyId}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus("error");
      setMessage(data.error ?? "Kunne ikke lagre samtykke.");
      return;
    }

    setStatus("success");
    setMessage("Takk! Registreringen er sendt inn.");
    setTimeout(() => {
      formRef.current?.reset();
      setStatus("idle");
      setMessage(null);
    }, 5000);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-3">
      <label className="flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
        <input className="h-4 w-4" type="checkbox" name="consent" value="true" />
        Jeg samtykker til at {companyName} kan kontakte meg om relevante muligheter basert på interessene mine.
      </label>

      <label className="text-sm font-semibold text-primary">
        Hva er du mest interessert i?
        <Input name="motivation" placeholder="F.eks. sommerjobb, tech stack, team" />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-semibold text-primary">
          Når passer det?
          <Input name="timing" placeholder="Sommer 2026" />
        </label>
        <label className="text-sm font-semibold text-primary">
          Viktigste ferdigheter
          <Input name="skills" placeholder="React, analyse, strategi" />
        </label>
      </div>

      <label className="text-sm font-semibold text-primary">
        Frivillig kommentar
        <Textarea name="note" rows={3} placeholder="Lagres ikke ennå. TODO." />
      </label>

      <Button type="submit" className="mt-2 w-full">
        Send inn
      </Button>

      {message ? (
        <p
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${
            status === "error" ? "bg-error/15 text-error" : "bg-success/15 text-success"
          }`}
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
      {status === "success" ? (
        <p className="text-xs text-ink/70">Skjemaet nullstilles automatisk etter 5 sekunder.</p>
      ) : null}
    </form>
  );
}
