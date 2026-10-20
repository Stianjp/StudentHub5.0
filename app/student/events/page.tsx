import { createPublicSupabaseClient } from "@/lib/supabase/public";
import Link from "next/link";
import { headers } from "next/headers";
import { SectionHeader } from "@/components/ui/section-header";
import { CheckinRegistrationEmbed } from "@/components/event/checkin-registration-embed";
import { getStudentAudienceLabel, studentAudienceFromHost } from "@/lib/portal-audience";

const CHECKIN_EVENT_ID = 228140;

export default async function StudentEventsPage() {
  const {data: events} = await createPublicSupabaseClient().from("events").select("id,name").eq("is_active",true).order("starts_at",{ascending:false});
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

      <section className="grid gap-3"><h2 className="text-2xl font-bold">Bedrifter og områder</h2>{(events as {id:string;name:string}[]|null)?.map(event=><Link className="underline" key={event.id} href={`/student/events/${event.id}`}>{event.name} — finn relevante bedrifter</Link>)}</section>
      <div className="min-w-0">
        <CheckinRegistrationEmbed
          eventId={CHECKIN_EVENT_ID}
          showHeader={false}
        />
      </div>
    </div>
  );
}
