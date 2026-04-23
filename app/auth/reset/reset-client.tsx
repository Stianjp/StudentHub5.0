"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function ResetClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const roleParam = searchParams.get("role");
  const signInUrl =
    roleParam === "student" || roleParam === "company"
      ? `/auth/sign-in?role=${roleParam}`
      : "/auth/sign-in";

  useEffect(() => {
    const supabase = createClient();

    async function prepareRecoverySession() {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setStatus("error");
          setError("Reset-lenken er ugyldig eller utløpt. Be om en ny lenke.");
          return;
        }
        setSessionReady(true);
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setStatus("error");
          setError("Reset-lenken er ugyldig eller utløpt. Be om en ny lenke.");
          return;
        }
        setSessionReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSessionReady(true);
        return;
      }

      setStatus("error");
      setError("Mangler gyldig reset-lenke. Be om en ny lenke.");
    }

    void prepareRecoverySession();
  }, [code]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionReady) {
      setStatus("error");
      setError("Reset-lenken er ikke klar ennå. Prøv igjen om et øyeblikk.");
      return;
    }
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
    router.push(signInUrl);
  }

  return (
    <main className="min-h-screen w-full bg-[linear-gradient(180deg,#140249_0%,#6D367F_52%,#FF7282_100%)] px-6 py-16">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col justify-center">
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
            <h1 className="text-2xl font-bold text-surface">Sett nytt passord</h1>
            <p className="text-sm text-surface/85">Velg et sterkt passord (minst 8 tegn).</p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
              Nytt passord
              <Input name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
              Bekreft passord
              <Input name="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
            <Button type="submit" disabled={status === "loading" || !sessionReady}>
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
      </div>
    </main>
  );
}
