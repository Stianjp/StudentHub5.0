"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validatePasswordStrength } from "@/lib/auth-registration";
import { createClient } from "@/lib/supabase/client";

export function ResetClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const errorCode = searchParams.get("error_code");
  const tokenHash = searchParams.get("token_hash");
  const recoveryType = searchParams.get("type");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [verifyingRecovery, setVerifyingRecovery] = useState(false);
  const roleParam = searchParams.get("role");
  const signInUrl =
    roleParam === "student" || roleParam === "company"
      ? `/auth/sign-in?role=${roleParam}`
      : "/auth/sign-in";
  const requestNewResetUrl = `${signInUrl}${signInUrl.includes("?") ? "&" : "?"}mode=reset`;
  const expiredLink = errorCode === "otp_expired";
  const expiredLinkMessage = "Passordlenken er utløpt eller allerede brukt. Be om en ny lenke.";
  const hasTokenHashRecovery = Boolean(tokenHash && recoveryType === "recovery");

  function formatPasswordUpdateError(message: string) {
    const normalized = message.trim();
    if (!normalized) {
      return "Kunne ikke oppdatere passord. Prøv å åpne lenken på nytt.";
    }
    if (/same password/i.test(normalized)) {
      return "Nytt passord må være forskjellig fra det gamle.";
    }
    return normalized;
  }

  useEffect(() => {
    if (expiredLink) {
      return;
    }

    if (hasTokenHashRecovery) {
      return;
    }

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
  }, [code, expiredLink, hasTokenHashRecovery]);

  async function activateRecoverySession() {
    if (!tokenHash || recoveryType !== "recovery") return;

    setVerifyingRecovery(true);
    setStatus("loading");
    setError(null);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });

    if (verifyError) {
      setStatus("error");
      setError("Passordlenken er ugyldig, utløpt eller allerede brukt. Be om en ny lenke.");
      setVerifyingRecovery(false);
      return;
    }

    setSessionReady(true);
    setStatus("idle");
    setVerifyingRecovery(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (expiredLink) {
      setStatus("error");
      setError(expiredLinkMessage);
      return;
    }
    if (!sessionReady) {
      setStatus("error");
      setError("Reset-lenken er ikke klar ennå. Prøv igjen om et øyeblikk.");
      return;
    }
    setStatus("loading");
    setError(null);

    const passwordError = validatePasswordStrength(password, confirm);
    if (passwordError) {
      setStatus("error");
      setError(passwordError);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setStatus("error");
      setError(formatPasswordUpdateError(updateError.message));
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

          {hasTokenHashRecovery && !sessionReady && !expiredLink ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-surface/85">
              <p>Denne lenken må bekreftes før du kan sette nytt passord.</p>
              <Button
                type="button"
                className="mt-4"
                onClick={() => void activateRecoverySession()}
                disabled={verifyingRecovery}
              >
                {verifyingRecovery ? "Klargjør lenke…" : "Fortsett til passordbytte"}
              </Button>
            </div>
          ) : null}

          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
              Nytt passord
              <Input name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-surface">
              Bekreft passord
              <Input name="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
            <Button
              type="submit"
              disabled={status === "loading" || !sessionReady || expiredLink || (hasTokenHashRecovery && !sessionReady)}
            >
              {status === "loading" ? "Oppdaterer…" : "Oppdater passord"}
            </Button>
          </form>

          {expiredLink ? (
            <div className="rounded-xl bg-error/15 px-4 py-3 text-sm font-medium text-error" aria-live="assertive">
              <p>{expiredLinkMessage}</p>
              <a
                href={requestNewResetUrl}
                className="mt-3 inline-flex items-center justify-center rounded-full border border-error/40 px-4 py-2 text-xs font-semibold text-error hover:bg-error/10"
              >
                Be om ny passordlenke
              </a>
            </div>
          ) : null}
          {status === "error" && error && !expiredLink ? (
            <div className="rounded-xl bg-error/15 px-4 py-3 text-sm font-medium text-error" aria-live="assertive">
              <p>{error}</p>
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
