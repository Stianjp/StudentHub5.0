import { cn } from "@/lib/utils";

const steps = [
  { key: "info", label: "Firma-info", href: "/company/onboarding" },
  { key: "recruitment", label: "Rekruttering", href: "/company/onboarding/recruitment" },
  { key: "branding", label: "Branding", href: "/company/onboarding/branding" },
  { key: "complete", label: "Ferdig", href: "/company/onboarding/complete" },
];

export function OnboardingSteps({ current }: { current: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => {
        const isActive = step.key === current;
        const isDone = steps.findIndex((s) => s.key === current) > index;
        return (
          <a
            key={step.key}
            href={step.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold",
              isActive
                ? "border-primary bg-primary text-surface"
                : isDone
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-primary/20 bg-surface text-primary",
            )}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[10px] font-bold text-primary">
              {index + 1}
            </span>
            {step.label}
          </a>
        );
      })}
    </div>
  );
}
