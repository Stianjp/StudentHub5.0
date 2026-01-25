import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { getEvent, getEventCompanies } from "@/lib/events";

type EventPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const [event, registrations] = await Promise.all([getEvent(eventId), getEventCompanies(eventId)]);

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        eyebrow="Karrieredag"
        title={event.name}
        description={event.description ?? "Eventinformasjon"}
        actions={
          <Link className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-primary" href={`/event/${eventId}/kiosk`}>
            Kioskmodus
          </Link>
        }
      />

      <Card className="flex flex-col gap-2 text-sm text-ink/80">
        <p>
          <span className="font-semibold text-primary">Sted:</span> {event.location ?? "Kommer"}
        </p>
        <p>
          <span className="font-semibold text-primary">Tid:</span> {new Date(event.starts_at).toLocaleString("nb-NO")} – {" "}
          {new Date(event.ends_at).toLocaleString("nb-NO")}
        </p>
        <p className="text-xs text-ink/70">QR per stand: /event/{eventId}/company/{"{companyId}"}</p>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        {registrations.map((registration) => (
          <Link key={registration.id} href={`/event/${eventId}/company/${registration.company_id}`}>
            <Card className="flex h-full flex-col gap-3 transition hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/60">Stand</p>
                <Badge variant={registration.package === "platinum" ? "success" : "default"}>
                  {registration.package}
                </Badge>
              </div>
              <h3 className="text-xl font-bold text-primary">{registration.company.name}</h3>
              <p className="text-sm text-ink/80">{registration.company.branding_evp ?? "Employer branding kommer."}</p>
              {registration.stand_type ? (
                <p className="text-xs font-semibold text-primary/70">Standtype: {registration.stand_type}</p>
              ) : null}
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
