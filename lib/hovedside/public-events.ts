import { cache } from "react";
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
>;

export const listWebsiteEvents = cache(async function listWebsiteEvents() {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, name, slug, description, location, registration_form_url, starts_at, ends_at, is_active",
    )
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as WebsiteEvent[];
});

export function splitWebsiteEvents(events: WebsiteEvent[], now = new Date()) {
  const nowMs = now.getTime();
  const upcoming: WebsiteEvent[] = [];
  const past: WebsiteEvent[] = [];

  for (const event of events) {
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

export function resolveWebsiteEventHref(event: WebsiteEvent) {
  const url = event.registration_form_url?.trim();
  if (event.slug === "student-connect-2026") {
    return "/studentconnect2026";
  }
  if (url) {
    return url;
  }
  return `/events#${event.slug}`;
}
