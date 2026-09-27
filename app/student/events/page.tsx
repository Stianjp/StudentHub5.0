import Link from "next/link";
import { SectionHeader } from "@/components/ui/section-header";
import { CheckinRegistrationEmbed } from "@/components/event/checkin-registration-embed";

const CHECKIN_EVENT_ID = 228140;

export default async function StudentEventsPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5 sm:gap-7">
      <SectionHeader
        headingLevel="h1"
        eyebrow="Student"
        title="Get your free ticket"
        actions={
          <Link className="button-link w-full sm:w-auto" href="/student/dashboard">
            Dashboard
          </Link>
        }
      />

      <div className="min-w-0">
        <CheckinRegistrationEmbed
          eventId={CHECKIN_EVENT_ID}
          showHeader={false}
        />
      </div>
    </div>
  );
}
