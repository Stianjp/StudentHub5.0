import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { KioskForm } from "@/components/event/kiosk-form";
import { getEvent, getEventCompanies } from "@/lib/events";
import { submitKiosk } from "@/app/event/actions";

type KioskPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function KioskPage({ params }: KioskPageProps) {
  const { eventId } = await params;
  const [event, registrations] = await Promise.all([getEvent(eventId), getEventCompanies(eventId)]);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        eyebrow="Kiosk"
        title={`${event.name} – kioskmodus`}
        description="Optimalisert for iPad/stand. 3–5 raske spørsmål."
      />

      <Card className="text-sm text-ink/80">
        <p>
          Kioskmodus registrerer anonyme svar og besøk i databasen. Kontaktinfo samles kun via stand-QR med samtykke.
        </p>
      </Card>

      <KioskForm
        eventId={eventId}
        companies={registrations.map((registration) => ({
          id: registration.company_id,
          name: registration.company.name,
        }))}
        action={submitKiosk}
      />
    </div>
  );
}
