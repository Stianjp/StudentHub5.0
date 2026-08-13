import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, style, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-2xl border border-primary/20 bg-surface px-5 py-4 text-sm font-medium text-[#140249] shadow-sm outline-none transition-[background-color,border-color,color,box-shadow,transform] placeholder:text-[#140249]/45 hover:border-secondary/70 hover:shadow-soft focus:border-secondary focus:shadow-[0_0_0_2px_#FE9A70] focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:border-secondary focus-visible:shadow-[0_0_0_2px_#FE9A70] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-secondary active:shadow-inner",
        className,
      )}
      style={{
        color: "#140249",
        caretColor: "#140249",
        WebkitTextFillColor: "#140249",
        ...style,
      }}
      {...props}
    />
  );
}
