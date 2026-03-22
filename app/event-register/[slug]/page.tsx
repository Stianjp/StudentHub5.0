import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Card } from "@/components/ui/card";
import { PublicRegistrationForm } from "@/components/event-register/public-registration-form";
import { getPublicRegistrationCampaignBySlug } from "@/lib/event-registration";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EventRegisterCampaignPage({ params }: PageProps) {
  const { slug } = await params;
  const detail = await getPublicRegistrationCampaignBySlug(slug);

  if (!detail) {
    notFound();
  }

  const host = ((await headers()).get("host") ?? "").toLowerCase();
  const backHref = host.startsWith("eventregister.") ? "/" : "/event-register";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f0ff_0%,#fef7f3_45%,#ffffff_100%)] px-6 py-8 md:px-10">
      <div className="mx-auto grid max-w-7xl gap-6">
        <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="grid gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
              OSH Event Register
            </p>
            <h1 className="text-4xl font-bold text-primary md:text-5xl">{detail.campaign.public_title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-ink/75 md:text-base">
              {detail.campaign.public_description || "Complete the registration to request a package, a stand and company portal access for your team."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="text-sm font-semibold text-primary/70 transition hover:text-primary" href={backHref}>
              Back to registrations
            </Link>
          </div>
        </section>

        <Card className="grid gap-2 bg-primary text-surface">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-surface/70">Event</p>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-surface">{detail.campaign.event.name}</h2>
              <p className="text-sm text-surface/80">{detail.campaign.event.location ?? "Location to be confirmed"}</p>
            </div>
            <div className="text-sm text-surface/80">
              {new Date(detail.campaign.event.starts_at).toLocaleString("nb-NO")}
            </div>
          </div>
        </Card>

        <PublicRegistrationForm
          slug={slug}
          campaign={{
            publicTitle: detail.campaign.public_title,
            publicSubtitle: detail.campaign.public_subtitle,
            publicDescription: detail.campaign.public_description,
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
