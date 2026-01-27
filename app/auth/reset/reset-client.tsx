"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function ResetClient() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    if (password.length < 8) {
      setStatus("error");
      setError("Passord må være minst 8 tegn.");
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setError("Passordene matcher ikke.");
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setStatus("error");
      setError("Kunne ikke oppdatere passord. Prøv å åpne lenken på nytt.");
      return;
    }

    setStatus("success");
    setError("Passord oppdatert. Logg inn på nytt.");
    router.push("/auth/sign-in");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <Card className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Image src="/brand/logo.svg" alt="Oslo Student Hub" width={40} height={40} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Oslo Student Hub</p>
          <h1 className="text-2xl font-bold text-primary">Sett nytt passord</h1>
          <p className="text-sm text-ink/80">Velg et sterkt passord (minst 8 tegn).</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-2 text-sm font-semibold text-primary">
            Nytt passord
            <Input
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-primary">
            Bekreft passord
            <Input
              name="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Oppdaterer…" : "Oppdater passord"}
          </Button>
        </form>

        {status === "error" && error ? (
          <div className="rounded-xl bg-error/15 px-4 py-3 text-sm font-medium text-error" aria-live="assertive">
            {error}
          </div>
        ) : null}
        {status === "success" && error ? (
          <div className="rounded-xl bg-success/15 px-4 py-3 text-sm font-medium text-success" aria-live="polite">
            {error}
          </div>
        ) : null}
      </Card>
    </main>
  );
}
