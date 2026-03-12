"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CrmRefreshControls() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => {
      router.refresh();
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [router]);

  return (
    <div className="flex items-center gap-3 text-xs text-ink/60">
      <span>Autooppdaterer hvert 30. sek.</span>
      <Button
        type="button"
        variant="ghost"
        className="min-h-0 rounded-xl px-4 py-2 text-xs"
        onClick={() => {
          startTransition(() => {
            router.refresh();
          });
        }}
        disabled={isPending}
      >
        {isPending ? "Oppdaterer..." : "Oppdater nå"}
      </Button>
    </div>
  );
}
