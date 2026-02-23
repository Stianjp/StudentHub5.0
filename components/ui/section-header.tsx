import type { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  tone = "default",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  tone?: "default" | "light";
}) {
  const isLight = tone === "light";

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? (
          <p className={isLight ? "text-xs font-semibold uppercase tracking-wide text-surface/80" : "text-xs font-semibold uppercase tracking-wide text-primary"}>
            {eyebrow}
          </p>
        ) : null}
        <h2 className={isLight ? "text-2xl font-bold text-surface" : "text-2xl font-bold text-primary"}>{title}</h2>
        {description ? (
          <p className={isLight ? "mt-1 text-sm text-surface/90" : "mt-1 text-sm text-primary"}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
