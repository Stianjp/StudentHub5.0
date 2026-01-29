import type { TableRow } from "@/lib/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail } from "@/lib/resend";

type Event = TableRow<"events">;
type Company = TableRow<"companies">;
type EventCompany = TableRow<"event_companies">;

type EventWithStats = Event & {
  companyCount: number;
  visitCount: number;
  leadCount: number;
};

export async function listEventsWithStats(): Promise<EventWithStats[]> {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    // fallback
  }
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: false });

  if (eventsError) throw eventsError;

  const eventRows = (events ?? []) as Event[];

  const results: EventWithStats[] = [];
  for (const event of eventRows) {
    const [{ count: companyCount }, { count: visitCount }, { count: leadCount }] = await Promise.all([
      supabase
        .from("event_companies")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id),
      supabase
        .from("stand_visits")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id),
      supabase
        .from("consents")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("consent", true),
    ]);

    results.push({
      ...event,
      companyCount: companyCount ?? 0,
      visitCount: visitCount ?? 0,
      leadCount: leadCount ?? 0,
    });
  }

  return results;
}

export async function listCompanies() {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    // fallback
  }
  const { data, error } = await supabase.from("companies").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Company[];
}

export async function listEventCompanies(eventId: string) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    // fallback
  }
  const { data, error } = await supabase
    .from("event_companies")
    .select("*, company:companies(*)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Array<EventCompany & { company: Company }>;
}

export async function getCompanyWithDetails(companyId: string) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    // fallback
  }
  const { data, error } = await supabase.from("companies").select("*").eq("id", companyId).single();
  if (error) throw error;
  return data as Company;
}

export async function listCompanyLeads(companyId: string) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    // fallback
  }
  const { data: leads, error } = await supabase
    .from("leads")
    .select("*, student:students(*), event:events(id, name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const leadRows = leads ?? [];
  if (leadRows.length === 0) return [];

  const studentIds = leadRows.map((row) => row.student_id);
  const { data: consents } = await supabase
    .from("consents")
    .select("*")
    .eq("company_id", companyId)
    .in("student_id", studentIds);

  const consentMap = new Map((consents ?? []).map((row) => [row.student_id, row]));

  return leadRows.map((lead) => ({
    lead,
    consent: consentMap.get(lead.student_id) ?? null,
    student: lead.student ?? null,
    event: lead.event ?? null,
  }));
}

export async function listCompanyRegistrations(companyId: string) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    // fallback
  }
  const { data, error } = await supabase
    .from("event_companies")
    .select("*, event:events(*)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getEventWithRegistrations(eventId: string) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    // fallback
  }
  const [{ data: event, error: eventError }, { data: registrations, error: regError }] = await Promise.all([
    supabase.from("events").select("*").eq("id", eventId).single(),
    supabase.from("event_companies").select("*, company:companies(*)").eq("event_id", eventId),
  ]);

  if (eventError) throw eventError;
  if (regError) throw regError;

  return {
    event: event as Event,
    registrations: (registrations ?? []) as unknown as Array<EventCompany & { company: Company }>,
  };
}

export async function upsertEvent(input: {
  id?: string;
  name: string;
  slug: string;
  description?: string | null;
  location?: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    // fallback
  }
  const now = new Date().toISOString();

  const payload = {
    ...input,
    description: input.description || null,
    location: input.location || null,
    updated_at: now,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("events")
    .insert({ ...payload, created_at: now })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function inviteCompanyToEvent(input: {
  eventId: string;
  companyId: string;
  email: string;
}) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient();
  } catch {
    // fallback
  }
  const now = new Date().toISOString();

  const { data: eventCompany, error: upsertError } = await supabase
    .from("event_companies")
    .upsert(
      {
        event_id: input.eventId,
        company_id: input.companyId,
        invited_email: input.email,
        invited_at: now,
        updated_at: now,
      },
      { onConflict: "event_id,company_id" },
    )
    .select("*")
    .single();

  if (upsertError) throw upsertError;

  const [{ data: event }, { data: company }] = await Promise.all([
    supabase.from("events").select("*").eq("id", input.eventId).single(),
    supabase.from("companies").select("*").eq("id", input.companyId).single(),
  ]);

  await sendTransactionalEmail({
    to: input.email,
    subject: `Invitasjon til ${event?.name ?? "OSH event"}`,
    type: "invite_company",
    html: `<p>Hei ${company?.name ?? "bedrift"},</p>
<p>Dere er invitert til ${event?.name ?? "et OSH-event"}.</p>
<p>Logg inn på bedriftsportalen for å bekrefte deltakelse.</p>`,
    payload: {
      eventId: input.eventId,
      companyId: input.companyId,
    },
    supabase,
  });

  return eventCompany;
}

export async function setPackageForCompany(input: {
  eventId: string;
  companyId: string;
  package: "standard" | "silver" | "gold" | "platinum";
  accessFrom?: string | null;
  accessUntil?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("event_companies")
    .upsert(
      {
        event_id: input.eventId,
        company_id: input.companyId,
        package: input.package,
        access_from: input.accessFrom || null,
        access_until: input.accessUntil || null,
        updated_at: now,
      },
      { onConflict: "event_id,company_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function registerCompanyForEvent(input: {
  eventId: string;
  companyId: string;
  standType?: string | null;
  package?: "standard" | "silver" | "gold" | "platinum";
}) {
  const supabase = createAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("event_companies")
    .upsert(
      {
        event_id: input.eventId,
        company_id: input.companyId,
        stand_type: input.standType ?? "Standard",
        package: input.package ?? "standard",
        registered_at: now,
        updated_at: now,
      },
      { onConflict: "event_id,company_id" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
