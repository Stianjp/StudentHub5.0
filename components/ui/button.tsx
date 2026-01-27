import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-surface shadow-soft hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-0 active:bg-primary/80 active:shadow-inner",
  secondary:
    "bg-secondary text-primary shadow-soft hover:-translate-y-0.5 hover:bg-secondary/85 active:translate-y-0 active:bg-secondary/75 active:shadow-inner",
  ghost:
    "bg-transparent text-primary hover:bg-primary/10 active:bg-primary/20 focus-visible:ring-primary/30",
  danger:
    "bg-error text-surface shadow-soft hover:-translate-y-0.5 hover:bg-error/90 active:translate-y-0 active:bg-error/80 active:shadow-inner",
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
