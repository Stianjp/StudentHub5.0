import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

type HeroProps = {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  children?: ReactNode;
  /** Extra CTAs rendered beside the primary one */
  extraCtas?: { label: string; href: string }[];
  backgroundImageSrc?: string;
  backgroundImageAlt?: string;
  backgroundImagePosition?: string;
  imagePriority?: boolean;
};

export function HeroSection({
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  children,
  extraCtas,
  backgroundImageSrc,
  backgroundImageAlt = "",
  backgroundImagePosition = "center",
  imagePriority = false,
}: HeroProps) {
  return (
    <section className="relative flex min-h-[58vh] items-center overflow-hidden bg-primary md:min-h-[70vh]">
      {backgroundImageSrc ? (
        <>
          <div className="absolute inset-0 hidden md:block">
            <Image
              src={backgroundImageSrc}
              alt={backgroundImageAlt}
              fill
              priority={imagePriority}
              className="object-cover"
              style={{ objectPosition: backgroundImagePosition }}
              sizes="100vw"
            />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,2,73,0.98)_0%,rgba(20,2,73,0.94)_100%)] md:bg-[linear-gradient(90deg,rgba(20,2,73,0.88)_0%,rgba(20,2,73,0.76)_36%,rgba(20,2,73,0.48)_64%,rgba(20,2,73,0.78)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(254,154,112,0.14),transparent_42%),radial-gradient(ellipse_at_20%_10%,rgba(132,106,230,0.2),transparent_44%)] md:bg-[radial-gradient(ellipse_at_top_right,rgba(254,154,112,0.16),transparent_42%),radial-gradient(ellipse_at_20%_10%,rgba(132,106,230,0.18),transparent_44%)]" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-purple/30" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(132,106,230,0.15),transparent_70%)]" />
        </>
      )}

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
                prefetch={false}
                className="inline-flex w-full items-center justify-center rounded-full border-2 border-secondary px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-secondary transition-colors hover:bg-secondary hover:text-primary sm:w-auto sm:px-7"
              >
                {ctaLabel}
              </Link>
            )}
            {extraCtas?.map((cta) => (
              <Link
                key={cta.href}
                href={cta.href}
                prefetch={false}
                className="inline-flex w-full items-center justify-center rounded-full border-2 border-secondary px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-secondary transition-colors hover:bg-secondary hover:text-primary sm:w-auto sm:px-7"
              >
                {cta.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
