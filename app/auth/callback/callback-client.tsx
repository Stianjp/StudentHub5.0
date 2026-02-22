"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export function CallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code");
  const role = params.get("role") ?? "company";
  const mode = params.get("mode");
  const studentPortalUrl = process.env.NEXT_PUBLIC_STUDENT_PORTAL_URL ?? "/dashboard";
  const defaultNext = role === "student" ? studentPortalUrl : "/company";
  const nextPath = params.get("next") ?? defaultNext;
  const shouldAutoRedirect = params.get("next") !== null && mode !== "verify";
  const [message, setMessage] = useState(() => "Fullfører innlogging…");
  const [successLink, setSuccessLink] = useState<string | null>(null);

  function isExternal(url: string) {
    return /^https?:\/\//i.test(url);
  }

  useEffect(() => {
    const supabase = createClient();

    async function completeAuth() {
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
        if (shouldAutoRedirect) {
          if (isExternal(nextPath)) {
            window.location.assign(nextPath);
          } else {
            router.replace(nextPath);
          }
          return;
        }
        setMessage("Din konto er nå verifisert. Du kan logge inn her:");
        setSuccessLink(nextPath);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(error.message);
          return;
        }
        if (shouldAutoRedirect) {
          if (isExternal(nextPath)) {
            window.location.assign(nextPath);
          } else {
            router.replace(nextPath);
          }
          return;
        }
        setMessage("Din konto er nå verifisert. Du kan logge inn her:");
        setSuccessLink(nextPath);
        return;
      }

      setMessage("Mangler kode i magic link. Prøv igjen.");
    }

    void completeAuth().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Ukjent feil under innlogging.");
    });
  }, [code, nextPath, router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <Card className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Image src="/brand/logo.svg" alt="Oslo Student Hub" width={40} height={40} />
        </div>
        <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-primary/60">Oslo Student Hub</p>
        <h1 className="mt-2 text-2xl font-bold text-primary">Innlogging</h1>
        <p className="mt-3 text-sm text-ink/80">{message}</p>
        {successLink ? (
          <a
            href={successLink}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-surface"
          >
            Gå til innlogging
          </a>
        ) : null}
      </Card>
    </main>
  );
}
