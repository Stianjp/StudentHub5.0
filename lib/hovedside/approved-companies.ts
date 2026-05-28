import { unstable_cache } from "next/cache";
import {
  PUBLIC_LOGO_URL_TTL_SECONDS,
  getLatestCompanyRegistrationLogosByIdentifiers,
} from "@/lib/company";
import type { Database } from "@/lib/types/database";

type RegistrationApplication =
  Database["public"]["Tables"]["event_registration_applications"]["Row"];
type RegistrationPackage =
  Database["public"]["Tables"]["event_registration_packages"]["Row"];
type RegistrationStand =
  Database["public"]["Tables"]["event_registration_stands"]["Row"];
type Company = Database["public"]["Tables"]["companies"]["Row"];

export type ApprovedCompanyPackageTier =
  | "platinum"
  | "gold"
  | "silver"
  | "standard";

export type ApprovedCompanyPreview = {
  id: string;
  companyName: string;
  logoUrl: string | null;
  candidateLevelLabel: string | null;
  candidateFields: string[];
  candidateSummary: string | null;
  representationText: string | null;
  packageTier: ApprovedCompanyPackageTier;
  packageLabel: string;
  standLabel: string | null;
};

const LOGO_BUCKET = "event-registration-assets";
const PACKAGE_ORDER: Record<ApprovedCompanyPackageTier, number> = {
  platinum: 4,
  gold: 3,
  silver: 2,
  standard: 1,
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

function normalizeOrgNumber(value: string) {
  return value.replace(/\s+/g, "");
}

function normalizePackageTier(
  value: RegistrationPackage["mapped_package"] | null | undefined,
): ApprovedCompanyPackageTier {
  if (value === "platinum") return "platinum";
  if (value === "gold") return "gold";
  if (value === "silver") return "silver";
  return "standard";
}

function packageLabelFromTier(tier: ApprovedCompanyPackageTier) {
  if (tier === "platinum") return "Platinum";
  if (tier === "gold") return "Gold";
  if (tier === "silver") return "Silver";
  return "Standard";
}

async function fetchApprovedCompanies(
  campaignSlug: string,
): Promise<ApprovedCompanyPreview[]> {
  if (!hasRequiredEnv()) return [];

  const { createAdminSupabaseClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminSupabaseClient();

  const { data: campaign } = await supabase
    .from("event_registration_campaigns")
    .select("id")
    .eq("slug", campaignSlug)
    .single();

  if (!campaign) return [];

  type AppRow = Pick<
    RegistrationApplication,
    | "id"
    | "company_id"
    | "company_name"
    | "org_number"
    | "logo_path"
    | "candidate_level"
    | "candidate_fields"
    | "candidate_fields_other"
    | "approved_package_id"
    | "requested_package_id"
    | "approved_stand_id"
    | "requested_stand_id"
  >;

  const { data: applications } = await supabase
    .from("event_registration_applications")
    .select(
      "id, company_id, company_name, org_number, logo_path, candidate_level, candidate_fields, candidate_fields_other, approved_package_id, requested_package_id, approved_stand_id, requested_stand_id",
    )
    .eq("campaign_id", campaign.id)
    .eq("status", "approved")
    .order("approved_at", { ascending: true });

  if (!applications || applications.length === 0) return [];

  const typedApplications = applications as AppRow[];
  const packageIds = [
    ...new Set(
      typedApplications
        .flatMap((app) => [app.approved_package_id, app.requested_package_id])
        .filter(Boolean),
    ),
  ] as string[];
  const standIds = [
    ...new Set(
      typedApplications
        .flatMap((app) => [app.approved_stand_id, app.requested_stand_id])
      .filter(Boolean),
    ),
  ] as string[];
  const companyIds = [
    ...new Set(typedApplications.map((app) => app.company_id).filter(Boolean)),
  ] as string[];
  const orgNumbers = [
    ...new Set(
      typedApplications
        .map((app) => app.org_number)
        .filter((orgNumber): orgNumber is string => Boolean(orgNumber))
        .map(normalizeOrgNumber),
    ),
  ];

  const [
    { data: packages },
    { data: stands },
    { data: companiesById },
    { data: companiesByOrgNumber },
  ] = await Promise.all([
    packageIds.length > 0
      ? supabase
          .from("event_registration_packages")
          .select("id, mapped_package, public_name")
          .in("id", packageIds)
      : Promise.resolve({
          data: [] as Pick<
            RegistrationPackage,
            "id" | "mapped_package" | "public_name"
          >[],
        }),
    standIds.length > 0
      ? supabase
          .from("event_registration_stands")
          .select("id, display_label, stand_code")
          .in("id", standIds)
      : Promise.resolve({
          data: [] as Pick<
            RegistrationStand,
            "id" | "display_label" | "stand_code"
          >[],
        }),
    companyIds.length > 0
      ? supabase
          .from("companies")
          .select("id, name, org_number, representation_text")
          .in("id", companyIds)
      : Promise.resolve({
          data: [] as Pick<Company, "id" | "name" | "org_number" | "representation_text">[],
        }),
    orgNumbers.length > 0
      ? supabase
          .from("companies")
          .select("id, name, org_number, representation_text")
          .in("org_number", orgNumbers)
      : Promise.resolve({
          data: [] as Pick<Company, "id" | "name" | "org_number" | "representation_text">[],
        }),
  ]);

  const packageMap = new Map(
    (
      (packages ?? []) as Pick<
        RegistrationPackage,
        "id" | "mapped_package" | "public_name"
      >[]
    ).map((pkg) => [pkg.id, pkg]),
  );
  const standMap = new Map(
    (
      (stands ?? []) as Pick<
        RegistrationStand,
        "id" | "display_label" | "stand_code"
      >[]
    ).map((stand) => [stand.id, stand]),
  );
  const companyRepresentationRows = [
    ...((companiesById ?? []) as Pick<
      Company,
      "id" | "name" | "org_number" | "representation_text"
    >[]),
    ...((companiesByOrgNumber ?? []) as Pick<
      Company,
      "id" | "name" | "org_number" | "representation_text"
    >[]),
  ];
  const companyNameByCompanyId = new Map(
    companyRepresentationRows.map((company) => [company.id, company.name?.trim() || null]),
  );
  const companyNameByOrgNumber = new Map(
    companyRepresentationRows
      .filter((company) => company.org_number)
      .map((company) => [
        normalizeOrgNumber(company.org_number as string),
        company.name?.trim() || null,
      ]),
  );
  const representationByCompanyId = new Map(
    companyRepresentationRows.map((company) => [
      company.id,
      company.representation_text?.trim() || null,
    ]),
  );
  const representationByOrgNumber = new Map(
    companyRepresentationRows
      .filter((company) => company.org_number)
      .map((company) => [
        normalizeOrgNumber(company.org_number as string),
        company.representation_text?.trim() || null,
      ]),
  );
  const companyLogoMap = await getLatestCompanyRegistrationLogosByIdentifiers(
    typedApplications.map((app) => ({
      companyId: app.company_id,
      orgNumber: app.org_number,
    })),
  );

  const previews: ApprovedCompanyPreview[] = await Promise.all(
    typedApplications.map(async (app) => {
      let logoUrl =
        (app.company_id ? companyLogoMap.byCompanyId[app.company_id] ?? null : null) ??
        (app.org_number
          ? companyLogoMap.byOrgNumber[app.org_number.replace(/\s+/g, "")] ?? null
          : null);
      if (!logoUrl && app.logo_path) {
        const { data } = await supabase.storage
          .from(LOGO_BUCKET)
          .createSignedUrl(app.logo_path, PUBLIC_LOGO_URL_TTL_SECONDS);
        logoUrl = data?.signedUrl ?? null;
      }

      const pkg =
        (app.approved_package_id
          ? packageMap.get(app.approved_package_id)
          : null) ??
        (app.requested_package_id
          ? packageMap.get(app.requested_package_id)
          : null) ??
        null;
      const stand =
        (app.approved_stand_id ? standMap.get(app.approved_stand_id) : null) ??
        (app.requested_stand_id
          ? standMap.get(app.requested_stand_id)
          : null) ??
        null;
      const packageTier = normalizePackageTier(pkg?.mapped_package);

      return {
        id: app.id,
        companyName:
          (app.company_id ? companyNameByCompanyId.get(app.company_id) ?? null : null) ??
          (app.org_number
            ? companyNameByOrgNumber.get(normalizeOrgNumber(app.org_number)) ?? null
            : null) ??
          app.company_name,
        logoUrl,
        candidateLevelLabel: candidateLevelLabel(app.candidate_level),
        candidateFields: app.candidate_fields,
        candidateSummary: buildCandidateSummary(
          app.candidate_fields,
          app.candidate_fields_other,
        ),
        representationText:
          (app.company_id
            ? representationByCompanyId.get(app.company_id) ?? null
            : null) ??
          (app.org_number
            ? representationByOrgNumber.get(normalizeOrgNumber(app.org_number)) ??
              null
            : null),
        packageTier,
        packageLabel: pkg?.public_name ?? packageLabelFromTier(packageTier),
        standLabel: stand?.display_label ?? stand?.stand_code ?? null,
      };
    }),
  );

  return previews.sort((left, right) => {
    const tierDelta =
      PACKAGE_ORDER[right.packageTier] - PACKAGE_ORDER[left.packageTier];
    if (tierDelta !== 0) return tierDelta;
    return left.companyName.localeCompare(right.companyName, "nb");
  });
}

export const getApprovedCompaniesForCampaign = unstable_cache(
  fetchApprovedCompanies,
  ["approved-companies"],
  { revalidate: 300, tags: ["approved-companies"] },
);
