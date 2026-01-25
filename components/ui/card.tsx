import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-surface p-6 shadow-soft ring-1 ring-primary/5",
        className,
      )}
      {...props}
    />
  );
}
