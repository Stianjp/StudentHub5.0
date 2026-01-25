import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">{label}</p>
      <p className="text-3xl font-bold text-primary">{value}</p>
      {hint ? <p className="text-xs text-ink/70">{hint}</p> : null}
    </Card>
  );
}
