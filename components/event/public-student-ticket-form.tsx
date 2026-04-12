"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STUDY_CATEGORIES } from "@/components/event/study-categories";
import {
  getPasswordStrengthSummary,
  getStudentJobTypeOptions,
  getStudyYearOptions,
  STUDY_LEVEL_OPTIONS,
  type StudyLevel,
} from "@/lib/auth-registration";

const INTEREST_OPTIONS = [
  "Teknologi",
  "Økonomi",
  "Konsulent",
  "Markedsføring",
  "Salg",
  "HR",
  "Design",
  "Produkt",
];

const TEAM_SIZE_OPTIONS = ["1-5", "6-20", "21-50", "50+"];

type CompanyOption = {
  id: string;
  name: string;
  industry: string | null;
};

type InitialValues = {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  school?: string | null;
  studyProgram?: string | null;
  studyLevel?: string | null;
  studyYear?: number | null;
  jobTypes?: string[] | null;
  interests?: string[] | null;
  values?: string[] | null;
  preferredLocations?: string[] | null;
  willingToRelocate?: boolean | null;
  about?: string | null;
  workStyle?: string | null;
  socialProfile?: string | null;
  teamSize?: string | null;
  likedCompanyIds?: string[] | null;
};

type SubmissionState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string; details?: string }
  | { kind: "error"; message: string; details?: string };

export function PublicStudentTicketForm({
  eventId,
  eventName,
  companies,
  initialValues,
}: {
  eventId: string;
  eventName: string;
  companies: CompanyOption[];
  initialValues?: InitialValues | null;
}) {
  const [submissionState, setSubmissionState] = useState<SubmissionState>({ kind: "idle" });
  const [createAccount, setCreateAccount] = useState(true);
  const [studyLevel, setStudyLevel] = useState<StudyLevel | "">(
    initialValues?.studyLevel === "Bachelor" || initialValues?.studyLevel === "Master"
      ? initialValues.studyLevel
      : "",
  );
  const [studyYear, setStudyYear] = useState(initialValues?.studyYear ? String(initialValues.studyYear) : "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>(initialValues?.jobTypes ?? []);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    (initialValues?.interests ?? []).filter((interest) => INTEREST_OPTIONS.includes(interest)),
  );
  const [customInterests, setCustomInterests] = useState(
    (initialValues?.interests ?? [])
      .filter((interest) => !INTEREST_OPTIONS.includes(interest))
      .join(", "),
  );
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(initialValues?.likedCompanyIds ?? []);

  const studyYearOptions = useMemo(() => getStudyYearOptions(studyLevel), [studyLevel]);
  const jobTypeOptions = useMemo(() => getStudentJobTypeOptions(studyLevel), [studyLevel]);
  const passwordSummary = useMemo(
    () => getPasswordStrengthSummary(password, confirmPassword),
    [password, confirmPassword],
  );

  function toggleValue(currentValues: string[], value: string) {
    if (currentValues.includes(value)) {
      return currentValues.filter((entry) => entry !== value);
    }
    return [...currentValues, value];
  }

  function handleStudyLevelChange(value: string) {
    const nextLevel = value as StudyLevel | "";
    setStudyLevel(nextLevel);
    setSelectedJobTypes((prev) =>
      prev.filter((jobType) => getStudentJobTypeOptions(nextLevel).some((option) => option.value === jobType)),
    );
    if (!getStudyYearOptions(nextLevel).includes(Number(studyYear))) {
      setStudyYear("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionState({ kind: "loading" });

    const formData = new FormData(event.currentTarget);
    const payload = {
      fullName: String(formData.get("fullName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      school: String(formData.get("school") ?? "").trim(),
      studyProgram: String(formData.get("studyProgram") ?? "").trim(),
      studyLevel,
      studyYear: Number(studyYear),
      jobTypes: selectedJobTypes,
      interests: [
        ...selectedInterests,
        ...String(formData.get("customInterests") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ],
      values: String(formData.get("values") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      preferredLocations: String(formData.get("preferredLocations") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      willingToRelocate: Boolean(formData.get("willingToRelocate")),
      likedCompanyIds: selectedCompanies,
      about: String(formData.get("about") ?? "").trim(),
      workStyle: String(formData.get("workStyle") ?? "").trim(),
      socialProfile: String(formData.get("socialProfile") ?? "").trim(),
      teamSize: String(formData.get("teamSize") ?? "").trim(),
      createAccount,
      password,
      confirmPassword,
    };

    const response = await fetch(`/api/events/${eventId}/public-register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json().catch(() => null)) as
      | { message?: string; details?: string }
      | null;

    if (!response.ok) {
      setSubmissionState({
        kind: "error",
        message: result?.message ?? "Kunne ikke fullføre registreringen.",
        details: result?.details,
      });
      return;
    }

    event.currentTarget.reset();
    setCreateAccount(true);
    setStudyLevel("");
    setStudyYear("");
    setPassword("");
    setConfirmPassword("");
    setSelectedJobTypes([]);
    setSelectedInterests([]);
    setCustomInterests("");
    setSelectedCompanies([]);
    setSubmissionState({
      kind: "success",
      message: result?.message ?? "Registreringen er mottatt.",
      details: result?.details,
    });
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <Card className="grid gap-3 border border-secondary/20 bg-[linear-gradient(135deg,#FFF7EE_0%,#FFFFFF_45%,#FFF0F1_100%)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/55">Studentbillett</p>
        <div className="grid gap-2 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <h2 className="text-2xl font-bold text-primary">Hent din gratis student billett her</h2>
            <p className="text-sm text-ink/75">
              Registrer deg én gang for {eventName}. Du får billett på e-post, og kan samtidig gjøre profilen klar for matching mot relevante bedrifter.
            </p>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-white/90 p-4 text-sm text-ink/75">
            <p className="font-semibold text-primary">Anbefalt flyt</p>
            <p className="mt-1">Velg kontoopprettelse for å slippe å fylle inn alt på nytt senere.</p>
          </div>
        </div>
      </Card>

      {submissionState.kind === "success" ? (
        <Card className="border border-success/30 bg-success/10 text-sm text-success">
          <p className="font-semibold">{submissionState.message}</p>
          {submissionState.details ? <p className="mt-1 text-success/90">{submissionState.details}</p> : null}
        </Card>
      ) : null}

      {submissionState.kind === "error" ? (
        <Card className="border border-error/30 bg-error/10 text-sm text-error">
          <p className="font-semibold">{submissionState.message}</p>
          {submissionState.details ? <p className="mt-1 text-error/90">{submissionState.details}</p> : null}
        </Card>
      ) : null}

      <Card className="grid gap-4">
        <div>
          <h3 className="text-lg font-bold text-primary">Kontaktinformasjon</h3>
          <p className="text-sm text-ink/70">Dette trenger vi for billetten og for å kunne følge opp registreringen din.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-primary">
            Fullt navn
            <Input name="fullName" required defaultValue={initialValues?.fullName ?? ""} placeholder="Fornavn Etternavn" />
          </label>
          <label className="text-sm font-semibold text-primary">
            E-post
            <Input name="email" type="email" required defaultValue={initialValues?.email ?? ""} placeholder="navn@student.no" />
          </label>
          <label className="text-sm font-semibold text-primary">
            Telefon
            <Input name="phone" type="tel" required defaultValue={initialValues?.phone ?? ""} placeholder="Telefonnummer" />
          </label>
          <label className="text-sm font-semibold text-primary">
            Studiested
            <Input name="school" required defaultValue={initialValues?.school ?? ""} placeholder="F.eks. UiO, BI eller NTNU" />
          </label>
        </div>
      </Card>

      <Card className="grid gap-4">
        <div>
          <h3 className="text-lg font-bold text-primary">Studieprofil</h3>
          <p className="text-sm text-ink/70">Samme type informasjon som i studentprofilen, men samlet i en enklere registreringsflyt.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-primary">
            Studieretning
            <Select name="studyProgram" required defaultValue={initialValues?.studyProgram ?? ""}>
              <option value="">Velg studieretning</option>
              {STUDY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-semibold text-primary">
            Studienivå
            <Select value={studyLevel} required onChange={(currentEvent) => handleStudyLevelChange(currentEvent.target.value)}>
              <option value="">Velg bachelor eller master</option>
              {STUDY_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-semibold text-primary">
            År
            <Select value={studyYear} required disabled={!studyLevel} onChange={(currentEvent) => setStudyYear(currentEvent.target.value)}>
              <option value="">{studyLevel ? "Velg år" : "Velg nivå først"}</option>
              {studyYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}. år
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-semibold text-primary">
            Teamstørrelse du trives i
            <Select name="teamSize" defaultValue={initialValues?.teamSize ?? ""}>
              <option value="">Ikke viktig</option>
              {TEAM_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold text-primary">Hva ser du etter?</legend>
          <div className="grid gap-2 md:grid-cols-2">
            {jobTypeOptions.map((option) => {
              const checked = selectedJobTypes.includes(option.value);
              return (
                <label
                  key={option.value}
                  className={`flex min-h-11 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    checked
                      ? "border-secondary bg-secondary/15 text-primary shadow-soft"
                      : "border-primary/10 bg-surface text-ink/80"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setSelectedJobTypes((prev) => toggleValue(prev, option.value))}
                    className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-semibold text-primary">Faglige interesser</legend>
          <div className="grid gap-2 md:grid-cols-2">
            {INTEREST_OPTIONS.map((option) => {
              const checked = selectedInterests.includes(option);
              return (
                <label
                  key={option}
                  className={`flex min-h-11 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    checked
                      ? "border-secondary bg-secondary/15 text-primary shadow-soft"
                      : "border-primary/10 bg-surface text-ink/80"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setSelectedInterests((prev) => toggleValue(prev, option))}
                    className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
          <label className="text-sm font-semibold text-primary">
            Andre interesser
            <Input
              name="customInterests"
              value={customInterests}
              onChange={(currentEvent) => setCustomInterests(currentEvent.target.value)}
              placeholder="F.eks. Dataanalyse, AI, energi"
            />
          </label>
        </fieldset>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-primary">
            Verdier
            <Input
              name="values"
              defaultValue={(initialValues?.values ?? []).join(", ")}
              placeholder="F.eks. Læring, bærekraft, innovasjon"
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            Foretrukne lokasjoner
            <Input
              name="preferredLocations"
              defaultValue={(initialValues?.preferredLocations ?? []).join(", ")}
              placeholder="F.eks. Oslo, Trondheim, Bergen"
            />
          </label>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <input
            name="willingToRelocate"
            type="checkbox"
            defaultChecked={Boolean(initialValues?.willingToRelocate)}
            className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
          />
          Jeg er villig til å flytte for riktig mulighet
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-primary md:col-span-2">
            Kort om deg
            <Textarea
              name="about"
              rows={4}
              maxLength={600}
              defaultValue={initialValues?.about ?? ""}
              placeholder="Hva er du god på, og hva håper du å finne på eventet?"
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            Foretrukket arbeidsstil
            <Input
              name="workStyle"
              defaultValue={initialValues?.workStyle ?? ""}
              placeholder="F.eks. Hybrid, teamorientert, selvstendig"
            />
          </label>
          <label className="text-sm font-semibold text-primary">
            LinkedIn, GitHub eller portfolio
            <Input
              name="socialProfile"
              type="url"
              defaultValue={initialValues?.socialProfile ?? ""}
              placeholder="https://..."
            />
          </label>
        </div>
      </Card>

      <Card className="grid gap-4">
        <div>
          <h3 className="text-lg font-bold text-primary">Bedrifter du vil bli matchet mot</h3>
          <p className="text-sm text-ink/70">Valgfritt, men dette gjør oppfølgingen mer relevant og øker kvaliteten på matchingen.</p>
        </div>
        {companies.length === 0 ? (
          <p className="text-sm text-ink/65">Ingen bedrifter er publisert på dette eventet ennå.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {companies.map((company) => {
              const checked = selectedCompanies.includes(company.id);
              return (
                <label
                  key={company.id}
                  className={`flex min-h-11 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                    checked
                      ? "border-secondary bg-secondary/15 text-primary shadow-soft"
                      : "border-primary/10 bg-surface text-ink/80"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setSelectedCompanies((prev) => toggleValue(prev, company.id))}
                    className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                  />
                  <span>{company.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="grid gap-4 border border-primary/10 bg-primary/5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-primary">Vil du opprette bruker hos Oslo Student Hub?</h3>
            <p className="text-sm text-ink/70">Anbefalt hvis du vil logge inn senere, oppdatere profilen din og bruke registreringen videre.</p>
          </div>
          <label className="inline-flex items-center gap-3 rounded-full bg-white px-4 py-3 text-sm font-semibold text-primary shadow-soft">
            <input
              type="checkbox"
              checked={createAccount}
              onChange={(currentEvent) => setCreateAccount(currentEvent.target.checked)}
              className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
            />
            Ja, opprett bruker
          </label>
        </div>

        {createAccount ? (
          <div className="grid gap-4 rounded-2xl border border-primary/10 bg-white/90 p-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-primary">
              Passord
              <Input
                type="password"
                value={password}
                onChange={(currentEvent) => setPassword(currentEvent.target.value)}
                placeholder="Velg et passord"
                required={createAccount}
              />
            </label>
            <label className="text-sm font-semibold text-primary">
              Gjenta passord
              <Input
                type="password"
                value={confirmPassword}
                onChange={(currentEvent) => setConfirmPassword(currentEvent.target.value)}
                placeholder="Skriv passordet på nytt"
                required={createAccount}
              />
            </label>
            <div className="md:col-span-2 grid gap-2 rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-ink/75">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary">Passordstyrke</span>
                <span>{passwordSummary.metCount}/4 krav oppfylt</span>
              </div>
              {passwordSummary.requirements.map((requirement) => (
                <p key={requirement.key} className={requirement.met ? "text-success" : "text-ink/65"}>
                  {requirement.met ? "Oppfylt" : "Mangler"}: {requirement.label}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink/70">Du får fortsatt billetten din på e-post, men kontoen opprettes ikke.</p>
        )}
      </Card>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-ink/65">Ved å sende inn godtar du at Oslo Student Hub lagrer registreringen din for billett, oppfølging og relevant matching.</p>
        <Button type="submit" className="min-w-[240px]" disabled={submissionState.kind === "loading"}>
          {submissionState.kind === "loading" ? "Registrerer..." : "Hent din gratis student billett her"}
        </Button>
      </div>
    </form>
  );
}
