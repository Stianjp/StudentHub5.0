import Link from "next/link";
import { headers } from "next/headers";
import { Card } from "@/components/ui/card";
import { listPublicRegistrationCampaigns } from "@/lib/event-registration";

export const dynamic = "force-dynamic";

export default async function EventRegisterLandingPage() {
  const campaigns = await listPublicRegistrationCampaigns();
  const host = ((await headers()).get("host") ?? "").toLowerCase();
  const usesPublicHost = host.startsWith("eventregister.");

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f0ff_0%,#fef7f3_45%,#ffffff_100%)] px-6 py-10 md:px-10">
      <div className="mx-auto grid max-w-6xl gap-8">
        <section className="overflow-hidden rounded-[36px] border border-primary/10 bg-primary px-8 py-10 text-surface shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-surface/70">
            OSH Event Register
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold md:text-5xl">
            Public registration for career fairs and partner events.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-surface/80 md:text-base">
            Choose an open registration below to request a stand, package and company portal access.
            All registrations are reviewed by OSH before approval.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {campaigns.length === 0 ? (
            <Card>
              <p className="text-sm text-ink/75">No public registrations are open right now.</p>
            </Card>
          ) : (
            campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={usesPublicHost ? `/${campaign.slug}` : `/event-register/${campaign.slug}`}
                className="block"
              >
                <Card className="h-full border border-primary/10 bg-white/95 transition hover:-translate-y-0.5 hover:shadow-soft">
                  <div className="grid gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/60">
                        {campaign.event.name}
                      </p>
                      <h2 className="mt-2 text-2xl font-bold text-primary">{campaign.public_title}</h2>
                      {campaign.public_subtitle ? (
                        <p className="mt-2 text-sm font-medium text-primary/80">{campaign.public_subtitle}</p>
                      ) : null}
                    </div>
                    <p className="text-sm leading-6 text-ink/75">
                      {campaign.public_description || "Open the registration and complete the application."}
                    </p>
                    <div className="flex items-center justify-between gap-3 text-xs font-semibold text-primary/70">
                      <span>
                        {new Date(campaign.event.starts_at).toLocaleDateString("nb-NO")}
                      </span>
                      <span className="rounded-full bg-secondary px-3 py-1 text-primary">Open registration</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
