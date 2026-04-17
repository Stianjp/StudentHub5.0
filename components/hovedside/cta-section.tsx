import Link from "next/link";

type Props = {
  headline: string;
  ctaLabel: string;
  ctaHref: string;
};

export function CtaSection({ headline, ctaLabel, ctaHref }: Props) {
  return (
    <section className="bg-gradient-to-r from-secondary via-pink to-purple py-16">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <h2 className="text-2xl font-bold text-primary md:text-3xl">
          {headline}
        </h2>
        <Link
          href={ctaHref}
          prefetch={false}
          className="mt-6 inline-flex items-center rounded-full border-2 border-primary bg-primary px-8 py-3 text-sm font-bold uppercase tracking-wider text-surface transition-colors hover:bg-transparent hover:text-primary"
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
