import type { TableRow } from "@/lib/types/database";
import type { PublicRegistrationStand } from "@/lib/event-registration";
import { applyPublicRegistrationStandOverrides } from "@/lib/event-registration-stand-overrides";

type EventRow = TableRow<"events">;
type RegistrationCampaign = TableRow<"event_registration_campaigns">;
type RegistrationPackage = TableRow<"event_registration_packages">;
type RegistrationStand = TableRow<"event_registration_stands">;

export type RegistrationPackageTier = RegistrationStand["package_tier"];

export type PreviewRegistrationCampaign = RegistrationCampaign & {
  event: Pick<EventRow, "id" | "name" | "slug" | "starts_at" | "ends_at" | "location" | "registration_form_url">;
};

export type PreviewRegistrationDetail = {
  campaign: PreviewRegistrationCampaign;
  packages: RegistrationPackage[];
  stands: PublicRegistrationStand[];
};

export const STUDENT_CONNECT_2026_FLOORPLAN = {
  imagePath: "/event-register/student-connect-2026-floorplan.svg",
  width: 344.25,
  height: 656.25,
  alt: "Student Connect 2026 floor plan",
} as const;

export const REGISTRATION_PACKAGE_TIERS = ["standard", "silver", "gold", "platinum"] as const;

const FIXTURE_TIMESTAMP = "2026-01-15T12:00:00.000Z";
const FIXTURE_EVENT_ID = "fixture-event-student-connect-2026";
const FIXTURE_CAMPAIGN_ID = "fixture-campaign-student-connect-2026";

const FIXTURE_EVENT: Pick<EventRow, "id" | "name" | "slug" | "starts_at" | "ends_at" | "location" | "registration_form_url"> = {
  id: FIXTURE_EVENT_ID,
  name: "Student Connect 2026",
  slug: "student-connect-2026",
  starts_at: "2026-09-10T08:00:00.000Z",
  ends_at: "2026-09-10T16:00:00.000Z",
  location: "Oslo",
  registration_form_url: "/event-register/student-connect-2026",
};

const FIXTURE_CAMPAIGN: PreviewRegistrationCampaign = {
  id: FIXTURE_CAMPAIGN_ID,
  event_id: FIXTURE_EVENT_ID,
  slug: "student-connect-2026",
  public_title: "Student Connect 2026",
  public_subtitle: "Organized by Oslo Student Hub",
  public_description:
    "Register your company for Student Connect 2026 by Oslo Student Hub. Choose your package, request your stand and add the team members who need portal access.",
  floorplan_image_path: STUDENT_CONNECT_2026_FLOORPLAN.imagePath,
  email_group_prefix: "SC26",
  is_published: true,
  opens_at: "2026-01-01T00:00:00.000Z",
  closes_at: null,
  created_at: FIXTURE_TIMESTAMP,
  updated_at: FIXTURE_TIMESTAMP,
  event: FIXTURE_EVENT,
};

function buildPackage(
  packageKey: string,
  publicName: string,
  description: string,
  mappedPackage: RegistrationPackage["mapped_package"],
  internalCapacity: number | null,
  sortOrder: number,
): RegistrationPackage {
  return {
    id: `fixture-package-${packageKey}`,
    campaign_id: FIXTURE_CAMPAIGN_ID,
    package_key: packageKey,
    public_name: publicName,
    description,
    mapped_package: mappedPackage,
    internal_capacity: internalCapacity,
    is_active: true,
    sort_order: sortOrder,
    created_at: FIXTURE_TIMESTAMP,
    updated_at: FIXTURE_TIMESTAMP,
  };
}

function buildStand(
  standCode: string,
  packageTier: RegistrationPackageTier,
  x: number,
  y: number,
  width: number,
  height: number,
  sortOrder: number,
  status: RegistrationStand["status"] = "available",
): RegistrationStand {
  return {
    id: `fixture-stand-${standCode.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    campaign_id: FIXTURE_CAMPAIGN_ID,
    stand_code: standCode,
    display_label: standCode,
    package_tier: packageTier,
    x,
    y,
    width,
    height,
    sort_order: sortOrder,
    status,
    assigned_application_id: null,
    created_at: FIXTURE_TIMESTAMP,
    updated_at: FIXTURE_TIMESTAMP,
  };
}

const FIXTURE_PACKAGES: RegistrationPackage[] = [
  buildPackage("platinum", "Platinum", "Top-tier placement with maximum visibility.", "platinum", 4, 10),
  buildPackage("gold", "Gold", "Large stand placement with strong event visibility.", "gold", 20, 20),
  buildPackage("silver", "Silver", "Solid placement and access to the fair.", "silver", 30, 30),
  buildPackage("standard", "Standard", "Standard package for participating companies.", "standard", null, 40),
];

const FIXTURE_STANDS: RegistrationStand[] = [
  buildStand("Platinum 1", "platinum", 13.98, 39.89, 12.5, 3.94, 10),
  buildStand("Platinum 2", "platinum", 27.44, 39.94, 13.14, 3.94, 20),
  buildStand("Platinum 3", "platinum", 41.31, 39.94, 13.56, 4.0, 30),
  buildStand("Platinum 4", "platinum", 55.3, 40.0, 13.67, 4.0, 40),

  buildStand("Gold 5", "gold", 20.44, 46.44, 7.63, 5.56, 50),
  buildStand("Gold 6", "gold", 28.5, 46.39, 7.63, 5.61, 60),
  buildStand("Gold 7", "gold", 42.37, 46.44, 7.63, 5.61, 70),
  buildStand("Gold 8", "gold", 50.32, 46.44, 7.63, 5.56, 80),
  buildStand("Gold 1", "gold", 7.63, 61.56, 10.7, 4.0, 260),
  buildStand("Gold 2", "gold", 22.78, 61.39, 10.7, 4.0, 270),
  buildStand("Gold 3", "gold", 39.09, 61.44, 10.7, 4.0, 280),
  buildStand("Gold 4", "gold", 55.93, 61.44, 10.7, 4.0, 290),

  buildStand("Silver 1", "silver", 8.26, 45.78, 5.72, 2.89, 90),
  buildStand("Silver 2", "silver", 8.26, 48.78, 5.61, 3.0, 100),
  buildStand("Silver 3", "silver", 8.26, 51.89, 5.61, 2.94, 110),
  buildStand("Silver 4", "silver", 8.16, 54.94, 5.72, 3.0, 120),
  buildStand("Silver 5", "silver", 8.16, 58.06, 5.72, 2.94, 130),
  buildStand("Silver 6", "silver", 22.25, 52.22, 5.72, 3.0, 140),
  buildStand("Silver 7", "silver", 28.28, 52.17, 5.72, 3.0, 150),
  buildStand("Silver 8", "silver", 22.25, 55.33, 5.72, 3.0, 160),
  buildStand("Silver 9", "silver", 28.28, 55.28, 5.61, 2.94, 170),
  buildStand("Silver 10", "silver", 44.28, 52.11, 5.72, 2.94, 180),
  buildStand("Silver 11", "silver", 44.28, 55.17, 5.61, 3.0, 190),
  buildStand("Silver 12", "silver", 50.42, 52.11, 5.61, 3.0, 200),
  buildStand("Silver 13", "silver", 50.32, 55.22, 5.72, 2.94, 210),
  buildStand("Silver 14", "silver", 66.0, 46.0, 5.61, 2.94, 220),
  buildStand("Silver 15", "silver", 66.0, 49.06, 5.61, 3.0, 230),
  buildStand("Silver 16", "silver", 66.0, 52.28, 5.72, 3.0, 240),
  buildStand("Silver 17", "silver", 66.0, 55.39, 5.72, 2.94, 250),
  buildStand("Silver 18", "silver", 41.21, 68.06, 5.61, 3.0, 300),
  buildStand("Silver 19", "silver", 47.35, 68.06, 5.72, 3.0, 310),
  buildStand("Silver 20", "silver", 59.0, 68.11, 5.61, 3.0, 320),

  buildStand("Standard 1", "standard", 78.18, 19.61, 5.61, 1.83, 10),
  buildStand("Standard 2", "standard", 84.22, 19.67, 5.72, 1.78, 20),
  buildStand("Standard 3", "standard", 90.47, 21.56, 3.5, 2.94, 30),
  buildStand("Standard 4", "standard", 81.97, 28.31, 3.62, 3.07, 40),
  buildStand("Standard 5", "standard", 89.54, 29.7, 5.84, 1.9, 50),
  buildStand("Standard 6", "standard", 89.45, 32.87, 5.84, 1.9, 60),
  buildStand("Standard 7", "standard", 90.57, 32.33, 3.5, 3.0, 70),
  buildStand("Standard 8", "standard", 79.98, 35.17, 3.39, 3.0, 80),
  buildStand("Standard 9", "standard", 90.36, 37.39, 3.6, 2.94, 90),
  buildStand("Standard 10", "standard", 90.36, 40.44, 3.5, 2.94, 100),
  buildStand("Standard 11", "standard", 79.98, 43.67, 3.5, 3.0, 110),
  buildStand("Standard 12", "standard", 90.15, 45.89, 3.5, 3.0, 120),
  buildStand("Standard 13", "standard", 90.15, 49.11, 3.5, 3.0, 130),
  buildStand("Standard 14", "standard", 41.31, 71.22, 5.61, 1.83, 140),
  buildStand("Standard 15", "standard", 47.25, 71.28, 5.61, 1.78, 150),
  buildStand("Standard 16", "standard", 53.18, 71.28, 5.61, 1.78, 160),
  buildStand("Standard 17", "standard", 59.11, 71.28, 5.61, 1.78, 170),
  buildStand("Standard 18", "standard", 66.84, 74.56, 3.6, 3.06, 180),
  buildStand("Standard 19", "standard", 66.53, 77.67, 3.6, 3.06, 190),
  buildStand("Standard 20", "standard", 56.14, 81.72, 6.46, 3.06, 200),
];

export function isPreviewRegistrationSlug(slug: string) {
  return slug === FIXTURE_CAMPAIGN.slug;
}

export function isRegistrationPackageTier(value: string): value is RegistrationPackageTier {
  return REGISTRATION_PACKAGE_TIERS.includes(value as RegistrationPackageTier);
}

export function listPreviewRegistrationCampaigns(): PreviewRegistrationCampaign[] {
  return [{ ...FIXTURE_CAMPAIGN, event: { ...FIXTURE_EVENT } }];
}

export function getPreviewRegistrationDetail(slug: string): PreviewRegistrationDetail | null {
  if (!isPreviewRegistrationSlug(slug)) {
    return null;
  }

  return {
    campaign: { ...FIXTURE_CAMPAIGN, event: { ...FIXTURE_EVENT } },
    packages: FIXTURE_PACKAGES.map((pkg) => ({ ...pkg })),
    stands: applyPublicRegistrationStandOverrides(
      slug,
      FIXTURE_STANDS.map((stand) => ({ ...stand, bookingPreview: null })) as PublicRegistrationStand[],
    ),
  };
}
