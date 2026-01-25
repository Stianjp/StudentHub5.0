import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-2xl border border-primary/20 bg-surface px-5 py-4 text-sm font-medium text-ink shadow-sm outline-none transition placeholder:text-ink/40 focus:border-secondary focus:ring-2 focus:ring-secondary/30",
        className,
      )}
      {...props}
    />
  );
}
