import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { ResetClient } from "@/app/auth/reset/reset-client";

export const dynamic = "force-dynamic";

export default function ResetPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen w-full bg-[linear-gradient(180deg,#140249_0%,#6D367F_52%,#FF7282_100%)] px-6 py-16">
          <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col justify-center">
            <Card className="border border-white/75 bg-primary text-center text-sm text-surface/80 shadow-none ring-0">
              Laster inn…
            </Card>
          </div>
        </main>
      }
    >
      <ResetClient />
    </Suspense>
  );
}
