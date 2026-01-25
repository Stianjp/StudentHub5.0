"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code");
  const nextPath = params.get("next") ?? "/company";
  const [message, setMessage] = useState(() =>
    code ? "Fullfører innlogging…" : "Mangler kode i magic link. Prøv igjen.",
  );

  useEffect(() => {
    if (!code) {
      return;
    }

    const supabase = createClient();
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setMessage(error.message);
          return;
        }
        router.replace(nextPath);
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Ukjent feil under innlogging.");
      });
  }, [code, nextPath, router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <Card className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary/60">Innlogging</p>
        <h1 className="mt-2 text-2xl font-bold text-primary">Magic link</h1>
        <p className="mt-3 text-sm text-ink/80">{message}</p>
      </Card>
    </main>
  );
}
