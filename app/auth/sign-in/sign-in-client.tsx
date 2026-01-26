"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

type Role = "student" | "company" | "admin";
type Mode = "login" | "register";

export function SignInClient() {
  const router = useRouter();
  const params = useSearchParams();
  const initialRole = (params.get("role") as Role | null) ?? "company";
  const next = params.get("next");
  const reason = params.get("reason");

  const [role, setRole] = useState<Role>(initialRole);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => {
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
    const roleValue = String(formData.get("role") ?? role);

    if (!emailValue) {
      setStatus("error");
      setError("E-post er påkrevd.");
      return;
    }

    if (password.length < 8) {
      setStatus("error");
      setError("Passord må være minst 8 tegn.");
      return;
    }

    const supabase = createClient();
    const nextPath = typeof next === "string" ? next : `/${roleValue}`;

    if (mode === "register") {
      if (roleValue === "admin") {
        setStatus("error");
        setError("Admin-tilgang settes manuelt av OSH.");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: emailValue,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?role=${roleValue}&next=${encodeURIComponent(
            nextPath,
          )}`,
        },
      });

      if (signUpError) {
        setStatus("error");
        setError(signUpError.message);
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          role: roleValue as Role,
        });
        if (profileError) {
          setStatus("error");
          setError(profileError.message);
          return;
        }
      }

      setStatus("sent");
      setError("Registrering OK. Sjekk e-post for bekreftelse eller logg inn.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password,
    });

    if (signInError) {
      setStatus("error");
      setError(signInError.message);
      return;
    }

    router.replace(nextPath);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <Card className="flex flex-col gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">OSH StudentHub</p>
          <h1 className="mt-2 text-2xl font-bold text-primary">{title}</h1>
          <p className="mt-1 text-sm text-ink/80">
            {mode === "register"
              ? "Opprett konto med e-post og passord."
              : "Logg inn med e-post og passord."}
          </p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                mode === "login" ? "bg-primary text-surface" : "bg-primary/10 text-primary"
              }`}
            >
              Logg inn
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                mode === "register" ? "bg-primary text-surface" : "bg-primary/10 text-primary"
              }`}
            >
              Registrer deg
            </button>
          </div>
          <label className="flex flex-col gap-2 text-sm font-semibold text-primary">
            Rolle
            <Select name="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="company">Bedrift</option>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </Select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-primary">
            E-post
            <Input
              name="email"
              required
              type="email"
              placeholder="navn@bedrift.no"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-primary">
            Passord
            <Input
              name="password"
              required
              type="password"
              placeholder="Minst 8 tegn"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <Button disabled={status === "loading" || email.length < 3} type="submit">
            {status === "loading"
              ? "Jobber…"
              : mode === "register"
                ? "Registrer"
                : "Logg inn"}
          </Button>
        </form>
        {status === "sent" ? (
          <div className="rounded-xl bg-success/15 px-4 py-3 text-sm font-medium text-success">
            {error ?? "Ferdig."}
          </div>
        ) : null}
        {status === "error" ? (
          <div className="rounded-xl bg-error/15 px-4 py-3 text-sm font-medium text-error">
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
