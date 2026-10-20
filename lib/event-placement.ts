import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

// Explicit public-safe projection. Never return application/contact/invoice records to a student page.
export async function listEventExhibitors(eventId: string) {
  const db = createAdminSupabaseClient();
  const { data: approved, error: ae } = await db
    .from("event_registration_applications")
    .select("event_company_id")
    .eq("event_id", eventId)
    .eq("status", "approved");
  if (ae) throw ae;
  const ids = ((approved as { event_company_id: string | null }[]) ?? [])
    .map((a) => a.event_company_id)
    .filter((id): id is string => Boolean(id));
  if (!ids.length)
    return [] as Array<{
      id: string;
      company_id: string;
      target_fields: string[];
      target_fields_other: string | null;
      confirmed_area: string | null;
      stand_code: string | null;
      company: { name: string } | null;
    }>;
  const { data, error } = await db
    .from("event_companies")
    .select(
      "id,company_id,target_fields,target_fields_other,confirmed_area,stand_code,company:companies(name)",
    )
    .eq("event_id", eventId)
    .in("id", ids);
  if (error) throw error;
  return (data ?? []) as unknown as Array<{
    id: string;
    company_id: string;
    target_fields: string[];
    target_fields_other: string | null;
    confirmed_area: string | null;
    stand_code: string | null;
    company: { name: string } | null;
  }>;
}
