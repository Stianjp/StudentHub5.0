import type { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  tone = "default",
  headingLevel = "h2",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  tone?: "default" | "light";
  headingLevel?: "h1" | "h2";
}) {
  const Heading = headingLevel;
  const isLight = tone === "light";

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? (
          <p className={isLight ? "text-xs font-semibold uppercase tracking-wide text-surface/80" : "text-xs font-semibold uppercase tracking-wide text-primary"}>
            {eyebrow}
          </p>
        ) : null}
        <Heading className={isLight ? "text-2xl font-bold text-surface" : "text-2xl font-bold text-primary"}>{title}</Heading>
        {description ? (
          <p className={isLight ? "mt-1 text-sm text-surface/90" : "mt-1 text-sm text-primary"}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div> : null}
    </div>
  );
}
