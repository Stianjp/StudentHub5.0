import Link from "next/link";
import { SectionHeader } from "@/components/ui/section-header";
import { CheckinRegistrationEmbed } from "@/components/event/checkin-registration-embed";

const CHECKIN_EVENT_ID = 228140;

export default async function StudentEventsPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5 sm:gap-7">
      <SectionHeader
        eyebrow="Student"
        title="Get your free ticket"
        actions={
          <Link className="button-link text-xs" href="/student/dashboard">
            Back to dashboard
          </Link>
        }
      />

      <div className="-mx-3 min-w-0 sm:mx-0 lg:mx-auto lg:w-full lg:max-w-5xl">
        <CheckinRegistrationEmbed
          eventId={CHECKIN_EVENT_ID}
          showHeader={false}
        />
      </div>
    </div>
  );
}
