import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicRegistrationForm } from "@/components/event-register/public-registration-form";
import { getPublicRegistrationCopy } from "@/lib/event-registration-copy";
import { getPublicRegistrationCampaignBySlug } from "@/lib/event-registration";
import { resolvePublicRegistrationLandingHref } from "@/lib/event-registration-links";

export const revalidate = 300;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EventRegisterCampaignPage({ params }: PageProps) {
  const { slug } = await params;
  const detail = await getPublicRegistrationCampaignBySlug(slug);

  if (!detail) {
    notFound();
  }
  const backHref = resolvePublicRegistrationLandingHref(detail.campaign.event.registration_form_url);
  const copy = getPublicRegistrationCopy({
    slug: detail.campaign.slug,
    publicTitle: detail.campaign.public_title,
    publicSubtitle: detail.campaign.public_subtitle,
    publicDescription: detail.campaign.public_description,
    eventName: detail.campaign.event.name,
    eventSlug: detail.campaign.event.slug,
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f0ebff] via-[#fdf4ef] to-white px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Page header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[#6d28d9]">
              OSH Event Register
            </p>
            <h1 className="text-4xl font-extrabold text-[#140249] md:text-5xl">
              {copy.title}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[#1A1626]">
              {copy.description ??
                "Complete the registration to request a package, a stand and company portal access for your team."}
            </p>
          </div>
          <Link
            href={backHref}
            className="text-sm font-semibold text-[#140249] underline underline-offset-4 hover:text-[#6d28d9] md:pb-1"
          >
            ← Back to registrations
          </Link>
        </div>

        {/* Event info banner */}
        <div className="rounded-2xl bg-[#140249] px-6 py-5 text-white shadow-md">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-white/60">Event</p>
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">{detail.campaign.event.name}</h2>
              <p className="text-sm text-white/70">
                {detail.campaign.event.location ?? "Location to be confirmed"}
              </p>
            </div>
            <p className="text-sm font-semibold text-white/80">
              {new Date(detail.campaign.event.starts_at).toLocaleString("nb-NO")}
            </p>
          </div>
        </div>

        {/* Multi-step registration form */}
        <PublicRegistrationForm
          slug={slug}
          campaign={{
            publicTitle: copy.title,
            publicSubtitle: copy.subtitle,
            publicDescription: copy.description,
            floorplanImagePath: detail.campaign.floorplan_image_path,
            eventName: detail.campaign.event.name,
          }}
          packages={detail.packages}
          stands={detail.stands}
        />
      </div>
    </main>
  );
}
