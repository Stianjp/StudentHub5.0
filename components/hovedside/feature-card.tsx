import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
};

export function FeatureCard({ icon, title, description }: Props) {
  return (
    <div className="rounded-2xl bg-surface p-6 shadow-soft ring-1 ring-primary/5 transition hover:-translate-y-0.5">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10 text-purple">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink/70">{description}</p>
    </div>
  );
}
