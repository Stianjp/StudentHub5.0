import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-full border border-primary/20 bg-surface px-5 py-3 text-sm font-medium text-ink shadow-sm outline-none transition placeholder:text-ink/40 focus:border-secondary focus:ring-2 focus:ring-secondary/30",
        className,
      )}
      {...props}
    />
  );
}
