import Link from "next/link";
import type { ReactNode } from "react";

type HeroProps = {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  children?: ReactNode;
  /** Extra CTAs rendered beside the primary one */
  extraCtas?: { label: string; href: string }[];
};

export function HeroSection({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  children,
  extraCtas,
}: HeroProps) {
  return (
    <section className="relative flex min-h-[58vh] items-center overflow-hidden bg-primary md:min-h-[70vh]">
      {/* Decorative gradient overlay simulating a dark event photo */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-purple/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(132,106,230,0.15),transparent_70%)]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl text-center sm:text-left">
          <h1 className="text-3xl font-bold leading-tight text-surface sm:text-4xl md:text-5xl lg:text-6xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-5 text-sm leading-relaxed text-mist/80 sm:text-base md:text-lg">
              {subtitle}
            </p>
          )}
          {children}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {ctaLabel && ctaHref && (
              <Link
                href={ctaHref}
                className="inline-flex w-full items-center justify-center rounded-full border-2 border-secondary px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-secondary transition-colors hover:bg-secondary hover:text-primary sm:w-auto sm:px-7"
              >
                {ctaLabel}
              </Link>
            )}
            {extraCtas?.map((cta) => (
              <Link
                key={cta.href}
                href={cta.href}
                className="inline-flex w-full items-center justify-center rounded-full border-2 border-secondary px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-secondary transition-colors hover:bg-secondary hover:text-primary sm:w-auto sm:px-7"
              >
                {cta.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Placeholder for background image area (right side) */}
      <div className="absolute right-0 top-0 hidden h-full w-1/2 lg:block">
        <div className="flex h-full items-center justify-center text-mist/20">
          <div className="text-center">
            <div className="mx-auto mb-2 h-32 w-32 rounded-2xl bg-mist/5" />
            <span className="text-xs">Bakgrunnsbilde</span>
          </div>
        </div>
      </div>
    </section>
  );
}
