import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { CallbackClient } from "@/app/auth/callback/callback-client";

export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
          <Card className="text-center text-sm text-ink/80">Fullfører innlogging…</Card>
        </main>
      }
    >
      <CallbackClient />
    </Suspense>
  );
}
