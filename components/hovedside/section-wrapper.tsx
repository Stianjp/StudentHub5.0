import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  /** Apply a preset background */
  bg?: "white" | "mist" | "primary";
  id?: string;
};

const bgMap = {
  white: "bg-surface text-ink",
  mist: "bg-mist text-ink",
  primary: "bg-primary text-surface",
};

export function SectionWrapper({ children, className, bg = "white", id }: Props) {
  return (
    <section id={id} className={cn(bgMap[bg], "py-16 md:py-20", className)}>
      <div className="mx-auto max-w-7xl px-6">{children}</div>
    </section>
  );
}
