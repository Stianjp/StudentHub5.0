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

type StandGeometry = Pick<PublicStandLike, "x" | "y" | "width" | "height">;
type SvgRect = { x: number; y: number; width: number; height: number };

const STUDENT_CONNECT_2026_SVG_VIEWBOX = {
  width: 344.25,
  height: 656.25,
} as const;

function svgRectToPercent(rect: SvgRect): StandGeometry {
  return {
    x: Number(((rect.x / STUDENT_CONNECT_2026_SVG_VIEWBOX.width) * 100).toFixed(2)),
    y: Number(((rect.y / STUDENT_CONNECT_2026_SVG_VIEWBOX.height) * 100).toFixed(2)),
    width: Number(((rect.width / STUDENT_CONNECT_2026_SVG_VIEWBOX.width) * 100).toFixed(2)),
    height: Number(((rect.height / STUDENT_CONNECT_2026_SVG_VIEWBOX.height) * 100).toFixed(2)),
  };
}

// These three rectangles come directly from the original Student Connect 2026 floorplan SVG.
// Use the outer booth border geometry, not the inner fill, so the clickable footprint hugs the
// drawn stand edge as closely as possible beneath Innovation room.
export const STUDENT_CONNECT_2026_STANDARD_TOP_RIGHT_OVERRIDES = {
  "Standard 4": svgRectToPercent({ x: 282.26, y: 185.26, width: 12.27, height: 20.12 }),
  "Standard 5": svgRectToPercent({ x: 308.19, y: 194.86, width: 20.12, height: 12.56 }),
  "Standard 6": svgRectToPercent({ x: 308.04, y: 215.8, width: 20.12, height: 12.28 }),
} satisfies Record<string, StandGeometry>;

const STUDENT_CONNECT_2026_HIDDEN_STANDS = new Set([
  "Standard 1",
  "Standard 2",
  "Standard 3",
  "Standard 7",
]);

const STUDENT_CONNECT_2026_POSITION_OVERRIDES = new Map<
  string,
  StandGeometry
>(Object.entries(STUDENT_CONNECT_2026_STANDARD_TOP_RIGHT_OVERRIDES));

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
