import Link from "next/link";
import { headers } from "next/headers";
import { SectionHeader } from "@/components/ui/section-header";
import { CheckinRegistrationEmbed } from "@/components/event/checkin-registration-embed";
import { getStudentAudienceLabel, studentAudienceFromHost } from "@/lib/portal-audience";

const CHECKIN_EVENT_ID = 228140;

export default async function StudentEventsPage() {
  const audience = studentAudienceFromHost((await headers()).get("host"));
  return (
    <div className="flex min-w-0 flex-col gap-5 sm:gap-7">
      <SectionHeader
        headingLevel="h1"
        eyebrow={getStudentAudienceLabel(audience)}
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
