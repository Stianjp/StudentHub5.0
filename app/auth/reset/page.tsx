import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { ResetClient } from "@/app/auth/reset/reset-client";

export const dynamic = "force-dynamic";

export default function ResetPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
          <Card className="text-center text-sm text-ink/80">Laster inn…</Card>
        </main>
      }
    >
      <ResetClient />
    </Suspense>
  );
}
