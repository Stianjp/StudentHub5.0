import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, autoComplete, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-full border border-primary/20 bg-surface px-5 py-3 text-sm font-medium text-ink shadow-sm outline-none transition-all placeholder:text-ink/40 hover:border-secondary/60 hover:shadow-soft focus:border-secondary focus:ring-2 focus:ring-secondary/30 focus:ring-offset-2 focus:ring-offset-mist focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/40 active:border-secondary active:shadow-inner",
        className,
      )}
      autoComplete={autoComplete ?? "off"}
      {...props}
    />
  );
}
