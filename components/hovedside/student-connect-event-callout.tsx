import Link from "next/link";
import { SectionWrapper } from "@/components/hovedside/section-wrapper";
import {
  formatWebsiteEventMonth,
  resolveWebsiteEventHref,
  type WebsiteEvent,
} from "@/lib/hovedside/public-events";

const STUDENT_EVENTS_URL = "https://student.oslostudenthub.no/student/events";

type Props = {
  event: WebsiteEvent | null;
};

export function StudentConnectEventCallout({ event }: Props) {
  return (
    <SectionWrapper bg="primary">
      <div className="mx-auto max-w-lg text-center">
        {event ? (
          <>
            <p className="text-sm font-bold uppercase tracking-wider text-secondary">
              {formatWebsiteEventMonth(event.starts_at)}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-surface">
              {event.name}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-mist/60">
              Student Connect 2026 is our main event for students and companies,
              with networking, employer conversations, and free student tickets.
            </p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href={resolveWebsiteEventHref(event)}
                className="inline-flex items-center justify-center rounded-full border-2 border-secondary px-7 py-3 text-sm font-bold uppercase tracking-wider text-secondary transition-colors hover:bg-secondary hover:text-primary"
              >
                Learn more
              </Link>
              <Link
                href={STUDENT_EVENTS_URL}
                className="inline-flex items-center justify-center rounded-full bg-secondary px-7 py-3 text-sm font-bold uppercase tracking-wider text-primary transition-colors hover:bg-secondary/90"
              >
                Get your free ticket here
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-surface">
              Student Connect 2026
            </h2>
            <p className="mt-3 text-sm text-mist/60">
              More event information is coming soon.
            </p>
            <Link
              href={STUDENT_EVENTS_URL}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-secondary px-7 py-3 text-sm font-bold uppercase tracking-wider text-primary transition-colors hover:bg-secondary/90"
            >
              Get your free ticket here
            </Link>
          </>
        )}
      </div>
    </SectionWrapper>
  );
}
