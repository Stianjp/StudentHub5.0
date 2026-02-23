"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { getBaseUrlForRole, getDefaultNextPath } from "@/lib/auth-urls";
import Image from "next/image";

type Role = "student" | "company" | "admin";
type Mode = "login" | "register" | "reset";

export function SignInClient({
  allowedRole,
}: {
  allowedRole?: Role | null;
}) {
  const params = useSearchParams();
  const paramRole = params.get("role") as Role | null;
  const initialRole = allowedRole ?? (paramRole === "admin" ? "company" : paramRole ?? "company");
  const next = params.get("next");
  const reason = params.get("reason");
  const deleted = params.get("deleted") === "1";
  const defaultMode = (params.get("mode") as Mode | null) ?? "login";

  const [role, setRole] = useState<Role>(allowedRole ?? initialRole);
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgNumber, setOrgNumber] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const allowRegister = allowedRole !== "admin";
  const errorId = "auth-error";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ error }) => {
      const message = error?.message?.toLowerCase() ?? "";
      const code = (error as { code?: string })?.code;
      if (code === "refresh_token_not_found" || message.includes("refresh token")) {
        void supabase.auth.signOut();
      }
    });
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      const host = window.location.hostname.toLowerCase();
      let hostNext = next ?? getDefaultNextPath(role, host);
      if (host.startsWith("student.")) hostNext = "/student/dashboard";
      if (host.startsWith("bedrift.")) hostNext = "/";
      if (host.startsWith("checkin.")) hostNext = "/checkin";
      if (host.startsWith("admin.")) hostNext = "/admin";
      window.location.assign(hostNext);
    });
  }, [next, role]);


  const title = useMemo(() => {
    if (mode === "reset") {
      return "Gjenopprett passord";
    }
    if (mode === "register") {
      if (role === "student") return "Registrer student";
      if (role === "admin") return "Registrer admin";
      return "Registrer bedrift";
    }
    if (role === "student") return "Logg inn som student";
    if (role === "admin") return "Logg inn som admin";
    return "Logg inn som bedrift";
  }, [mode, role]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    const formData = new FormData(event.currentTarget);
    const emailValue = String(formData.get("email") ?? "").trim();
    const roleValue = (allowedRole ?? String(formData.get("role") ?? role)) as Role;

    if (!emailValue) {
      setStatus("error");
      setError("E-post er påkrevd.");
      return;
    }

    const supabase = createClient();
    const nextPath =
      typeof next === "string" ? next : getDefaultNextPath(roleValue, window.location.hostname);
    const baseUrl = getBaseUrlForRole(roleValue, window.location.origin);
    const redirectBase = baseUrl || window.location.origin;

    if (mode === "reset") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(emailValue, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      if (resetError) {
        setStatus("error");
        setError("Kunne ikke sende e-post. Sjekk adressen og prøv igjen.");
        return;
      }
      setStatus("sent");
      setError("Vi har sendt en lenke for å sette nytt passord.");
      return;
    }

    if (password.length < 8) {
      setStatus("error");
      setError("Passord må være minst 8 tegn.");
      return;
    }

    if (mode === "register") {
      if (roleValue === "admin") {
        setStatus("error");
        setError("Admin-tilgang settes manuelt av OSH.");
        return;
      }

      if (roleValue === "company") {
        const normalizedOrg = orgNumber.replace(/\s+/g, "");
        if (!/^\d{9}$/.test(normalizedOrg)) {
          setStatus("error");
          setError("Organisasjonsnummer må være 9 siffer.");
          return;
        }
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: emailValue,
        password,
        options: {
          emailRedirectTo: `${redirectBase}/auth/callback?role=${roleValue}&mode=verify`,
        },
      });

      if (signUpError) {
        setStatus("error");
        const message = signUpError.message.toLowerCase();
        if (message.includes("row level security") || message.includes("policy")) {
          setError("Registrering mottatt. Bekreft e-posten din før du kan logge inn. Sjekk søppelpost.");
        } else {
          setError("Kunne ikke opprette konto. Sjekk e-post og prøv igjen.");
        }
        return;
      }

      if (roleValue === "company" && data.user?.id) {
        const requestResponse = await fetch("/api/company/request-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.user.id,
            email: emailValue,
            orgNumber: orgNumber.replace(/\s+/g, ""),
          }),
        });

        if (!requestResponse.ok) {
          const payload = await requestResponse.json().catch(() => null);
          setStatus("error");
          setError(payload?.error ?? "Kunne ikke sende forespørsel. Kontakt OSH-admin.");
          return;
        }
      }

      setStatus("sent");
      setError("Registrering OK. Bekreft e-posten din før du kan logge inn. Sjekk søppelpost.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password,
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

    if (allowedRole) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .maybeSingle();
      if (profile?.role && profile.role !== allowedRole && !(profile.role === "admin" && allowedRole === "company")) {
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
      hostNext = "/";
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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <Card className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Image src="/brand/logo.svg" alt="Oslo Student Hub" width={40} height={40} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Oslo Student Hub</p>
          <h1 className="mt-2 text-2xl font-bold text-primary">{title}</h1>
          <p className="mt-1 text-sm text-ink/80">
            {mode === "reset"
              ? "Få tilsendt lenke for å sette nytt passord."
              : mode === "register"
              ? "Opprett konto med e-post og passord."
              : "Logg inn med e-post og passord."}
          </p>
          {deleted ? (
            <p className="mt-1 text-xs font-semibold text-success">
              Profilen din er slettet.
            </p>
          ) : null}
        </div>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className={`grid gap-2 ${allowRegister ? "grid-cols-2" : "grid-cols-1"}`}>
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                mode === "login" ? "bg-primary text-surface" : "bg-primary/10 text-primary"
              }`}
            >
              Logg inn
            </button>
            {allowRegister ? (
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  mode === "register" ? "bg-primary text-surface" : "bg-primary/10 text-primary"
                }`}
              >
                Registrer deg
              </button>
            ) : null}
          </div>
          {allowedRole ? null : (
            <label className="flex flex-col gap-2 text-sm font-semibold text-primary">
              Rolle
              <Select name="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="company">Bedrift</option>
                <option value="student">Student</option>
              </Select>
            </label>
          )}
          <label className="flex flex-col gap-2 text-sm font-semibold text-primary">
            E-post
            <Input
              name="email"
              required
              type="email"
              placeholder="navn@bedrift.no"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={status === "error"}
              aria-describedby={status === "error" ? errorId : undefined}
            />
          </label>
          {mode !== "reset" ? (
            <label className="flex flex-col gap-2 text-sm font-semibold text-primary">
              Passord
              <Input
                name="password"
                required
                type="password"
                placeholder="Minst 8 tegn"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={status === "error"}
                aria-describedby={status === "error" ? errorId : undefined}
              />
            </label>
          ) : null}
          {mode === "register" && role === "company" ? (
            <label className="flex flex-col gap-2 text-sm font-semibold text-primary">
              Organisasjonsnummer
              <Input
                name="orgNumber"
                required
                inputMode="numeric"
                pattern="[0-9]{9}"
                placeholder="9 siffer"
                value={orgNumber}
                onChange={(e) => setOrgNumber(e.target.value)}
                aria-invalid={status === "error"}
                aria-describedby={status === "error" ? errorId : undefined}
              />
            </label>
          ) : null}
          <div className="flex flex-col gap-2">
            <Button disabled={status === "loading" || email.length < 3} type="submit">
              {status === "loading"
                ? "Jobber…"
                : mode === "register"
                  ? "Registrer"
                  : mode === "reset"
                    ? "Send lenke"
                    : "Logg inn"}
            </Button>
            {mode === "register" ? (
              <p className="text-xs text-ink/70">
                Du får en bekreftelses-epost. Sjekk også søppelpost om du ikke ser den.
              </p>
            ) : null}
            {mode === "login" ? (
              <button
                type="button"
                className="text-xs font-semibold text-primary/70 hover:text-primary"
                onClick={() => setMode("reset")}
              >
                Glemt passord?
              </button>
            ) : null}
            {mode === "reset" ? (
              <button
                type="button"
                className="text-xs font-semibold text-primary/70 hover:text-primary"
                onClick={() => setMode("login")}
              >
                Tilbake til innlogging
              </button>
            ) : null}
          </div>
        </form>
        {status === "sent" ? (
          <div className="rounded-xl bg-success/15 px-4 py-3 text-sm font-medium text-success" aria-live="polite">
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
      </Card>
    </main>
  );
}
