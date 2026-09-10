import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { TableRow } from "@/lib/types/database";

type GalaCompanyRow = TableRow<"crm_gala_dinner_companies">;
type GalaAttendeeRow = TableRow<"crm_gala_dinner_attendees">;
type PackageTier = TableRow<"event_companies">["package"];

export type GalaDinnerAttendeeInput = {
  fullName: string;
  allergens: string | null;
};

export type GalaDinnerCompanyDetail = {
  membership: GalaCompanyRow;
  pipeline: Pick<TableRow<"crm_pipelines">, "id" | "name" | "event_id">;
  company: Pick<TableRow<"companies">, "id" | "name">;
  event: Pick<TableRow<"events">, "id" | "name">;
  packageTier: PackageTier;
  stage: Pick<TableRow<"crm_pipeline_stages">, "id" | "name">;
  attendees: GalaAttendeeRow[];
};

export type GalaDinnerActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: {
    fullName?: string;
    allergens?: string;
  };
};

export const INITIAL_GALA_DINNER_ACTION_STATE: GalaDinnerActionState = {
  status: "idle",
  message: "",
};

export function validateGalaDinnerAttendee(input: {
  fullName: string;
  allergens: string;
}): { data?: GalaDinnerAttendeeInput; errors?: GalaDinnerActionState["fieldErrors"] } {
  const fullName = input.fullName.trim();
  const allergens = input.allergens.trim();
  const errors: NonNullable<GalaDinnerActionState["fieldErrors"]> = {};

  if (!fullName) errors.fullName = "Navn er påkrevd.";
  else if (fullName.length > 120) errors.fullName = "Navn kan ikke være lengre enn 120 tegn.";
  if (allergens.length > 500) {
    errors.allergens = "Allergener kan ikke være lengre enn 500 tegn.";
  }

  if (Object.keys(errors).length > 0) return { errors };
  return { data: { fullName, allergens: allergens || null } };
}

async function getGalaPipeline(pipelineId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("crm_pipelines")
    .select("id, event_id, kind")
    .eq("id", pipelineId)
    .single();
  if (error || !data || data.kind !== "gala_dinner" || !data.event_id) {
    throw new Error("Fant ikke gallamiddag-pipelinen.");
  }
  return data;
}

export async function addGalaDinnerCompany(pipelineId: string, companyId: string) {
  const supabase = createAdminSupabaseClient();
  const pipeline = await getGalaPipeline(pipelineId);
  const [{ data: eventCompany, error: eventCompanyError }, { data: stages, error: stageError }] =
    await Promise.all([
      supabase
        .from("event_companies")
        .select("company_id")
        .eq("event_id", pipeline.event_id)
        .eq("company_id", companyId)
        .maybeSingle(),
      supabase
        .from("crm_pipeline_stages")
        .select("id")
        .eq("pipeline_id", pipelineId)
        .order("position", { ascending: true })
        .limit(1),
    ]);

  if (eventCompanyError || !eventCompany) {
    throw new Error("Bedriften er ikke knyttet til arrangementet.");
  }
  if (stageError || !stages?.[0]) throw new Error("Pipelinen mangler en kolonne.");

  const { data: existing, error: existingError } = await supabase
    .from("crm_gala_dinner_companies")
    .select("id")
    .eq("pipeline_id", pipelineId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (existingError) throw new Error(`Kunne ikke kontrollere medlemskapet: ${existingError.message}`);

  const query = existing
    ? supabase
        .from("crm_gala_dinner_companies")
        .update({ is_active: true })
        .eq("id", existing.id)
    : supabase.from("crm_gala_dinner_companies").insert({
        pipeline_id: pipelineId,
        company_id: companyId,
        stage_id: stages[0].id,
      });
  const { error } = await query;
  if (error) throw new Error(`Kunne ikke legge til bedriften: ${error.message}`);
}

export async function removeGalaDinnerCompany(pipelineId: string, membershipId: string) {
  await getGalaPipeline(pipelineId);
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("crm_gala_dinner_companies")
    .update({ is_active: false })
    .eq("id", membershipId)
    .eq("pipeline_id", pipelineId)
    .eq("is_active", true)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Fant ikke bedriften i gallamiddag-pipelinen.");
}

export async function loadGalaDinnerCompanyDetail(
  membershipId: string,
): Promise<GalaDinnerCompanyDetail | null> {
  const supabase = createAdminSupabaseClient();
  const { data: membership, error: membershipError } = await supabase
    .from("crm_gala_dinner_companies")
    .select("*")
    .eq("id", membershipId)
    .maybeSingle();
  if (membershipError) throw new Error(`Kunne ikke laste middagsbedriften: ${membershipError.message}`);
  if (!membership) return null;

  const { data: pipeline, error: pipelineError } = await supabase
    .from("crm_pipelines")
    .select("id, name, event_id, kind")
    .eq("id", membership.pipeline_id)
    .single();
  if (pipelineError || !pipeline || pipeline.kind !== "gala_dinner" || !pipeline.event_id) return null;

  const [companyResult, eventResult, eventCompanyResult, stageResult, attendeeResult] =
    await Promise.all([
      supabase.from("companies").select("id, name").eq("id", membership.company_id).single(),
      supabase.from("events").select("id, name").eq("id", pipeline.event_id).single(),
      supabase
        .from("event_companies")
        .select("package")
        .eq("event_id", pipeline.event_id)
        .eq("company_id", membership.company_id)
        .single(),
      supabase.from("crm_pipeline_stages").select("id, name").eq("id", membership.stage_id).single(),
      supabase
        .from("crm_gala_dinner_attendees")
        .select("*")
        .eq("dinner_company_id", membership.id)
        .order("full_name", { ascending: true }),
    ]);

  const error =
    companyResult.error ??
    eventResult.error ??
    eventCompanyResult.error ??
    stageResult.error ??
    attendeeResult.error;
  if (error) throw new Error(`Kunne ikke laste gallamiddagdetaljer: ${error.message}`);

  return {
    membership: membership as GalaCompanyRow,
    pipeline: { id: pipeline.id, name: pipeline.name, event_id: pipeline.event_id },
    company: companyResult.data,
    event: eventResult.data,
    packageTier: eventCompanyResult.data.package,
    stage: stageResult.data,
    attendees: (attendeeResult.data ?? []) as GalaAttendeeRow[],
  };
}

async function requireActiveMembership(membershipId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("crm_gala_dinner_companies")
    .select("id, pipeline_id, is_active")
    .eq("id", membershipId)
    .single();
  if (error || !data || !data.is_active) throw new Error("Bedriften er ikke aktiv i gallamiddag-pipelinen.");
  await getGalaPipeline(data.pipeline_id);
  return data;
}

export async function createGalaDinnerAttendee(
  membershipId: string,
  input: GalaDinnerAttendeeInput,
) {
  await requireActiveMembership(membershipId);
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("crm_gala_dinner_attendees").insert({
    dinner_company_id: membershipId,
    full_name: input.fullName,
    allergens: input.allergens,
  });
  if (error) throw new Error(`Kunne ikke legge til deltaker: ${error.message}`);
}

export async function updateGalaDinnerAttendee(
  membershipId: string,
  attendeeId: string,
  input: GalaDinnerAttendeeInput,
) {
  await requireActiveMembership(membershipId);
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("crm_gala_dinner_attendees")
    .update({ full_name: input.fullName, allergens: input.allergens })
    .eq("id", attendeeId)
    .eq("dinner_company_id", membershipId)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Fant ikke deltakeren for denne bedriften.");
}

export async function deleteGalaDinnerAttendee(membershipId: string, attendeeId: string) {
  await requireActiveMembership(membershipId);
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("crm_gala_dinner_attendees")
    .delete()
    .eq("id", attendeeId)
    .eq("dinner_company_id", membershipId)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Fant ikke deltakeren for denne bedriften.");
}
