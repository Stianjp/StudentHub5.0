import { cache } from "react";
import type { TableRow } from "@/lib/types/database";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

type Event = TableRow<"events">;
type Company = TableRow<"companies">;

export const listActiveEvents = cache(async function listActiveEvents() {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_active", true)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Event[];
});

export const listAllEvents = cache(async function listAllEvents() {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, name, starts_at, ends_at")
    .order("starts_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Array<Pick<Event, "id" | "name" | "starts_at" | "ends_at">>;
});

export const getEvent = cache(async function getEvent(eventId: string) {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.from("events").select("*").eq("id", eventId).single();
  if (error) throw error;
  return data as Event;
});

export const getEventCompanies = cache(async function getEventCompanies(eventId: string) {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("event_companies")
    .select("*, company:companies(*)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Array<TableRow<"event_companies"> & { company: Company }>;
});

export async function listEventCompaniesForEvents(eventIds: string[]) {
  if (eventIds.length === 0) return [];
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("event_companies")
    .select("event_id, company:companies(id, name)")
    .in("event_id", eventIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Array<{ event_id: string; company: Company }>;
}
