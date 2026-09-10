import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  normalizeCrmText,
  normalizePipelineStage,
  type CrmCompanyCard,
  type CrmPipelineStage,
} from "@/lib/crm";
import { syncCompanyEventPipelineStage } from "@/lib/crm-supabase";
import type { TableRow } from "@/lib/types/database";

type PipelineRow = TableRow<"crm_pipelines">;
type StageRow = TableRow<"crm_pipeline_stages">;
type PositionRow = TableRow<"crm_pipeline_company_positions">;
type ContactRow = TableRow<"company_contacts">;
type GalaCompanyRow = TableRow<"crm_gala_dinner_companies">;
type GalaAttendeeRow = TableRow<"crm_gala_dinner_attendees">;

type ParticipantRow = {
  company_id: string;
  event_id: string;
  package: TableRow<"event_companies">["package"];
  updated_at: string;
};

type NamedRow = {
  id: string;
  name: string;
};

export type CrmPipelineParticipant = {
  key: string;
  companyId: string | null;
  eventId: string | null;
  company: string;
  eventName: string;
  totalContacts: number;
  openLeadCount: number;
  pipelineValueTotal: number;
  lastUpdatedAtIso: string;
  legacyPipelineStage: CrmPipelineStage | "";
  contacts: CrmPipelineContact[];
  membershipId: string | null;
  packageTier: TableRow<"event_companies">["package"] | null;
  dinnerAttendeeCount: number;
  hasAllergens: boolean;
};

export type CrmPipelineContact = Pick<
  ContactRow,
  "id" | "contact_type" | "name" | "job_title" | "email" | "phone"
>;

export type CrmPipelineStageBoard = Pick<StageRow, "id" | "name" | "position"> & {
  companies: CrmPipelineParticipant[];
};

export type CrmPipelineBoard = Pick<
  PipelineRow,
  "id" | "name" | "position" | "is_default" | "kind" | "event_id"
> & {
  stages: CrmPipelineStageBoard[];
  totalAttendees: number;
  availableCompanies: Array<{
    companyId: string;
    company: string;
    packageTier: TableRow<"event_companies">["package"];
  }>;
};

export type CrmPipelineConfiguration = {
  pipelines: PipelineRow[];
  stages: StageRow[];
  positions: PositionRow[];
  galaCompanies: GalaCompanyRow[];
  galaAttendees: GalaAttendeeRow[];
  participants: Array<{
    key: string;
    companyId: string;
    eventId: string;
    company: string;
    eventName: string;
    updatedAt: string;
    packageTier: TableRow<"event_companies">["package"];
    contacts: CrmPipelineContact[];
  }>;
};

const REGISTRATION_STAGES = new Set<CrmPipelineStage>([
  "Påmeldt",
  "Venter kontrakt",
  "Venter faktura",
  "Betalt",
]);

function textParticipantKey(company: string, eventName: string) {
  return `text:${normalizeCrmText(company)}::${normalizeCrmText(eventName)}`;
}

function idParticipantKey(companyId: string, eventId: string) {
  return `id:${companyId}::${eventId}`;
}

function crmCardLookupKey(company: string, eventName: string) {
  return `${normalizeCrmText(company)}::${normalizeCrmText(eventName)}`;
}

export async function loadCrmPipelineConfiguration(): Promise<CrmPipelineConfiguration> {
  const supabase = createAdminSupabaseClient();
  const [
    pipelineResult,
    stageResult,
    positionResult,
    participantResult,
    companyResult,
    eventResult,
    contactResult,
    galaCompanyResult,
    galaAttendeeResult,
  ] =
    await Promise.all([
      supabase.from("crm_pipelines").select("*").order("position", { ascending: true }),
      supabase.from("crm_pipeline_stages").select("*").order("position", { ascending: true }),
      supabase.from("crm_pipeline_company_positions").select("*"),
      supabase.from("event_companies").select("company_id, event_id, package, updated_at"),
      supabase.from("companies").select("id, name"),
      supabase.from("events").select("id, name"),
      supabase
        .from("company_contacts")
        .select("id, company_id, contact_type, name, job_title, email, phone")
        .order("contact_type", { ascending: true }),
      supabase.from("crm_gala_dinner_companies").select("*"),
      supabase.from("crm_gala_dinner_attendees").select("*"),
    ]);

  const error =
    pipelineResult.error ??
    stageResult.error ??
    positionResult.error ??
    participantResult.error ??
    companyResult.error ??
    eventResult.error ??
    contactResult.error ??
    galaCompanyResult.error ??
    galaAttendeeResult.error;
  if (error) throw new Error(`Kunne ikke laste CRM-pipelines: ${error.message}`);

  const companies = new Map(
    ((companyResult.data ?? []) as NamedRow[]).map((company) => [company.id, company.name]),
  );
  const events = new Map(
    ((eventResult.data ?? []) as NamedRow[]).map((event) => [event.id, event.name]),
  );
  const contactsByCompany = new Map<string, CrmPipelineContact[]>();
  for (const contact of (contactResult.data ?? []) as Array<CrmPipelineContact & { company_id: string }>) {
    const current = contactsByCompany.get(contact.company_id) ?? [];
    current.push({
      id: contact.id,
      contact_type: contact.contact_type,
      name: contact.name,
      job_title: contact.job_title,
      email: contact.email,
      phone: contact.phone,
    });
    contactsByCompany.set(contact.company_id, current);
  }

  const participants = ((participantResult.data ?? []) as ParticipantRow[])
    .map((participant) => {
      const company = companies.get(participant.company_id);
      const eventName = events.get(participant.event_id);
      if (!company || !eventName) return null;

      return {
        key: idParticipantKey(participant.company_id, participant.event_id),
        companyId: participant.company_id,
        eventId: participant.event_id,
        company,
        eventName,
        updatedAt: participant.updated_at,
        packageTier: participant.package,
        contacts: contactsByCompany.get(participant.company_id) ?? [],
      };
    })
    .filter((participant): participant is NonNullable<typeof participant> => Boolean(participant));

  return {
    pipelines: (pipelineResult.data ?? []) as PipelineRow[],
    stages: (stageResult.data ?? []) as StageRow[],
    positions: (positionResult.data ?? []) as PositionRow[],
    galaCompanies: (galaCompanyResult.data ?? []) as GalaCompanyRow[],
    galaAttendees: (galaAttendeeResult.data ?? []) as GalaAttendeeRow[],
    participants,
  };
}

export function buildCrmPipelineBoards(
  configuration: CrmPipelineConfiguration,
  crmCards: CrmCompanyCard[],
): CrmPipelineBoard[] {
  const crmCardByName = new Map(
    crmCards.map((card) => [crmCardLookupKey(card.company, card.eventName), card]),
  );
  const participantByName = new Set(
    configuration.participants.map((participant) =>
      crmCardLookupKey(participant.company, participant.eventName),
    ),
  );

  const sourceCompanies: CrmPipelineParticipant[] = configuration.participants.map((participant) => {
    const crmCard = crmCardByName.get(crmCardLookupKey(participant.company, participant.eventName));
    return {
      key: participant.key,
      companyId: participant.companyId,
      eventId: participant.eventId,
      company: participant.company,
      eventName: participant.eventName,
      totalContacts: crmCard?.totalContacts ?? 0,
      openLeadCount: crmCard?.openLeadCount ?? 0,
      pipelineValueTotal: crmCard?.pipelineValueTotal ?? 0,
      lastUpdatedAtIso: crmCard?.lastUpdatedAtIso || participant.updatedAt,
      legacyPipelineStage: crmCard?.pipelineStage ?? "",
      contacts: participant.contacts,
      membershipId: null,
      packageTier: participant.packageTier,
      dinnerAttendeeCount: 0,
      hasAllergens: false,
    };
  });

  for (const card of crmCards) {
    const nameKey = crmCardLookupKey(card.company, card.eventName);
    if (participantByName.has(nameKey) || !REGISTRATION_STAGES.has(card.pipelineStage)) continue;

    sourceCompanies.push({
      key: textParticipantKey(card.company, card.eventName),
      companyId: null,
      eventId: null,
      company: card.company,
      eventName: card.eventName,
      totalContacts: card.totalContacts,
      openLeadCount: card.openLeadCount,
      pipelineValueTotal: card.pipelineValueTotal,
      lastUpdatedAtIso: card.lastUpdatedAtIso,
      legacyPipelineStage: card.pipelineStage,
      contacts: [],
      membershipId: null,
      packageTier: null,
      dinnerAttendeeCount: 0,
      hasAllergens: false,
    });
  }

  const positions = new Map(
    configuration.positions.map((position) => [
      `${position.pipeline_id}::${position.company_key}`,
      position.stage_id,
    ]),
  );
  const participantsByCompanyEvent = new Map(
    sourceCompanies
      .filter((participant) => participant.companyId && participant.eventId)
      .map((participant) => [
        `${participant.companyId}::${participant.eventId}`,
        participant,
      ]),
  );
  const attendeesByMembership = new Map<string, GalaAttendeeRow[]>();
  for (const attendee of configuration.galaAttendees) {
    const current = attendeesByMembership.get(attendee.dinner_company_id) ?? [];
    current.push(attendee);
    attendeesByMembership.set(attendee.dinner_company_id, current);
  }

  return configuration.pipelines
    .map((pipeline) => {
      const stages = configuration.stages
        .filter((stage) => stage.pipeline_id === pipeline.id)
        .sort((a, b) => a.position - b.position);
      const stageIds = new Set(stages.map((stage) => stage.id));
      const stageByName = new Map(stages.map((stage) => [stage.name, stage.id]));
      const companiesByStage = new Map(stages.map((stage) => [stage.id, [] as CrmPipelineParticipant[]]));
      const firstStage = stages[0];

      if (firstStage && pipeline.kind === "gala_dinner" && pipeline.event_id) {
        for (const membership of configuration.galaCompanies) {
          if (!membership.is_active || membership.pipeline_id !== pipeline.id) continue;
          const source = participantsByCompanyEvent.get(
            `${membership.company_id}::${pipeline.event_id}`,
          );
          if (!source) continue;

          const attendees = attendeesByMembership.get(membership.id) ?? [];
          const targetStageId = stageIds.has(membership.stage_id)
            ? membership.stage_id
            : firstStage.id;
          companiesByStage.get(targetStageId)?.push({
            ...source,
            key: `gala:${membership.id}`,
            membershipId: membership.id,
            dinnerAttendeeCount: attendees.length,
            hasAllergens: attendees.some((attendee) => Boolean(attendee.allergens?.trim())),
          });
        }
      } else if (firstStage) {
        for (const company of sourceCompanies) {
          const savedStageId = positions.get(`${pipeline.id}::${company.key}`);
          const legacyStageId = pipeline.is_default
            ? stageByName.get(company.legacyPipelineStage)
            : undefined;
          const targetStageId =
            legacyStageId ??
            (savedStageId && stageIds.has(savedStageId) ? savedStageId : firstStage.id);
          companiesByStage.get(targetStageId)?.push(company);
        }
      }

      return {
        id: pipeline.id,
        name: pipeline.name,
        position: pipeline.position,
        is_default: pipeline.is_default,
        kind: pipeline.kind,
        event_id: pipeline.event_id,
        stages: stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          position: stage.position,
          companies: (companiesByStage.get(stage.id) ?? []).sort((a, b) =>
            a.company.localeCompare(b.company, "nb"),
          ),
        })),
        totalAttendees: Array.from(companiesByStage.values())
          .flat()
          .reduce((total, company) => total + company.dinnerAttendeeCount, 0),
        availableCompanies:
          pipeline.kind === "gala_dinner" && pipeline.event_id
            ? configuration.participants
                .filter((participant) => participant.eventId === pipeline.event_id)
                .filter(
                  (participant) =>
                    !configuration.galaCompanies.some(
                      (membership) =>
                        membership.pipeline_id === pipeline.id &&
                        membership.company_id === participant.companyId &&
                        membership.is_active,
                    ),
                )
                .map((participant) => ({
                  companyId: participant.companyId,
                  company: participant.company,
                  packageTier: participant.packageTier,
                }))
                .sort((a, b) => a.company.localeCompare(b.company, "nb"))
            : [],
      };
    })
    .sort((a, b) => a.position - b.position);
}

export async function createCrmPipeline(name: string, stageNames: string[]) {
  const supabase = createAdminSupabaseClient();
  const { data: existing } = await supabase
    .from("crm_pipelines")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  const position = ((existing?.[0] as Pick<PipelineRow, "position"> | undefined)?.position ?? -1) + 1;

  const { data: pipeline, error: pipelineError } = await supabase
    .from("crm_pipelines")
    .insert({ name, position })
    .select("*")
    .single();
  if (pipelineError || !pipeline) {
    throw new Error(`Kunne ikke opprette pipeline: ${pipelineError?.message ?? "Ukjent feil"}`);
  }

  const { error: stageError } = await supabase.from("crm_pipeline_stages").insert(
    stageNames.map((stageName, stagePosition) => ({
      pipeline_id: pipeline.id,
      name: stageName,
      position: stagePosition,
    })),
  );

  if (stageError) {
    await supabase.from("crm_pipelines").delete().eq("id", pipeline.id);
    throw new Error(`Kunne ikke opprette pipelinekolonner: ${stageError.message}`);
  }
}

export async function renameCrmPipeline(pipelineId: string, name: string) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("crm_pipelines").update({ name }).eq("id", pipelineId);
  if (error) throw new Error(`Kunne ikke endre pipeline: ${error.message}`);
}

export async function deleteCrmPipeline(pipelineId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: pipeline, error: lookupError } = await supabase
    .from("crm_pipelines")
    .select("is_default")
    .eq("id", pipelineId)
    .single();
  if (lookupError || !pipeline) throw new Error("Fant ikke pipelinen.");
  if (pipeline.is_default) throw new Error("Standardpipelinen kan ikke slettes.");

  const { error } = await supabase.from("crm_pipelines").delete().eq("id", pipelineId);
  if (error) throw new Error(`Kunne ikke slette pipeline: ${error.message}`);
}

export async function addCrmPipelineStage(pipelineId: string, name: string) {
  const supabase = createAdminSupabaseClient();
  const { data: existing, error: lookupError } = await supabase
    .from("crm_pipeline_stages")
    .select("position")
    .eq("pipeline_id", pipelineId)
    .order("position", { ascending: false })
    .limit(1);
  if (lookupError) throw new Error(`Kunne ikke laste pipelinekolonner: ${lookupError.message}`);

  const position = ((existing?.[0] as Pick<StageRow, "position"> | undefined)?.position ?? -1) + 1;
  const { error } = await supabase
    .from("crm_pipeline_stages")
    .insert({ pipeline_id: pipelineId, name, position });
  if (error) throw new Error(`Kunne ikke legge til kolonne: ${error.message}`);
}

export async function renameCrmPipelineStage(stageId: string, name: string) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("crm_pipeline_stages").update({ name }).eq("id", stageId);
  if (error) throw new Error(`Kunne ikke endre kolonnenavn: ${error.message}`);
}

export async function deleteCrmPipelineStage(pipelineId: string, stageId: string) {
  const supabase = createAdminSupabaseClient();
  const { data, error: lookupError } = await supabase
    .from("crm_pipeline_stages")
    .select("id, position")
    .eq("pipeline_id", pipelineId)
    .order("position", { ascending: true });
  if (lookupError) throw new Error(`Kunne ikke laste pipelinekolonner: ${lookupError.message}`);

  const stages = (data ?? []) as Array<Pick<StageRow, "id" | "position">>;
  if (stages.length <= 1) throw new Error("En pipeline må ha minst én kolonne.");
  if (!stages.some((stage) => stage.id === stageId)) throw new Error("Fant ikke kolonnen.");

  const fallbackStage = stages.find((stage) => stage.id !== stageId);
  if (!fallbackStage) throw new Error("Fant ingen kolonne å flytte bedriftene til.");

  const { error: moveError } = await supabase
    .from("crm_pipeline_company_positions")
    .update({ stage_id: fallbackStage.id })
    .eq("pipeline_id", pipelineId)
    .eq("stage_id", stageId);
  if (moveError) throw new Error(`Kunne ikke flytte bedriftene: ${moveError.message}`);

  const { error: galaMoveError } = await supabase
    .from("crm_gala_dinner_companies")
    .update({ stage_id: fallbackStage.id })
    .eq("pipeline_id", pipelineId)
    .eq("stage_id", stageId);
  if (galaMoveError) throw new Error(`Kunne ikke flytte middagsbedriftene: ${galaMoveError.message}`);

  const { error } = await supabase.from("crm_pipeline_stages").delete().eq("id", stageId);
  if (error) throw new Error(`Kunne ikke slette kolonnen: ${error.message}`);
}

export async function moveCrmPipelineCompany(input: {
  pipelineId: string;
  stageId: string;
  companyKey: string;
  companyId: string | null;
  eventId: string | null;
  company: string;
  eventName: string;
}) {
  const supabase = createAdminSupabaseClient();
  const [{ data: pipeline, error: pipelineError }, { data: stage, error: stageError }] =
    await Promise.all([
      supabase
        .from("crm_pipelines")
        .select("id, is_default, kind")
        .eq("id", input.pipelineId)
        .single(),
      supabase
        .from("crm_pipeline_stages")
        .select("id, name, pipeline_id")
        .eq("id", input.stageId)
        .eq("pipeline_id", input.pipelineId)
        .single(),
    ]);
  if (pipelineError || !pipeline) throw new Error("Fant ikke pipelinen.");
  if (stageError || !stage) throw new Error("Fant ikke pipelinekolonnen.");

  if (pipeline.kind === "gala_dinner") {
    if (!input.companyId) throw new Error("Bedriften mangler ID.");
    const { data: membership, error: membershipError } = await supabase
      .from("crm_gala_dinner_companies")
      .update({ stage_id: input.stageId })
      .eq("pipeline_id", input.pipelineId)
      .eq("company_id", input.companyId)
      .eq("is_active", true)
      .select("id")
      .maybeSingle();
    if (membershipError || !membership) throw new Error("Fant ikke middagsbedriften i pipelinen.");
    return;
  }

  const { error } = await supabase.from("crm_pipeline_company_positions").upsert(
    {
      pipeline_id: input.pipelineId,
      stage_id: input.stageId,
      company_key: input.companyKey,
      company_id: input.companyId,
      event_id: input.eventId,
      company_name: input.company,
      event_name: input.eventName,
    },
    { onConflict: "pipeline_id,company_key" },
  );
  if (error) throw new Error(`Kunne ikke flytte bedriften: ${error.message}`);

  if (pipeline.is_default) {
    const legacyStage = normalizePipelineStage(stage.name);
    if (legacyStage) {
      await syncCompanyEventPipelineStage(input.company, input.eventName, legacyStage);
    }
  }
}
