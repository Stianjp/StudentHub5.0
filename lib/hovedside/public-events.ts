import type { TableRow } from "@/lib/types/database";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

type Event = TableRow<"events">;

export type WebsiteEvent = Pick<
  Event,
  | "id"
  | "name"
  | "slug"
  | "description"
  | "location"
  | "registration_form_url"
  | "starts_at"
  | "ends_at"
  | "is_active"
> & { registration_campaign_slug?: string };

const WEBSITE_EVENT_DESCRIPTION_OVERRIDES: Partial<
  Record<NonNullable<WebsiteEvent["slug"]>, string>
> = {
  "student-connect-2026": "Main event for students and companies.",
};

const WEBSITE_EVENT_DESCRIPTION_TRANSLATIONS: Record<string, string> = {
  "Hovedarrangement for studenter og bedrifter.":
    "Main event for students and companies.",
  "Hovedarrangement for studenter og bedrifter":
    "Main event for students and companies.",
};

async function fetchWebsiteEvents() {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, name, slug, description, location, registration_form_url, starts_at, ends_at, is_active",
    )
    .eq("is_active", true)
    .eq("website_published", true)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  const {data: campaigns, error: campaignError} = await supabase.from("event_registration_campaigns").select("event_id,slug").order("created_at");
  if(campaignError) throw campaignError;
  return (data as WebsiteEvent[] ?? []).map(event => ({...event, registration_campaign_slug: (campaigns as {event_id:string;slug:string}[] ?? []).find(c=>c.event_id===event.id)?.slug}));
}

export const listWebsiteEvents = fetchWebsiteEvents;

export function splitWebsiteEvents(events: WebsiteEvent[], now = new Date()) {
  const nowMs = now.getTime();
  const upcoming: WebsiteEvent[] = [];
  const past: WebsiteEvent[] = [];

  for (const event of events) {
    if (!event.is_active) continue;
    const endMs = new Date(event.ends_at).getTime();
    if (endMs >= nowMs) {
      upcoming.push(event);
    } else {
      past.push(event);
    }
  }

  return {
    upcoming,
    past: [...past].sort(
      (left, right) =>
        new Date(right.starts_at).getTime() - new Date(left.starts_at).getTime(),
    ),
  };
}

export function formatWebsiteEventMonth(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatWebsiteEventDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function getWebsiteEventDescription(
  event: Pick<WebsiteEvent, "slug" | "description">,
) {
  const override = event.slug
    ? WEBSITE_EVENT_DESCRIPTION_OVERRIDES[event.slug]
    : null;
  if (override) return override;

  const description = event.description?.trim();
  if (!description) return "More information coming soon.";

  return WEBSITE_EVENT_DESCRIPTION_TRANSLATIONS[description] ?? description;
}

export function resolveWebsiteEventHref(event: WebsiteEvent) {
  const url = event.registration_form_url?.trim();
  if (event.slug === "student-connect-2026") {
    return "/studentconnect2026";
  }
  if (url) {
    return url;
  }
  if (event.registration_campaign_slug) return `https://eventregister.oslostudenthub.no/${event.registration_campaign_slug}`;
  return `/events#${event.slug}`;
}
