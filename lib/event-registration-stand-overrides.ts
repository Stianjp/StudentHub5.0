export type PublicStandBookingPreviewOverride = {
  companyName: string;
  logoUrl: string | null;
  candidateSummary: string | null;
  candidateLevelLabel: string | null;
  representationText: string | null;
};

type PublicStandLike = {
  id: string;
  stand_code: string;
  status: "available" | "disabled" | "assigned";
  assigned_application_id: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  bookingPreview?: PublicStandBookingPreviewOverride | null;
};

const STUDENT_CONNECT_2026_SLUG = "student-connect-2026";
const GRUNDERSKOLEN_STAND_CODE = "Standard 21";
const GRUNDERSKOLEN_LOGO_URL = "/StudentConnect-site/Grunderskolen-logo.png";

export function applyPublicRegistrationStandOverrides<T extends PublicStandLike>(slug: string, stands: T[]): T[] {
  if (slug !== STUDENT_CONNECT_2026_SLUG) return stands;

  return stands.map((stand) => {
    if (stand.stand_code !== GRUNDERSKOLEN_STAND_CODE) return stand;

    return {
      ...stand,
      bookingPreview: {
        companyName: "Gründerskolen",
        logoUrl: GRUNDERSKOLEN_LOGO_URL,
        candidateSummary: stand.bookingPreview?.candidateSummary ?? "Ledelse",
        candidateLevelLabel: stand.bookingPreview?.candidateLevelLabel ?? "Bachelor og master",
        representationText:
          stand.bookingPreview?.representationText ??
          "Gründerskolen møter studenter og unge profesjonelle på Student Connect 2026.",
      },
    };
  });
}
