"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { clearBrowserAuthState, createClient } from "@/lib/supabase/client";
import { getDefaultNextPath } from "@/lib/auth-urls";
import { roleFromHost } from "@/lib/host";
import {
  getStudentJobTypeOptions,
  getPasswordStrengthSummary,
  getStudyYearOptions,
  isOshAdminEmail,
  STUDY_LEVEL_OPTIONS,
  type StudyLevel,
  validatePasswordStrength,
} from "@/lib/auth-registration";
import { STUDY_CATEGORIES } from "@/components/event/study-categories";

type Role = "student" | "company" | "admin";
type Mode = "login" | "register" | "reset";

function getRoleTitle(mode: Mode, role: Role) {
  if (mode === "reset") return "Gjenopprett passord";
  if (mode === "register") {
    return role === "student" ? "Registrer student" : "Registrer bedrift";
  }
  if (role === "student") return "Logg inn som student";
  if (role === "admin") return "Logg inn som admin";
  return "Logg inn som bedrift";
}

function getRoleDescription(mode: Mode, role: Role) {
  if (mode === "reset") {
    return "Få tilsendt lenke for å sette nytt passord.";
  }
  if (mode === "register") {
    if (role === "student") {
      return "Opprett studentkonto med studiested, studieretning og jobbpreferanser.";
    }
    return "Opprett bedriftskonto. Tilgang til portalen godkjennes manuelt av OSH.";
  }
  if (role === "admin") {
    return "Kun @oslostudenthub.no-brukere kan logge inn her.";
  }
  return "Logg inn med e-post og passord.";
}

export function SignInClient({
  allowedRole,
}: {
  allowedRole?: Role | null;
}) {
  const params = useSearchParams();
  const paramRole = params.get("role") as Role | null;
  const detectedRole = useMemo(
    () => (typeof window === "undefined" ? null : roleFromHost(window.location.host)),
    [],
  );
  const effectiveAllowedRole = allowedRole ?? detectedRole;
  const initialRole =
    effectiveAllowedRole ?? (paramRole === "student" || paramRole === "company" ? paramRole : "company");
  const defaultMode = (params.get("mode") as Mode | null) ?? "login";
  const next = params.get("next");
  const reason = params.get("reason");
  const deleted = params.get("deleted") === "1";
  const allowRegister = effectiveAllowedRole !== "admin";
  const allowPasswordReset = effectiveAllowedRole !== "admin";
  const initialMode =
    effectiveAllowedRole === "admin" && (defaultMode === "register" || defaultMode === "reset")
      ? "login"
      : defaultMode;

  const [role, setRole] = useState<Role>(initialRole);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [studentStudyLevel, setStudentStudyLevel] = useState<StudyLevel | "">("");
  const [studentStudyYear, setStudentStudyYear] = useState("");
  const [isSessionResetting] = useState(false);
  const errorId = "auth-error";
  const passwordHelpId = "password-help";

  useEffect(() => {
    clearBrowserAuthState();
  }, []);

  useEffect(() => {
    if (mode !== "register" || status !== "sent") return;

    const timeout = window.setTimeout(() => {
      setMode("login");
      setStatus("sent");
      setError("Registrering OK. Bekreft e-posten din før du logger inn.");
      setPasswordInput("");
      setConfirmPasswordInput("");
      setStudentStudyLevel("");
      setStudentStudyYear("");
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [mode, status]);

  const selectedRole = effectiveAllowedRole ?? role;
  const title = getRoleTitle(mode, selectedRole);
  const description = getRoleDescription(mode, selectedRole);
  const studentStudyYearOptions = useMemo(
    () => getStudyYearOptions(studentStudyLevel),
    [studentStudyLevel],
  );
  const studentJobTypeOptions = useMemo(
    () => getStudentJobTypeOptions(studentStudyLevel),
    [studentStudyLevel],
  );
  const passwordSummary = useMemo(
    () => getPasswordStrengthSummary(passwordInput, confirmPasswordInput),
    [passwordInput, confirmPasswordInput],
  );

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setStatus("idle");
    setError(null);
    setPasswordInput("");
    setConfirmPasswordInput("");
    setStudentStudyLevel("");
    setStudentStudyYear("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSessionResetting) return;
    setStatus("loading");
    setError(null);

    const formData = new FormData(event.currentTarget);
    const roleValue = (effectiveAllowedRole ?? String(formData.get("role") ?? role)) as Role;
    const emailValue = String(formData.get("email") ?? "").trim();
    const passwordValue = mode === "register" ? passwordInput : String(formData.get("password") ?? "");
    const confirmPasswordValue =
      mode === "register" ? confirmPasswordInput : String(formData.get("confirmPassword") ?? "");

    if (!emailValue) {
      setStatus("error");
      setError("E-post er påkrevd.");
      return;
    }

    const supabase = createClient();
    clearBrowserAuthState();
    await supabase.auth.signOut({ scope: "local" });
    const nextPath =
      typeof next === "string" ? next : getDefaultNextPath(roleValue, window.location.hostname);

    if (mode === "reset") {
      const response = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailValue,
          role: roleValue,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setStatus("error");
        setError(payload?.error ?? "Kunne ikke sende e-post. Sjekk adressen og prøv igjen.");
        return;
      }
      setStatus("sent");
      setError("Vi har sendt en lenke for å sette nytt passord.");
      return;
    }

    if (mode === "register") {
      if (roleValue === "admin") {
        setStatus("error");
        setError("Admin-tilgang settes manuelt av OSH.");
        return;
      }

      const passwordError = validatePasswordStrength(passwordValue, confirmPasswordValue);
      if (passwordError) {
        setStatus("error");
        setError(passwordError);
        return;
      }

      if (roleValue === "student") {
        const response = await fetch("/api/auth/register/student", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailValue,
            fullName: String(formData.get("fullName") ?? ""),
            school: String(formData.get("school") ?? ""),
            studyProgram: String(formData.get("studyProgram") ?? ""),
            studyLevel: String(formData.get("studyLevel") ?? ""),
            studyYear: Number(formData.get("studyYear") ?? 0),
            jobTypes: formData.getAll("jobTypes").map((value) => String(value)),
            password: passwordValue,
            confirmPassword: confirmPasswordValue,
          }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setStatus("error");
          setError(payload?.error ?? "Kunne ikke opprette studentkonto.");
          return;
        }

        setStatus("sent");
        setError("Registrering OK. Bekreft e-posten din før du kan logge inn. Du sendes til innlogging om 5 sekunder.");
        return;
      }

      const requestBody = new FormData();
      for (const [key, value] of formData.entries()) {
        requestBody.append(key, value);
      }

      const response = await fetch("/api/auth/register/company", {
        method: "POST",
        body: requestBody,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setStatus("error");
        setError(payload?.error ?? "Kunne ikke opprette bedriftskonto.");
        return;
      }

      setStatus("sent");
      setError(
        "Registrering OK. Bekreft e-posten din. Når e-posten er verifisert, havner tilgangen i admin sin godkjenningsliste. Du sendes til innlogging om 5 sekunder.",
      );
      return;
    }

    if (roleValue === "admin" && !isOshAdminEmail(emailValue)) {
      setStatus("error");
      setError("Admin-innlogging krever en @oslostudenthub.no-adresse.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password: passwordValue,
    });

    if (signInError) {
      setStatus("error");
      const lower = signInError.message.toLowerCase();
      const rateLimited =
        signInError.status === 429 ||
        (signInError as { code?: string })?.code === "over_email_send_rate_limit" ||
        lower.includes("rate limit");
      const message = rateLimited
        ? "For mange forsøk på kort tid. Vent litt og prøv igjen."
        : lower.includes("confirm") || lower.includes("verified")
          ? "Bekreft e-posten din før du kan logge inn."
          : "Feil e-post eller passord. Prøv igjen.";
      setError(message);
      return;
    }

    if (effectiveAllowedRole) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id" as never, (user?.id ?? "") as never)
        .maybeSingle();
      const typedProfile = profile as { role?: string } | null;

      if (
        typedProfile?.role &&
        typedProfile.role !== effectiveAllowedRole &&
        !(typedProfile.role === "admin" && effectiveAllowedRole === "company")
      ) {
        await supabase.auth.signOut();
        setStatus("error");
        setError("Denne kontoen har ikke tilgang til dette domenet.");
        return;
      }
    }

    const host = window.location.hostname.toLowerCase();
    let hostNext = nextPath;
    if (host.startsWith("student.")) {
      hostNext = "/student/dashboard";
    } else if (host.startsWith("bedrift.")) {
      hostNext = "/company";
    } else if (host.startsWith("checkin.")) {
      hostNext = "/checkin";
    } else if (host.startsWith("admin.")) {
      hostNext = "/admin";
    }

    if (/^https?:\/\//i.test(hostNext)) {
      window.location.assign(hostNext);
      return;
    }

    window.location.assign(hostNext);
  }

  return (
    <main className="min-h-screen w-full bg-[linear-gradient(180deg,#140249_0%,#6D367F_52%,#FF7282_100%)] px-6 py-16">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-2xl flex-col justify-center">
        <Card
          className="flex flex-col gap-6 border border-white/75 !bg-[#140249] text-surface shadow-none ring-0"
          style={{ backgroundColor: "#140249" }}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <Image
              src="/brand/Logo_OSH_Gradient_whitetext.svg"
              alt="Oslo Student Hub"
              width={252}
              height={60}
              className="h-auto w-[220px] object-contain"
              priority
            />
            <h1 className="mt-2 text-2xl font-bold text-surface">{title}</h1>
            <p className="mt-1 max-w-xl text-sm text-surface/85">{description}</p>
            {deleted ? (
              <p className="mt-1 text-xs font-semibold text-success">Profilen din er slettet.</p>
            ) : null}
          </div>

          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            {allowRegister ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    mode === "login" ? "bg-secondary text-primary" : "bg-surface/10 text-surface"
                  }`}
                >
                  Logg inn
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    mode === "register" ? "bg-secondary text-primary" : "bg-surface/10 text-surface"
                  }`}
                >
                  Registrer deg
                </button>
              </div>
            ) : null}

            {effectiveAllowedRole ? null : (
              <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
                Rolle
                <Select name="role" value={role} onChange={(currentEvent) => setRole(currentEvent.target.value as Role)}>
                  <option value="company">Bedrift</option>
                  <option value="student">Student</option>
                </Select>
              </label>
            )}

            <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
              E-post
              <Input
                name="email"
                required
                type="email"
                placeholder={selectedRole === "student" ? "navn@student.no" : "navn@bedrift.no"}
                aria-invalid={status === "error"}
                aria-describedby={status === "error" ? errorId : undefined}
              />
            </label>

            {mode === "login" ? (
              <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
                Passord
                <Input
                  name="password"
                  required
                  type="password"
                  placeholder="Minst 8 tegn"
                  value={passwordInput}
                  onChange={(currentEvent) => setPasswordInput(currentEvent.target.value)}
                  aria-invalid={status === "error"}
                  aria-describedby={status === "error" ? errorId : undefined}
                />
              </label>
            ) : null}

            {mode === "register" && selectedRole === "student" ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
                    Fullt navn
                    <Input name="fullName" required placeholder="Fornavn Etternavn" />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
                    Studiested
                    <Input name="school" required placeholder="F.eks. NTNU" />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
                    Studieretning
                    <Select name="studyProgram" required defaultValue="">
                      <option value="">Velg studieretning</option>
                      {STUDY_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
                    Studenttype
                    <Select
                      name="studyLevel"
                      required
                      value={studentStudyLevel}
                      onChange={(currentEvent) => {
                        const nextStudyLevel = currentEvent.target.value as StudyLevel | "";
                        setStudentStudyLevel(nextStudyLevel);
                        if (!getStudyYearOptions(nextStudyLevel).includes(Number(studentStudyYear))) {
                          setStudentStudyYear("");
                        }
                      }}
                    >
                      <option value="">Velg bachelor eller master</option>
                      {STUDY_LEVEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
                    År
                    <Select
                      name="studyYear"
                      required
                      value={studentStudyYear}
                      onChange={(currentEvent) => setStudentStudyYear(currentEvent.target.value)}
                      disabled={studentStudyYearOptions.length === 0}
                    >
                      <option value="">
                        {studentStudyLevel ? "Velg år" : "Velg studenttype først"}
                      </option>
                      {studentStudyYearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}. år
                        </option>
                      ))}
                    </Select>
                  </label>
                  <div className="rounded-2xl border border-white/15 bg-surface/5 px-4 py-4 text-sm text-surface/78">
                    <p className="font-semibold text-surface">Matching mot bedrift</p>
                    <p className="mt-2">
                      Studieretning bruker de samme kategoriene som bedriftene velger som bransje og
                      rekrutteringsfelt.
                    </p>
                  </div>
                </div>

                <fieldset className="grid gap-3 rounded-2xl border border-white/15 bg-surface/5 p-4">
                  <legend className="px-1 text-sm font-semibold text-surface">Jeg er interessert i</legend>
                  <div className="grid gap-2 md:grid-cols-2">
                    {studentJobTypeOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex min-h-11 items-center gap-3 rounded-2xl border border-white/15 bg-surface/10 px-4 py-3 text-sm font-medium text-surface"
                      >
                        <input
                          type="checkbox"
                          name="jobTypes"
                          value={option.value}
                          className="h-4 w-4 rounded border-white/40 text-secondary focus:ring-secondary"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-surface/70">
                    Du kan velge flere alternativer eller la alle stå tomme. Oppgavevalg tilpasses om du er bachelor- eller masterstudent.
                  </p>
                </fieldset>

              </>
            ) : null}

            {mode === "register" && selectedRole === "company" ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
                    Firmanavn
                    <Input name="companyName" required placeholder="F.eks. Equinor" />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
                    Organisasjonsnummer
                    <Input
                      name="orgNumber"
                      required
                      inputMode="numeric"
                      pattern="[0-9]{9}"
                      placeholder="9 siffer"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
                  Adresse
                  <Input name="address" required placeholder="Gateadresse" />
                </label>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
                    Postnummer
                    <Input name="postalCode" required placeholder="0000" />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
                    By
                    <Input name="city" required placeholder="Oslo" />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
                    Land
                    <Input name="country" required placeholder="Norge" />
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
                  Logo
                  <input
                    name="logo"
                    type="file"
                    accept="image/*"
                    className="min-h-11 w-full rounded-2xl border border-white/20 bg-surface px-4 py-3 text-sm font-medium text-ink file:mr-4 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-xs file:font-bold file:text-primary"
                  />
                </label>

                <fieldset className="grid gap-3 rounded-2xl border border-white/15 bg-surface/5 p-4">
                  <legend className="px-1 text-sm font-semibold text-surface">
                    Hvilke studieretninger er dere ute etter?
                  </legend>
                  <div className="grid gap-2 md:grid-cols-2">
                    {STUDY_CATEGORIES.map((category) => (
                      <label
                        key={category}
                        className="flex min-h-11 items-center gap-3 rounded-2xl border border-white/15 bg-surface/10 px-4 py-3 text-sm font-medium text-surface"
                      >
                        <input
                          type="checkbox"
                          name="recruitmentFields"
                          value={category}
                          className="h-4 w-4 rounded border-white/40 text-secondary focus:ring-secondary"
                        />
                        <span>{category}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

              </>
            ) : null}

            {mode === "register" ? (
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
                    Passord
                    <Input
                      name="password"
                      required
                      type="password"
                      placeholder="Velg et passord"
                      value={passwordInput}
                      onChange={(currentEvent) => setPasswordInput(currentEvent.target.value)}
                      aria-invalid={status === "error"}
                      aria-describedby={`${passwordHelpId}${status === "error" ? ` ${errorId}` : ""}`}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
                    Gjenta passord
                    <Input
                      name="confirmPassword"
                      required
                      type="password"
                      placeholder="Skriv passordet på nytt"
                      value={confirmPasswordInput}
                      onChange={(currentEvent) => setConfirmPasswordInput(currentEvent.target.value)}
                      aria-invalid={status === "error"}
                      aria-describedby={`${passwordHelpId}${status === "error" ? ` ${errorId}` : ""}`}
                    />
                  </label>
                </div>

                <div
                  id={passwordHelpId}
                  className="rounded-2xl border border-white/15 bg-surface/5 px-4 py-4"
                  aria-live="polite"
                >
                  <p className="text-sm font-medium text-surface/90">
                    Bruk minst 8 tegn med både bokstaver, tall og spesialtegn.
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden="true">
                    {[1, 2, 3].map((segment) => (
                      <span
                        key={segment}
                        className={`h-2 rounded-full ${
                          passwordSummary.filledSegments >= segment ? "bg-[#18c4a4]" : "bg-white/15"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-semibold text-surface/82">
                    <span>{passwordSummary.metCount}/4 passordkrav oppfylt</span>
                    <span>{passwordSummary.label === "Ingen" ? "Start å skrive" : passwordSummary.label}</span>
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {passwordSummary.requirements.map((requirement) => (
                      <div
                        key={requirement.key}
                        className={`flex min-h-11 items-center gap-3 rounded-2xl border px-3 py-2 text-sm ${
                          requirement.met
                            ? "border-[#18c4a4]/60 bg-[#18c4a4]/15 text-surface"
                            : "border-white/15 bg-surface/10 text-surface/78"
                        }`}
                      >
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                            requirement.met ? "bg-[#18c4a4] text-[#140249]" : "bg-white/12 text-surface/82"
                          }`}
                          aria-hidden="true"
                        >
                          {requirement.met ? "✓" : "•"}
                        </span>
                        <span>{requirement.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <Button disabled={status === "loading" || isSessionResetting} type="submit">
                {isSessionResetting
                  ? "Klargjør innlogging…"
                  : status === "loading"
                  ? "Jobber…"
                  : mode === "register"
                    ? "Registrer"
                    : mode === "reset"
                      ? "Send lenke"
                      : "Logg inn"}
              </Button>

              {mode === "register" ? (
                <p className="text-xs text-surface/75">
                  Du får en bekreftelses-e-post. Sjekk også søppelpost hvis du ikke ser den med en gang.
                </p>
              ) : null}

              {mode === "login" && allowPasswordReset ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-surface/75 hover:text-surface"
                  onClick={() => switchMode("reset")}
                >
                  Glemt passord?
                </button>
              ) : null}

              {mode === "reset" ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-surface/75 hover:text-surface"
                  onClick={() => switchMode("login")}
                >
                  Tilbake til innlogging
                </button>
              ) : null}
            </div>
          </form>

          {status === "sent" ? (
            <div
              className="rounded-xl bg-success/15 px-4 py-3 text-sm font-medium text-success"
              aria-live="polite"
            >
              {error ?? "Ferdig."}
            </div>
          ) : null}

          {status === "error" ? (
            <div
              id={errorId}
              className="rounded-xl bg-error/15 px-4 py-3 text-sm font-medium text-error"
              aria-live="assertive"
            >
              {error}
            </div>
          ) : null}

          {reason === "admin-required" ? (
            <div className="rounded-xl bg-warning/15 px-4 py-3 text-xs font-semibold text-warning">
              Admin-tilgang må settes manuelt i Supabase (
              <code className="rounded bg-warning/20 px-1 py-0.5 text-warning">profiles.role=&apos;admin&apos;</code>).
            </div>
          ) : null}

          {reason === "admin-domain" ? (
            <div className="rounded-xl bg-warning/15 px-4 py-3 text-xs font-semibold text-warning">
              Admin-domenet tillater bare innlogging med @oslostudenthub.no.
            </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
