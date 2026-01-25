import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { SignInClient } from "@/app/auth/sign-in/sign-in-client";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
          <Card className="text-center text-sm text-ink/80">Laster inn…</Card>
        </main>
      }
    >
      <SignInClient />
    </Suspense>
  );
}
