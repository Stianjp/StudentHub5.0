"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type CompletionResult =
  | { ok: true; destination: string }
  | { ok: false; error: string };

let activeCodeCompletion:
  | { key: string; promise: Promise<CompletionResult> }
  | undefined;

async function finalizeOAuthSession(role: string, nextPath: string | null) {
  const response = await fetch("/api/auth/oauth/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ next: nextPath, role }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { destination?: string; error?: string }
    | null;
  if (!response.ok || !payload?.destination) {
    return {
      ok: false,
      error: payload?.error ?? "The portal account could not be prepared.",
    } satisfies CompletionResult;
  }
  return { ok: true, destination: payload.destination } satisfies CompletionResult;
}

function completeCodeOnce(code: string, role: string, nextPath: string | null) {
  const key = JSON.stringify([code, role, nextPath]);
  if (activeCodeCompletion?.key === key) return activeCodeCompletion.promise;

  const promise = (async (): Promise<CompletionResult> => {
    const supabase = createClient();
    const { error: initializeError } = await supabase.auth.initialize();
    if (initializeError) return { ok: false, error: initializeError.message };

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) return { ok: false, error: sessionError.message };
    if (!session) {
      return { ok: false, error: "Google sign-in did not create a session. Try again." };
    }
    return finalizeOAuthSession(role, nextPath);
  })();

  activeCodeCompletion = { key, promise };
  return promise;
}

export function CallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code");
  const role = params.get("role") ?? "company";
  const nextPath = params.get("next");
  const oauthError = params.get("error");
  const oauthErrorDescription = params.get("error_description");
  const exchangeStarted = useRef(false);
  const [message, setMessage] = useState(() => "Completing sign-in...");
  const [successLink, setSuccessLink] = useState<string | null>(null);

  useEffect(() => {
    if (exchangeStarted.current) return;
    exchangeStarted.current = true;

    const supabase = createClient();

    async function completeAuth() {
      if (oauthError) {
        setMessage(
          oauthError === "access_denied"
            ? "Google sign-in was cancelled. You can return to sign-in and try again."
            : oauthErrorDescription || "Google sign-in could not be completed.",
        );
        setSuccessLink(`/auth/sign-in?role=${role}`);
        return;
      }

      // Support both PKCE (code) and implicit hash tokens.
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setMessage(error.message);
          return;
        }
        const result = await finalizeOAuthSession(role, nextPath);
        if (!result.ok) {
          setMessage(result.error);
          setSuccessLink(`/auth/sign-in?role=${role}`);
          return;
        }
        router.replace(result.destination);
        return;
      }

      if (code) {
        const result = await completeCodeOnce(code, role, nextPath);
        if (!result.ok) {
          setMessage(result.error);
          setSuccessLink(`/auth/sign-in?role=${role}`);
          return;
        }
        router.replace(result.destination);
        return;
      }

      setMessage("The magic link is missing a code. Try again.");
    }

    void completeAuth().catch((error) => {
      setMessage(error instanceof Error ? error.message : "An unknown error occurred during sign-in.");
    });
  }, [code, nextPath, oauthError, oauthErrorDescription, role, router]);

  return (
    <main className="min-h-screen w-full bg-[linear-gradient(180deg,#140249_0%,#6D367F_52%,#FF7282_100%)] px-6 py-16">
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col justify-center">
        <Card
          className="text-center border border-white/75 !bg-[#140249] text-surface shadow-none ring-0"
          style={{ backgroundColor: "#140249" }}
        >
          <Image
            src="/brand/Logo_OSH_Gradient_whitetext.svg"
            alt="Oslo Student Hub"
            width={252}
            height={60}
            className="mx-auto h-auto w-[220px] object-contain"
            priority
          />
          <h1 className="mt-4 text-2xl font-bold text-surface">Sign-in</h1>
          <p className="mt-3 text-sm text-surface/85">{message}</p>
        {successLink ? (
          <a
            href={successLink}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-surface"
          >
            Go to sign-in
          </a>
        ) : null}
        </Card>
      </div>
    </main>
  );
}
