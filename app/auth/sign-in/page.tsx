"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Role = "student" | "company" | "admin";

export default function SignInPage() {
  const params = useSearchParams();
  const initialRole = (params.get("role") as Role | null) ?? "company";
  const next = params.get("next");
  const reason = params.get("reason");

  const [role, setRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => {
    if (role === "student") return "Logg inn som student";
    if (role === "admin") return "Logg inn som admin";
    return "Logg inn som bedrift";
  }, [role]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    const response = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, next }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setError(payload?.error ?? "Kunne ikke sende magic link");
      return;
    }

    setStatus("sent");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <Card className="flex flex-col gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">OSH StudentHub</p>
          <h1 className="mt-2 text-2xl font-bold text-primary">{title}</h1>
          <p className="mt-1 text-sm text-ink/80">Vi sender deg en magic link for å logge inn.</p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-2 text-sm font-semibold text-primary">
            Rolle
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="company">Bedrift</option>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </Select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-primary">
            E-post
            <Input
              required
              type="email"
              placeholder="navn@bedrift.no"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <Button disabled={status === "loading" || email.length < 3} type="submit">
            {status === "loading" ? "Sender…" : "Send magic link"}
          </Button>
        </form>
        {status === "sent" ? (
          <div className="rounded-xl bg-success/15 px-4 py-3 text-sm font-medium text-success">
            Magic link er sendt. Sjekk innboksen din.
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
