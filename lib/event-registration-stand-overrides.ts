export type PublicStandBookingPreviewOverride = {
  companyName: string;
  logoUrl: string | null;
  candidateSummary: string | null;
  candidateLevelLabel: string | null;
};

type PublicStandLike = {
  id: string;
  stand_code: string;
  status: "available" | "disabled" | "assigned";
  assigned_application_id: string | null;
  bookingPreview?: PublicStandBookingPreviewOverride | null;
};

const STUDENT_CONNECT_2026_HIDDEN_STANDS = new Set([
  "Standard 1",
  "Standard 2",
  "Standard 3",
  "Standard 4",
  "Standard 5",
  "Standard 6",
  "Standard 7",
]);

const STUDENT_CONNECT_2026_BOOKED_OVERRIDES = new Map<string, PublicStandBookingPreviewOverride>([
  [
    "Standard 20",
    {
      companyName: "Tieto",
      logoUrl: null,
      candidateSummary: null,
      candidateLevelLabel: null,
    },
  ],
]);

export function applyPublicRegistrationStandOverrides<T extends PublicStandLike>(slug: string, stands: T[]): T[] {
  if (slug !== "student-connect-2026") {
    return stands;
  }

  return stands
    .filter((stand) => !STUDENT_CONNECT_2026_HIDDEN_STANDS.has(stand.stand_code))
    .map((stand) => {
      const bookingPreview = STUDENT_CONNECT_2026_BOOKED_OVERRIDES.get(stand.stand_code);
      if (!bookingPreview) {
        return stand;
      }

      return {
        ...stand,
        status: "assigned",
        bookingPreview,
      };
    });
}
