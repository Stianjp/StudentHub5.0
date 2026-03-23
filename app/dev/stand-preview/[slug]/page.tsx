import Link from "next/link";
import { notFound } from "next/navigation";
import { StandMap } from "@/components/event-register/stand-map";
import { getPreviewRegistrationDetail, isPreviewRegistrationSlug, isRegistrationPackageTier, REGISTRATION_PACKAGE_TIERS, STUDENT_CONNECT_2026_FLOORPLAN } from "@/lib/event-registration-fixtures";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function packageCountLabel(count: number) {
  return `${count} stand${count === 1 ? "" : "s"}`;
}

export default async function StandPreviewPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = (await searchParams) ?? {};

  if (!isPreviewRegistrationSlug(slug)) {
    notFound();
  }

  const requestedTier = typeof query.tier === "string" ? query.tier : "standard";
  const activeTier = isRegistrationPackageTier(requestedTier) ? requestedTier : "standard";
  const detail = getPreviewRegistrationDetail(slug);

  if (!detail) {
    notFound();
  }

  const visibleStands = detail.stands.filter((stand) => stand.package_tier === activeTier && stand.status !== "disabled");

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#eef6ff] via-[#fdf4ef] to-white px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-[#140249]/10 bg-white/95 px-6 py-6 shadow-md">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#6d28d9]">Dev Preview</p>
          <h1 className="mt-2 text-3xl font-extrabold text-[#140249] md:text-4xl">
            {detail.campaign.public_title} Stand Alignment
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#1A1626]/75">
            This preview uses local fixture data and the production floorplan PNG as the stand-geometry source of truth.
          </p>
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {REGISTRATION_PACKAGE_TIERS.map((tier) => {
                const tierStands = detail.stands.filter((stand) => stand.package_tier === tier && stand.status !== "disabled");
                return (
                  <Link
                    key={tier}
                    href={`/dev/stand-preview/${slug}?tier=${tier}`}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                      tier === activeTier
                        ? "border-[#FE9A70] bg-[#FE9A70] text-[#140249]"
                        : "border-[#140249]/15 bg-white text-[#140249]/80 hover:border-[#FE9A70] hover:text-[#140249]",
                    )}
                  >
                    <span className="uppercase">{tier}</span>
                    <span className="rounded-full bg-[#140249]/10 px-2 py-0.5 text-[11px] text-[#140249]/70">
                      {tierStands.length}
                    </span>
                  </Link>
                );
              })}
            </div>

            <StandMap
              floorplanImagePath={STUDENT_CONNECT_2026_FLOORPLAN.imagePath}
              floorplanAlt={STUDENT_CONNECT_2026_FLOORPLAN.alt}
              floorplanWidth={STUDENT_CONNECT_2026_FLOORPLAN.width}
              floorplanHeight={STUDENT_CONNECT_2026_FLOORPLAN.height}
              stands={visibleStands}
              testId="stand-preview-map"
            />
          </div>

          <aside className="rounded-3xl border border-[#140249]/10 bg-white/95 p-5 shadow-md">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#6d28d9]">Visible Tier</p>
            <h2 className="mt-2 text-2xl font-extrabold capitalize text-[#140249]">{activeTier}</h2>
            <p data-testid="preview-stand-count" className="mt-1 text-sm font-semibold text-[#140249]/70">
              {packageCountLabel(visibleStands.length)}
            </p>

            <div className="mt-5 grid gap-2">
              {visibleStands.map((stand) => (
                <div
                  key={stand.id}
                  className="rounded-2xl border border-[#140249]/10 bg-[#f8f7fd] px-4 py-3 text-sm font-semibold text-[#140249]"
                >
                  {stand.display_label ?? stand.stand_code}
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
