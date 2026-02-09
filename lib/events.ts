import type { TableRow } from "@/lib/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Event = TableRow<"events">;
type Company = TableRow<"companies">;

export async function listActiveEvents() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_active", true)
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Event[];
}

export async function getEvent(eventId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("events").select("*").eq("id", eventId).single();
  if (error) throw error;
  return data as Event;
}

export async function getEventCompanies(eventId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("event_companies")
    .select("*, company:companies(*)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Array<TableRow<"event_companies"> & { company: Company }>;
}

export async function listEventCompaniesForEvents(eventIds: string[]) {
  if (eventIds.length === 0) return [];
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("event_companies")
    .select("event_id, company:companies(id, name)")
    .in("event_id", eventIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Array<{ event_id: string; company: Company }>;
}
