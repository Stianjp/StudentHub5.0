import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { SignInClient } from "@/app/auth/sign-in/sign-in-client";
import { headers } from "next/headers";
import { roleFromHost } from "@/lib/host";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const host = (await headers()).get("host");
  const allowedRole = roleFromHost(host);

  return (
    <Suspense
      fallback={
        <main className="min-h-screen w-full bg-[linear-gradient(180deg,#140249_0%,#6D367F_52%,#FF7282_100%)] px-6 py-16">
          <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-md flex-col justify-center">
            <Card
              className="border border-white/75 !bg-[#140249] text-center text-sm text-surface/85 shadow-none ring-0"
              style={{ backgroundColor: "#140249" }}
            >
              Laster inn…
            </Card>
          </div>
        </main>
      }
    >
      <SignInClient allowedRole={allowedRole} />
    </Suspense>
  );
}
