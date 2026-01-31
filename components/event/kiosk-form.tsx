"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { STUDY_CATEGORIES } from "./study-categories";

type CompanyOption = { id: string; name: string };

type KioskFormProps = {
  eventId: string;
  companies: CompanyOption[];
  action: (formData: FormData) => Promise<void>;
};

export function KioskForm({ eventId, companies, action }: KioskFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit() {
    window.setTimeout(() => {
      formRef.current?.reset();
    }, 5000);
  }

  return (
    <Card className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Kioskmodus</p>
        <h2 className="text-2xl font-bold text-primary">Rask registrering</h2>
        <p className="text-sm text-ink/80">Auto-reset etter 5 sekunder. Ingen kontaktinfo lagres her.</p>
      </div>
      <form ref={formRef} action={action} onSubmit={handleSubmit} className="grid gap-3">
        <input type="hidden" name="eventId" value={eventId} readOnly />

        <label className="text-sm font-semibold text-primary">
          Stand (valgfritt)
          <select className="mt-1 w-full rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm" name="companyId" defaultValue="">
            <option value="">Ingen spesifikk stand</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-primary">
          Studieretning
          <select
            name="studyProgram"
            className="mt-1 w-full rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm"
            defaultValue=""
            required
          >
            <option value="" disabled>
              Velg studieretning
            </option>
            {STUDY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-primary">
          Nivå
          <Input name="studyLevel" required placeholder="Bachelor" />
        </label>
        <label className="text-sm font-semibold text-primary">
          Jobbønske (tags)
          <Input name="jobTypes" placeholder="Sommerjobb, Internship" />
        </label>
        <label className="text-sm font-semibold text-primary">
          Interesser (tags)
          <Input name="interests" placeholder="Frontend, Analyse" />
        </label>
        <label className="text-sm font-semibold text-primary">
          Verdier (tags)
          <Input name="values" placeholder="Læring, Teamwork" />
        </label>

        <Button type="submit" className="mt-2 w-full">
          Send inn
        </Button>
      </form>
    </Card>
  );
}
