import Link from "next/link";
import { getPublicRegistrationCopy } from "@/lib/event-registration-copy";
import { listPublicRegistrationCampaigns } from "@/lib/event-registration";
import { resolvePublicRegistrationCampaignHref } from "@/lib/event-registration-links";

export const revalidate = 300;

export default async function EventRegisterLandingPage() {
  const campaigns = await listPublicRegistrationCampaigns();

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f0ebff] via-[#fdf4ef] to-white px-4 py-10 md:px-8">
      <div className="mx-auto max-w-6xl space-y-10">

        {/* Hero */}
        <div className="overflow-hidden rounded-3xl bg-[#140249] px-8 py-10 text-white shadow-lg">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">
            OSH Event Register
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold md:text-5xl">
            Register your company for Oslo Student Hub events.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80">
            Choose an open registration below to join Student Connect 2026 or another Oslo Student Hub event.
            All registrations are reviewed by OSH before approval.
          </p>
        </div>

        {/* Campaign cards */}
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#6d28d9]">
            Open registrations
          </h2>
          {campaigns.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm">
              <p className="text-sm text-gray-600">No public registrations are open right now.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {campaigns.map((campaign) => {
                const copy = getPublicRegistrationCopy({
                  slug: campaign.slug,
                  publicTitle: campaign.public_title,
                  publicSubtitle: campaign.public_subtitle,
                  publicDescription: campaign.public_description,
                  eventName: campaign.event.name,
                  eventSlug: campaign.event.slug,
                });

                return (
                <Link
                  key={campaign.id}
                  href={resolvePublicRegistrationCampaignHref(campaign.event.registration_form_url, campaign.slug)}
                  className="block"
                >
                  <div className="h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#FE9A70] hover:shadow-md">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#6d28d9]">
                          {campaign.event.name}
                        </p>
                        <h2 className="mt-1 text-2xl font-extrabold text-[#140249]">{copy.title}</h2>
                        {copy.subtitle ? (
                          <p className="mt-1 text-sm font-semibold text-[#140249]/80">{copy.subtitle}</p>
                        ) : null}
                      </div>
                      <p className="text-sm leading-relaxed text-[#1A1626]/80">
                        {copy.description ?? "Open the registration and complete the application."}
                      </p>
                      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#140249]/70">
                        <span>
                          {new Date(campaign.event.starts_at).toLocaleDateString("nb-NO")}
                        </span>
                        <span className="rounded-full bg-[#FE9A70] px-3 py-1 text-[#140249]">
                          Open registration
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
