import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
}) {
  const content = (
    <Card
      className={cn(
        "flex flex-col gap-2",
        href && "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-soft",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">{label}</p>
      <p className="text-3xl font-bold text-primary">{value}</p>
      {hint ? <p className="text-xs text-ink/70">{hint}</p> : null}
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
