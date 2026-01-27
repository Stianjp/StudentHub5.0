import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, autoComplete, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-full border border-primary/20 bg-surface px-5 py-3 text-sm font-medium text-ink shadow-sm outline-none transition-all placeholder:text-ink/40 hover:border-secondary/70 hover:shadow-soft focus:border-secondary focus:ring-2 focus:ring-secondary/70 focus:ring-offset-0 focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/80 focus-visible:ring-offset-0 active:border-secondary active:shadow-inner",
        className,
      )}
      autoComplete={autoComplete ?? "off"}
      {...props}
    />
  );
}
