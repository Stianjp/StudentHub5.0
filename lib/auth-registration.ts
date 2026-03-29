import { roleFromHost, type AppRole } from "@/lib/host";
import { STUDY_CATEGORIES } from "@/components/event/study-categories";

export const OSH_ADMIN_EMAIL_DOMAIN = "@oslostudenthub.no";
export const PASSWORD_POLICY_MESSAGE =
  "Passord må være minst 8 tegn og inneholde stor bokstav, tall og spesialtegn.";

export const STUDY_LEVEL_OPTIONS = [
  { value: "Bachelor", label: "Bachelorstudent" },
  { value: "Master", label: "Masterstudent" },
] as const;

export type StudyLevel = (typeof STUDY_LEVEL_OPTIONS)[number]["value"];

export type PasswordRequirementKey =
  | "length"
  | "uppercase"
  | "number"
  | "special"
  | "match";

export type PasswordRequirement = {
  key: PasswordRequirementKey;
  label: string;
  met: boolean;
};

export type PasswordStrengthSummary = {
  requirements: PasswordRequirement[];
  metCount: number;
  filledSegments: 0 | 1 | 2 | 3;
  label: "Ingen" | "Svak" | "Middels" | "Sterkt";
};

const STUDENT_JOB_TYPE_DEFINITIONS = [
  { value: "Deltidsjobb", label: "Deltidsjobb", levels: ["Bachelor", "Master"] },
  { value: "Fast jobb", label: "Fulltidsjobb", levels: ["Bachelor", "Master"] },
  { value: "Bacheloroppgave", label: "Bacheloroppgave", levels: ["Bachelor"] },
  { value: "Masteroppgave", label: "Masteroppgave", levels: ["Master"] },
  { value: "Sommerjobb", label: "Sommerjobb", levels: ["Bachelor", "Master"] },
] as const;

export const STUDENT_JOB_TYPE_OPTIONS = STUDENT_JOB_TYPE_DEFINITIONS.map(({ value, label }) => ({
  value,
  label,
})) as ReadonlyArray<{
  value: (typeof STUDENT_JOB_TYPE_DEFINITIONS)[number]["value"];
  label: (typeof STUDENT_JOB_TYPE_DEFINITIONS)[number]["label"];
}>;

const STUDENT_JOB_TYPE_ALIASES = new Map<string, string>(
  STUDENT_JOB_TYPE_DEFINITIONS.flatMap((option) => {
    const aliases = [option.value, option.label];
    if (option.value === "Fast jobb") {
      aliases.push("Fulltidsjobb");
    }
    return aliases.map((alias) => [alias.trim().toLowerCase(), option.value]);
  }),
);

export function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeStudyLevel(value: string | null | undefined): StudyLevel | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "bachelor") return "Bachelor";
  if (normalized === "master") return "Master";
  return null;
}

export function isValidStudyProgram(value: string | null | undefined) {
  return STUDY_CATEGORIES.includes((value ?? "").trim());
}

export function getStudyYearOptions(studyLevel: string | null | undefined) {
  const normalizedStudyLevel = normalizeStudyLevel(studyLevel);
  if (normalizedStudyLevel === "Bachelor") {
    return [1, 2, 3];
  }
  if (normalizedStudyLevel === "Master") {
    return [1, 2, 3, 4, 5];
  }
  return [];
}

export function getStudentJobTypeOptions(studyLevel: string | null | undefined) {
  const normalizedStudyLevel = normalizeStudyLevel(studyLevel);
  return STUDENT_JOB_TYPE_DEFINITIONS.filter((option) =>
    normalizedStudyLevel
      ? option.levels.some((level) => level === normalizedStudyLevel)
      : option.value !== "Bacheloroppgave" && option.value !== "Masteroppgave",
  ).map(({ value, label }) => ({ value, label }));
}

export function validateStudentStudyChoices({
  studyLevel,
  studyYear,
  jobTypes,
}: {
  studyLevel: string | null | undefined;
  studyYear: number | null | undefined;
  jobTypes: string[] | null | undefined;
}) {
  const normalizedStudyLevel = normalizeStudyLevel(studyLevel);
  if (!normalizedStudyLevel) {
    return { studyLevel: "Velg bachelor eller master." };
  }

  if (!getStudyYearOptions(normalizedStudyLevel).includes(Number(studyYear))) {
    return {
      studyYear:
        normalizedStudyLevel === "Bachelor"
          ? "Bachelorstudenter kan bare velge 1.-3. år."
          : "Masterstudenter kan bare velge 1.-5. år.",
    };
  }

  const normalizedJobTypes = mapStudentJobTypes(jobTypes ?? []);
  if (normalizedStudyLevel === "Bachelor" && normalizedJobTypes.includes("Masteroppgave")) {
    return { jobTypes: "Masteroppgave vises bare for masterstudenter." };
  }
  if (normalizedStudyLevel === "Master" && normalizedJobTypes.includes("Bacheloroppgave")) {
    return { jobTypes: "Bacheloroppgave vises bare for bachelorstudenter." };
  }

  return null;
}

export function isOshAdminEmail(value: string | null | undefined) {
  if (!value) return false;
  return normalizeEmailAddress(value).endsWith(OSH_ADMIN_EMAIL_DOMAIN);
}

export function validatePasswordStrength(password: string, confirmPassword?: string | null) {
  if (password.length < 8) {
    return PASSWORD_POLICY_MESSAGE;
  }
  if (!/[A-ZÆØÅ]/.test(password)) {
    return PASSWORD_POLICY_MESSAGE;
  }
  if (!/\d/.test(password)) {
    return PASSWORD_POLICY_MESSAGE;
  }
  if (!/[^\p{L}\p{N}\s]/u.test(password)) {
    return PASSWORD_POLICY_MESSAGE;
  }
  if (confirmPassword !== undefined && confirmPassword !== null && password !== confirmPassword) {
    return "Passordene må være like.";
  }
  return null;
}

export function getPasswordStrengthSummary(
  password: string,
  confirmPassword?: string | null,
): PasswordStrengthSummary {
  const requirements: PasswordRequirement[] = [
    {
      key: "length",
      label: "Minst 8 tegn",
      met: password.length >= 8,
    },
    {
      key: "uppercase",
      label: "Minst én stor bokstav",
      met: /[A-ZÆØÅ]/.test(password),
    },
    {
      key: "number",
      label: "Minst ett tall",
      met: /\d/.test(password),
    },
    {
      key: "special",
      label: "Minst ett spesialtegn",
      met: /[^\p{L}\p{N}\s]/u.test(password),
    },
    {
      key: "match",
      label: "Passordene er like",
      met: Boolean(confirmPassword) && password.length > 0 && password === confirmPassword,
    },
  ];

  const metCount = requirements.slice(0, 4).filter((requirement) => requirement.met).length;

  if (password.length === 0) {
    return {
      requirements,
      metCount,
      filledSegments: 0,
      label: "Ingen",
    };
  }

  if (metCount <= 1) {
    return {
      requirements,
      metCount,
      filledSegments: 1,
      label: "Svak",
    };
  }

  if (metCount <= 3) {
    return {
      requirements,
      metCount,
      filledSegments: 2,
      label: "Middels",
    };
  }

  return {
    requirements,
    metCount,
    filledSegments: 3,
    label: "Sterkt",
  };
}

export function mapStudentJobTypes(values: string[]) {
  const normalized = values
    .map((value) => STUDENT_JOB_TYPE_ALIASES.get(value.trim().toLowerCase()) ?? null)
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(normalized));
}

export function validateHostRoleLock(hostname: string | null | undefined, expectedRole: Exclude<AppRole, "admin">) {
  const hostRole = roleFromHost(hostname ?? null);
  if (!hostRole) return null;
  if (hostRole === "admin") {
    return "Registrering er ikke tilgjengelig på admin-domenet.";
  }
  if (hostRole !== expectedRole) {
    return expectedRole === "student"
      ? "Studentregistrering kan bare brukes på student-domenet."
      : "Bedriftsregistrering kan bare brukes på bedrift-domenet.";
  }
  return null;
}

export function validateMagicLinkRoleForHost(hostname: string | null | undefined, requestedRole: AppRole) {
  const hostRole = roleFromHost(hostname ?? null);
  if (!hostRole) return null;
  if (hostRole === "admin") {
    return "Magic link er ikke tilgjengelig på admin-domenet.";
  }
  if (hostRole !== requestedRole) {
    return hostRole === "student"
      ? "Dette domenet støtter bare student-innlogging."
      : "Dette domenet støtter bare bedriftsinnlogging.";
  }
  return null;
}
