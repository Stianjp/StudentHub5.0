import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-full border border-primary/20 bg-surface px-5 py-3 text-sm font-semibold text-primary shadow-sm outline-none transition-all hover:border-secondary/70 hover:shadow-soft focus:border-secondary focus:ring-2 focus:ring-secondary/60 focus:ring-offset-2 focus:ring-offset-primary focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary active:border-secondary active:shadow-inner",
        className,
      )}
      {...props}
    />
  );
}
