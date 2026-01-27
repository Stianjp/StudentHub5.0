import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, autoComplete, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-full border border-primary/20 bg-surface px-5 py-3 text-sm font-medium text-ink shadow-sm outline-none transition-all placeholder:text-ink/40 hover:border-secondary/70 hover:shadow-soft focus:border-secondary focus:shadow-[0_0_0_2px_#FE9A70] focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:border-secondary focus-visible:shadow-[0_0_0_2px_#FE9A70] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-secondary active:shadow-inner",
        className,
      )}
      autoComplete={autoComplete ?? "off"}
      {...props}
    />
  );
}
