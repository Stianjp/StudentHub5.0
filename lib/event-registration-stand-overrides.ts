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
  x: number;
  y: number;
  width: number;
  height: number;
  bookingPreview?: PublicStandBookingPreviewOverride | null;
};

const STUDENT_CONNECT_2026_HIDDEN_STANDS = new Set([
  "Standard 1",
  "Standard 2",
  "Standard 3",
  "Standard 7",
]);

const STUDENT_CONNECT_2026_POSITION_OVERRIDES = new Map<
  string,
  Pick<PublicStandLike, "x" | "y" | "width" | "height">
>([
  ["Standard 4", { x: 80.05, y: 24.28, width: 5.72, height: 1.83 }],
  ["Standard 5", { x: 91.0, y: 28.15, width: 1.83, height: 5.28 }],
  ["Standard 6", { x: 90.47, y: 24.72, width: 3.39, height: 2.94 }],
]);

export function applyPublicRegistrationStandOverrides<T extends PublicStandLike>(slug: string, stands: T[]): T[] {
  if (slug !== "student-connect-2026") {
    return stands;
  }

  return stands
    .filter((stand) => !STUDENT_CONNECT_2026_HIDDEN_STANDS.has(stand.stand_code))
    .map((stand) => {
      const override = STUDENT_CONNECT_2026_POSITION_OVERRIDES.get(stand.stand_code);
      return override ? { ...stand, ...override } : stand;
    });
}
