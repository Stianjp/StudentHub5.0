"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CompanyOption = {
  id: string;
  name: string;
  category_tags?: string[] | null;
};

type RegistrationFormProps = {
  eventId: string;
  companies: CompanyOption[];
  mode: "kiosk" | "stand";
  lockedCompany?: { id: string; name: string };
};

const INTEREST_OPTIONS = [
  "Fast jobb",
  "Deltidsjobb",
  "Sommerjobb",
  "Graduate-stilling",
  "Bacheloroppgave",
  "Masteroppgave",
];

const CATEGORY_GROUPS = [
  "BYGGINGENIØRER",
  "DATAINGENIØR/IT",
  "ELEKTROINGENIØRER",
  "ENERGI & MILJØ INGENIØR",
  "BIOTEKNOLOGI- OG KJEMIINGENIØR",
  "MASKINIGENIØRER",
  "ØKONOMI OG ADMINISTRASJON",
  "LEDELSE",
  "HUMAN RESOURCES",
];

function normalizeTag(value: string) {
  return value.trim().toUpperCase();
}

export function RegistrationForm({ eventId, companies, mode, lockedCompany }: RegistrationFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [studyLevel, setStudyLevel] = useState<"Bachelor" | "Master" | "">("");
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(
    lockedCompany ? new Set([lockedCompany.id]) : new Set(),
  );
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set());

  const availableCompanies = useMemo(
    () => companies.filter((company) => company.id !== lockedCompany?.id),
    [companies, lockedCompany?.id],
  );

  const yearOptions = studyLevel === "Master" ? [1, 2, 3, 4, 5] : [1, 2, 3];

  function toggleCompany(companyId: string) {
    setSelectedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  }

  function toggleInterest(interest: string) {
    setSelectedInterests((prev) => {
      const next = new Set(prev);
      if (next.has(interest)) {
        next.delete(interest);
      } else {
        next.add(interest);
      }
      return next;
    });
  }

  function selectAllCompanies() {
    const all = companies.map((company) => company.id);
    setSelectedCompanies(new Set(all));
  }

  function selectByCategory(category: string) {
    const normalized = normalizeTag(category);
    const matching = companies.filter((company) =>
      (company.category_tags ?? []).map(normalizeTag).includes(normalized),
    );
    setSelectedCompanies((prev) => {
      const next = new Set(prev);
      const allSelected = matching.every((company) => next.has(company.id));
      matching.forEach((company) => {
        if (allSelected) {
          next.delete(company.id);
        } else {
          next.add(company.id);
        }
      });
      return next;
    });
  }

  function resetForm() {
    formRef.current?.reset();
    setStudyLevel("");
    setSelectedInterests(new Set());
    setSelectedCompanies(lockedCompany ? new Set([lockedCompany.id]) : new Set());
    setStatus("idle");
    setMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("idle");
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const year = String(formData.get("studyYear") ?? "").trim();
    const fieldOfStudy = String(formData.get("fieldOfStudy") ?? "").trim();
    const consent = Boolean(formData.get("consent"));

    const companyIds = lockedCompany ? [lockedCompany.id] : Array.from(selectedCompanies);

    if (!email) {
      setStatus("error");
      setMessage("E-post er påkrevd.");
      return;
    }
    if (!consent) {
      setStatus("error");
      setMessage("Du må gi samtykke for å registrere deg.");
      return;
    }
    if (!studyLevel) {
      setStatus("error");
      setMessage("Velg studienivå.");
      return;
    }
    if (!year) {
      setStatus("error");
      setMessage("Velg studieår.");
      return;
    }
    if (!fieldOfStudy) {
      setStatus("error");
      setMessage("Studieretning er påkrevd.");
      return;
    }
    if (selectedInterests.size === 0) {
      setStatus("error");
      setMessage("Velg minst én interesse.");
      return;
    }
    if (companyIds.length === 0) {
      setStatus("error");
      setMessage("Velg minst én bedrift.");
      return;
    }

    const payload = {
      email,
      companyIds,
      studyLevel,
      studyYear: Number(year),
      fieldOfStudy,
      interests: Array.from(selectedInterests),
      consent,
      source: mode === "kiosk" ? "kiosk" : "qr",
    };

    const response = await fetch(`/api/events/${eventId}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setStatus("error");
      setMessage(data.error ?? "Kunne ikke lagre registrering.");
      return;
    }

    setStatus("success");
    setMessage("Takk! Registreringen er sendt inn.");
    window.setTimeout(() => resetForm(), 5000);
  }

  return (
    <Card className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">
          {mode === "kiosk" ? "Kioskmodus" : "Standregistrering"}
        </p>
        <h2 className="text-2xl font-bold text-primary">Rask studentregistrering</h2>
        <p className="text-sm text-ink/80">
          {mode === "kiosk"
            ? "Velg bedrifter du ønsker kontakt fra. Skjemaet nullstilles etter 5 sekunder."
            : "Registrer deg til denne bedriften. Skjemaet nullstilles etter 5 sekunder."}
        </p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4">
        <label className="text-sm font-semibold text-primary">
          E-post
          <Input name="email" type="email" required placeholder="navn@studie.no" />
        </label>

        {mode === "kiosk" ? (
          <div className="grid gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={selectAllCompanies}>
                Velg alle bedrifter
              </Button>
              {CATEGORY_GROUPS.map((category) => (
                <Button
                  key={category}
                  type="button"
                  variant="secondary"
                  onClick={() => selectByCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {availableCompanies.map((company) => (
                <label
                  key={company.id}
                  className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedCompanies.has(company.id)}
                    onChange={() => toggleCompany(company.id)}
                    className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                  />
                  <span className="font-semibold text-primary">{company.name}</span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 text-sm text-ink/80">
            Bedrift: <span className="font-semibold text-primary">{lockedCompany?.name}</span>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold text-primary">
            Studienivå
            <div className="mt-2 flex flex-wrap gap-2">
              {["Bachelor", "Master"].map((level) => (
                <label key={level} className="flex items-center gap-2 rounded-full border border-primary/20 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="studyLevel"
                    value={level}
                    checked={studyLevel === level}
                    onChange={() => setStudyLevel(level as "Bachelor" | "Master")}
                  />
                  {level}
                </label>
              ))}
            </div>
          </label>
          <label className="text-sm font-semibold text-primary">
            Studieår
            <select
              name="studyYear"
              className="mt-2 w-full rounded-full border border-primary/20 bg-surface px-5 py-3 text-sm font-semibold text-primary shadow-sm outline-none"
              disabled={!studyLevel}
              defaultValue=""
              required
            >
              <option value="" disabled>
                Velg år
              </option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}. år {studyLevel === "Master" ? "master" : "bachelor"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="text-sm font-semibold text-primary">
          Hva studerer du?
          <Input name="fieldOfStudy" required placeholder="F.eks. Informatikk" />
        </label>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold text-primary">Interesse / rekrutteringsformål</legend>
          <div className="grid gap-2 md:grid-cols-2">
            {INTEREST_OPTIONS.map((interest) => (
              <label
                key={interest}
                className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedInterests.has(interest)}
                  onChange={() => toggleInterest(interest)}
                  className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                />
                {interest}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary">
          <input className="h-4 w-4" type="checkbox" name="consent" value="true" />
          Jeg samtykker til å bli kontaktet av bedriften(e).
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
    </Card>
  );
}
