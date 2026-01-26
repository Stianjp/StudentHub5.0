import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-full border border-primary/20 bg-surface px-5 py-3 text-sm font-semibold text-primary shadow-sm outline-none transition hover:border-secondary/60 focus:border-secondary focus:ring-2 focus:ring-secondary/30 focus:ring-offset-2 focus:ring-offset-mist",
        className,
      )}
      {...props}
    />
  );
}
