import { cache } from "react";
import type { TableRow } from "@/lib/types/database";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCompanyRegistrations, getLatestCompanyRegistrationLogos, hasPremiumPackageAccess } from "@/lib/company";

type OpportunityType = "job" | "thesis";
type CompanyOpportunity = TableRow<"company_opportunities">;

function getDateKeyInOslo(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getDeadlineKey(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function isOpportunityExpired(value: string | null | undefined, now = new Date()) {
  const deadlineKey = getDeadlineKey(value);
  if (!deadlineKey) return false;
  return deadlineKey < getDateKeyInOslo(now);
}

export function hasJobPublishingAccessForRegistration(input: {
  package: string | null | undefined;
  can_publish_jobs?: boolean | null;
}) {
  return hasPremiumPackageAccess(input.package) || Boolean(input.can_publish_jobs);
}

export function hasThesisPublishingAccessForRegistration(input: {
  package: string | null | undefined;
  can_publish_thesis?: boolean | null;
}) {
  return hasPremiumPackageAccess(input.package) || Boolean(input.can_publish_thesis);
}

export const getCompanyOpportunityAccess = cache(async function getCompanyOpportunityAccess(companyId: string) {
  const registrations = await getCompanyRegistrations(companyId);
  const hasAnyRegistrations = registrations.length > 0;

  const jobPublishingEnabled = registrations.some((registration) => hasJobPublishingAccessForRegistration(registration));
  const thesisPublishingEnabled = registrations.some((registration) =>
    hasThesisPublishingAccessForRegistration(registration),
  );

  return {
    hasAnyRegistrations,
    registrations,
    jobPublishingEnabled,
    thesisPublishingEnabled,
  };
});

export async function listCompanyOpportunities(companyId: string, opportunityType: OpportunityType) {
  let supabase = await createServerSupabaseClient();
  try {
    supabase = createAdminSupabaseClient() as unknown as typeof supabase;
  } catch {
    // fallback
  }

  const { data, error } = await supabase
    .from("company_opportunities")
    .select("*")
    .eq("company_id", companyId)
    .eq("opportunity_type", opportunityType)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CompanyOpportunity[];
}

export async function listPublishedOpportunities(opportunityType: OpportunityType) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("company_opportunities")
    .select("*, company:companies(id, name)")
    .eq("opportunity_type", opportunityType)
    .eq("is_published", true)
    .order("application_deadline", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const typedRows = (data ?? []) as Array<
    CompanyOpportunity & {
      company?: { id: string; name: string } | null;
    }
  >;
  const activeRows = typedRows.filter((row) => !isOpportunityExpired(row.application_deadline));

  const logos = await getLatestCompanyRegistrationLogos(
    activeRows.map((row) => row.company_id).filter(Boolean),
  );

  return activeRows.map((row) => ({
    ...row,
    companyName: row.company?.name ?? "Company",
    logoUrl: logos[row.company_id] ?? null,
  }));
}

export function formatOpportunityDeadline(value: string | null) {
  if (!value) return "Open deadline";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Open deadline";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getOpportunityStudySummary(opportunity: Pick<CompanyOpportunity, "field_tags" | "levels">) {
  const fields = opportunity.field_tags?.filter(Boolean) ?? [];
  const levels = opportunity.levels?.filter(Boolean) ?? [];
  return {
    fieldsLabel: fields.length > 0 ? fields.join(", ") : "Open for multiple study directions",
    levelsLabel: levels.length > 0 ? levels.join(", ") : "Bachelor and Master",
  };
}

export function getOpportunityPrimaryAction(
  opportunity: Pick<CompanyOpportunity, "application_url" | "contact_email" | "title">,
  mode: OpportunityType,
) {
  if (opportunity.application_url) {
    return {
      href: opportunity.application_url,
      label: "View details",
      external: true,
    };
  }
  if (opportunity.contact_email) {
    const subject = encodeURIComponent(
      mode === "job" ? `Application for ${opportunity.title}` : `Interest in ${opportunity.title}`,
    );
    return {
      href: `mailto:${opportunity.contact_email}?subject=${subject}`,
      label: mode === "job" ? "Send your application" : "Contact company",
      external: false,
    };
  }
  return null;
}

export function matchesOpportunityFilters(
  opportunity: Pick<CompanyOpportunity, "field_tags" | "location" | "engagement_types" | "levels">,
  filters: {
    fields: string[];
    locations: string[];
    engagements: string[];
    levels: string[];
  },
) {
  const location = opportunity.location?.trim();
  const fieldsMatch =
    filters.fields.length === 0 ||
    filters.fields.some((field) => (opportunity.field_tags ?? []).includes(field));
  const locationMatch =
    filters.locations.length === 0 ||
    (location ? filters.locations.some((selected) => selected.toLowerCase() === location.toLowerCase()) : false);
  const engagementMatch =
    filters.engagements.length === 0 ||
    filters.engagements.some((engagement) => (opportunity.engagement_types ?? []).includes(engagement));
  const levelMatch =
    filters.levels.length === 0 ||
    filters.levels.some((level) => (opportunity.levels ?? []).includes(level));

  return fieldsMatch && locationMatch && engagementMatch && levelMatch;
}
