import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-surface shadow-soft hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:ring-2 hover:ring-secondary/30 active:translate-y-0 active:scale-[0.98] active:bg-primary/80 active:shadow-inner active:ring-2 active:ring-secondary/60",
  secondary:
    "bg-secondary text-primary shadow-soft hover:-translate-y-0.5 hover:bg-secondary/85 hover:shadow-lg hover:ring-2 hover:ring-secondary/30 active:translate-y-0 active:scale-[0.98] active:bg-secondary/75 active:shadow-inner active:ring-2 active:ring-secondary/60",
  ghost:
    "bg-transparent text-primary hover:bg-secondary/15 hover:text-primary hover:shadow-soft hover:ring-2 hover:ring-secondary/30 active:bg-secondary/25 active:scale-[0.98] active:ring-2 active:ring-secondary/60 focus-visible:ring-secondary/60",
  danger:
    "bg-error text-surface shadow-soft hover:-translate-y-0.5 hover:bg-error/90 hover:shadow-lg hover:ring-2 hover:ring-secondary/30 active:translate-y-0 active:scale-[0.98] active:bg-error/80 active:shadow-inner active:ring-2 active:ring-secondary/60",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-full border border-transparent px-6 py-2.5 text-sm font-bold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-mist disabled:cursor-not-allowed disabled:opacity-60",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
