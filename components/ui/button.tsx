import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-surface shadow-soft hover:-translate-y-0.5 hover:bg-primary/95 active:translate-y-0",
  secondary:
    "bg-secondary text-primary shadow-soft hover:-translate-y-0.5 hover:bg-secondary/90 active:translate-y-0",
  ghost: "bg-transparent text-primary hover:bg-primary/10",
  danger: "bg-error text-surface hover:bg-error/90",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-full border border-transparent px-6 py-2.5 text-sm font-bold tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50 disabled:cursor-not-allowed disabled:opacity-60",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
