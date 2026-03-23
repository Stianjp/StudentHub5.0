import Link from "next/link";
import { headers } from "next/headers";
import { listPublicRegistrationCampaigns } from "@/lib/event-registration";

export const dynamic = "force-dynamic";

export default async function EventRegisterLandingPage() {
  const campaigns = await listPublicRegistrationCampaigns();
  const host = ((await headers()).get("host") ?? "").toLowerCase();
  const usesPublicHost = host.startsWith("eventregister.");

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f0ebff] via-[#fdf4ef] to-white px-4 py-10 md:px-8">
      <div className="mx-auto max-w-6xl space-y-10">

        {/* Hero */}
        <div className="overflow-hidden rounded-3xl bg-[#140249] px-8 py-10 text-white shadow-lg">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">
            OSH Event Register
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold md:text-5xl">
            Public registration for career fairs and partner events.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80">
            Choose an open registration below to request a stand, package and company portal access.
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
              {campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={usesPublicHost ? `/${campaign.slug}` : `/event-register/${campaign.slug}`}
                  className="block"
                >
                  <div className="h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#FE9A70] hover:shadow-md">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#6d28d9]">
                          {campaign.event.name}
                        </p>
                        <h2 className="mt-1 text-2xl font-extrabold text-[#140249]">{campaign.public_title}</h2>
                        {campaign.public_subtitle ? (
                          <p className="mt-1 text-sm font-semibold text-[#140249]/80">{campaign.public_subtitle}</p>
                        ) : null}
                      </div>
                      <p className="text-sm leading-relaxed text-[#1A1626]/80">
                        {campaign.public_description ?? "Open the registration and complete the application."}
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
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
