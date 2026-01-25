import type { TableRow } from "@/lib/types/database";

type StudentPublic = TableRow<"student_public_profiles">;
type Company = TableRow<"companies">;

export type MatchReason = {
  label: string;
  score: number;
  details: string;
};

export type MatchResult = {
  score: number;
  reasons: MatchReason[];
};

const WEIGHTS = {
  studyField: 0.4,
  jobType: 0.2,
  values: 0.2,
  location: 0.1,
  liked: 0.1,
} as const;

function overlapScore(a: string[] | null | undefined, b: string[] | null | undefined) {
  const setA = new Set((a ?? []).map((v) => v.toLowerCase()));
  const setB = new Set((b ?? []).map((v) => v.toLowerCase()));
  if (setA.size === 0 || setB.size === 0) return 0;

  let matches = 0;
  setA.forEach((value) => {
    if (setB.has(value)) matches += 1;
  });

  return matches / Math.max(setA.size, setB.size);
}

function locationScore(student: StudentPublic, company: Company) {
  const preferred = (student.preferred_locations ?? []).map((v) => v.toLowerCase());
  const companyLocation = company.location?.toLowerCase();

  if (!companyLocation) return 0;
  if (preferred.includes(companyLocation)) return 1;
  if (student.willing_to_relocate) return 0.6;
  return 0.1;
}

export function computeMatch(student: StudentPublic, company: Company): MatchResult {
  const studyScore = overlapScore(student.interests, company.recruitment_fields);
  const jobScore = overlapScore(student.job_types, company.recruitment_job_types);
  const valuesScore = overlapScore(student.values, company.branding_values);
  const locScore = locationScore(student, company);
  const likedScore = (student.liked_company_ids ?? []).includes(company.id) ? 1 : 0;

  const weighted =
    studyScore * WEIGHTS.studyField +
    jobScore * WEIGHTS.jobType +
    valuesScore * WEIGHTS.values +
    locScore * WEIGHTS.location +
    likedScore * WEIGHTS.liked;

  const reasons: MatchReason[] = [
    {
      label: "Studieretning/interesser",
      score: studyScore,
      details:
        studyScore > 0
          ? "Studentens interesser overlapper med bedriftens behov."
          : "Lite overlapp mellom interesser og behov.",
    },
    {
      label: "Jobbtype",
      score: jobScore,
      details:
        jobScore > 0
          ? "Studentens ønskede jobbtyper matcher bedriftens roller."
          : "Jobbtyper matcher svakt.",
    },
    {
      label: "Verdier og kultur",
      score: valuesScore,
      details:
        valuesScore > 0
          ? "Verdier overlapper mellom student og bedrift."
          : "Verdier overlapper lite.",
    },
    {
      label: "Lokasjon/flytting",
      score: locScore,
      details:
        locScore >= 0.6
          ? "Lokasjon ser ut til å fungere godt."
          : "Lokasjon kan være en begrensning.",
    },
    {
      label: "Student liker bedriften",
      score: likedScore,
      details: likedScore === 1 ? "Student har markert bedriften som favoritt." : "Ingen favorittmarkering.",
    },
  ];

  return {
    score: Math.round(weighted * 100),
    reasons,
  };
}
