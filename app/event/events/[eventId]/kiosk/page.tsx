import { RegistrationForm } from "@/components/event/registration-form";
import { getEvent, getEventCompanies } from "@/lib/events";
import { SectionHeader } from "@/components/ui/section-header";

type PageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventKioskPage({ params }: PageProps) {
  const { eventId } = await params;
  const [event, registrations] = await Promise.all([getEvent(eventId), getEventCompanies(eventId)]);

  const companies = registrations.map((registration) => ({
    id: registration.company_id,
    name: registration.company.name,
    category_tags: (registration as { category_tags?: string[] | null }).category_tags ?? [],
  }));

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        eyebrow="Kiosk"
        title={`${event.name} – kiosk`}
        description="Rask registrering for flere bedrifter. Ingen innlogging kreves."
      />
      <RegistrationForm eventId={eventId} companies={companies} mode="kiosk" />
    </div>
  );
}
