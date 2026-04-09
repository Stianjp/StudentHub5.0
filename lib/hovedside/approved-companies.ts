import { unstable_cache } from "next/cache";
import type { Database } from "@/lib/types/database";

type RegistrationApplication =
  Database["public"]["Tables"]["event_registration_applications"]["Row"];

export type ApprovedCompanyPreview = {
  id: string;
  companyName: string;
  logoUrl: string | null;
  candidateLevelLabel: string | null;
  candidateSummary: string | null;
};

function hasRequiredEnv() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function candidateLevelLabel(
  value: RegistrationApplication["candidate_level"],
): string {
  if (value === "bachelor") return "Bachelor";
  if (value === "master") return "Master";
  return "Bachelor og master";
}

function buildCandidateSummary(
  fields: string[],
  fieldsOther: string | null,
): string | null {
  const all = [...fields];
  if (fieldsOther) all.push(fieldsOther);
  if (all.length === 0) return null;
  return all.slice(0, 4).join(", ");
}

const LOGO_BUCKET = "event-registration-assets";

async function fetchApprovedCompanies(
  campaignSlug: string,
): Promise<ApprovedCompanyPreview[]> {
  if (!hasRequiredEnv()) return [];

  const { createAdminSupabaseClient } = await import(
    "@/lib/supabase/admin"
  );

  const supabase = createAdminSupabaseClient();

  // Find the campaign by slug
  const { data: campaign } = await supabase
    .from("event_registration_campaigns")
    .select("id")
    .eq("slug", campaignSlug)
    .single();

  if (!campaign) return [];

  type AppRow = Pick<
    RegistrationApplication,
    | "id"
    | "company_name"
    | "logo_path"
    | "candidate_level"
    | "candidate_fields"
    | "candidate_fields_other"
  >;

  // Get approved applications for this campaign
  const { data: applications } = await supabase
    .from("event_registration_applications")
    .select(
      "id, company_name, logo_path, candidate_level, candidate_fields, candidate_fields_other",
    )
    .eq("campaign_id", campaign.id)
    .eq("status", "approved")
    .order("approved_at", { ascending: true });

  if (!applications || applications.length === 0) return [];

  // Build previews with signed logo URLs
  const previews: ApprovedCompanyPreview[] = await Promise.all(
    (applications as AppRow[]).map(async (app) => {
      let logoUrl: string | null = null;
      if (app.logo_path) {
        const { data } = await supabase.storage
          .from(LOGO_BUCKET)
          .createSignedUrl(app.logo_path, 3600);
        logoUrl = data?.signedUrl ?? null;
      }

      return {
        id: app.id,
        companyName: app.company_name,
        logoUrl,
        candidateLevelLabel: candidateLevelLabel(app.candidate_level),
        candidateSummary: buildCandidateSummary(
          app.candidate_fields,
          app.candidate_fields_other,
        ),
      };
    }),
  );

  return previews;
}

export const getApprovedCompaniesForCampaign = unstable_cache(
  fetchApprovedCompanies,
  ["approved-companies"],
  { revalidate: 300 },
);
