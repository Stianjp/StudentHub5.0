import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20",
        className,
      )}
      {...props}
    />
  );
}
