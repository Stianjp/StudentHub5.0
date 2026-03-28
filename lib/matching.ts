import type { TableRow } from "@/lib/types/database";
import { normalizeStudyCategories } from "@/lib/company-categories";

type StudentPublic = TableRow<"student_public_profiles">;
type Company = TableRow<"companies">;
export type StudentMatchProfile = Pick<
  StudentPublic,
  | "study_program"
  | "study_level"
  | "graduation_year"
  | "study_year"
  | "job_types"
  | "interests"
  | "values"
  | "preferred_locations"
  | "willing_to_relocate"
  | "liked_company_ids"
>;

export type MatchReason = {
  label: string;
  score: number;
  details: string;
};

export type MatchSignals = {
  studyFieldScore: number;
  jobTypeScore: number;
  valuesScore: number;
  locationScore: number;
  likedScore: number;
  levelScore: number;
  relevant: boolean;
};

export type MatchResult = {
  score: number;
  reasons: MatchReason[];
  signals: MatchSignals;
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

function locationScore(student: StudentMatchProfile, company: Company) {
  const preferred = (student.preferred_locations ?? []).map((v) => v.toLowerCase());
  const companyLocation = company.location?.toLowerCase();

  if (!companyLocation) return 0;
  if (preferred.includes(companyLocation)) return 1;
  if (student.willing_to_relocate) return 0.6;
  return 0.1;
}

function getStudentStudyCategories(student: StudentMatchProfile) {
  return normalizeStudyCategories([student.study_program, ...(student.interests ?? [])]);
}

function getCompanyStudyCategories(company: Company) {
  return normalizeStudyCategories(company.recruitment_fields ?? []);
}

function getStudentLevelScore(student: StudentMatchProfile, company: Company) {
  const requiredLevels = (company.recruitment_levels ?? []).map((level) => level.trim().toLowerCase()).filter(Boolean);
  const bachelorYears = company.recruitment_years_bachelor ?? [];
  const masterYears = company.recruitment_years_master ?? [];
  const hasRestrictions = requiredLevels.length > 0 || bachelorYears.length > 0 || masterYears.length > 0;

  if (!hasRestrictions) return 1;

  const studentLevel = student.study_level?.trim().toLowerCase();
  if (!studentLevel) return 0;

  const levelMatches = requiredLevels.length === 0 || requiredLevels.includes(studentLevel);
  if (!levelMatches) return 0;

  const studentYear = student.study_year ?? student.graduation_year ?? null;
  if (studentYear === null || studentYear === undefined) {
    return 0.5;
  }

  if (studentLevel === "bachelor") {
    return bachelorYears.length === 0 || bachelorYears.includes(studentYear) ? 1 : 0;
  }

  if (studentLevel === "master") {
    return masterYears.length === 0 || masterYears.includes(studentYear) ? 1 : 0;
  }

  return levelMatches ? 1 : 0;
}

export function isCompanyRelevantForStudent(student: StudentMatchProfile, company: Company) {
  const studyFieldScore = overlapScore(getStudentStudyCategories(student), getCompanyStudyCategories(company));
  const jobTypeScore = overlapScore(student.job_types, company.recruitment_job_types);
  const likedScore = (student.liked_company_ids ?? []).includes(company.id) ? 1 : 0;
  const levelScore = getStudentLevelScore(student, company);

  return {
    relevant: levelScore > 0 && (studyFieldScore > 0 || jobTypeScore > 0 || likedScore === 1),
    studyFieldScore,
    jobTypeScore,
    likedScore,
    levelScore,
  };
}

export function computeMatch(student: StudentMatchProfile, company: Company): MatchResult {
  const relevance = isCompanyRelevantForStudent(student, company);
  const studyScore = relevance.studyFieldScore;
  const jobScore = relevance.jobTypeScore;
  const valuesScore = overlapScore(student.values, company.branding_values);
  const locScore = locationScore(student, company);
  const likedScore = relevance.likedScore;
  const levelScore = relevance.levelScore;

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
    {
      label: "Nivå og årstrinn",
      score: levelScore,
      details:
        levelScore === 1
          ? "Studentens nivå og årstrinn passer godt til det bedriften søker."
          : levelScore > 0
            ? "Studentens nivå ser ut til å passe, men årstrinn er uklart."
            : "Bedriften søker et annet nivå eller årstrinn.",
    },
  ];

  return {
    score: Math.round(weighted * 100),
    reasons,
    signals: {
      studyFieldScore: studyScore,
      jobTypeScore: jobScore,
      valuesScore,
      locationScore: locScore,
      likedScore,
      levelScore,
      relevant: relevance.relevant,
    },
  };
}
