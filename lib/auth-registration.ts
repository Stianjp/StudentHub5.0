import { roleFromHost, type AppRole } from "@/lib/host";
import { STUDY_CATEGORIES } from "@/components/event/study-categories";

export const OSH_ADMIN_EMAIL_DOMAIN = "@oslostudenthub.no";
export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include an uppercase letter, a number and a special character.";

export const STUDY_LEVEL_OPTIONS = [
  { value: "Bachelor", label: "Bachelor student" },
  { value: "Master", label: "Master student" },
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
  label: "None" | "Weak" | "Medium" | "Strong";
};

const STUDENT_JOB_TYPE_DEFINITIONS = [
  { value: "Deltidsjobb", label: "Part-time job", levels: ["Bachelor", "Master"] },
  { value: "Fast jobb", label: "Full-time job", levels: ["Bachelor", "Master"] },
  { value: "Bacheloroppgave", label: "Bachelor thesis", levels: ["Bachelor"] },
  { value: "Masteroppgave", label: "Master thesis", levels: ["Master"] },
  { value: "Sommerjobb", label: "Summer internship", levels: ["Bachelor", "Master"] },
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
    const aliases: string[] = [option.value, option.label];
    if (option.value === "Fast jobb") {
      aliases.push("Fulltidsjobb", "Full-time position");
    }
    if (option.value === "Deltidsjobb") {
      aliases.push("Part-time position");
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
    return { studyLevel: "Select bachelor or master." };
  }

  if (!getStudyYearOptions(normalizedStudyLevel).includes(Number(studyYear))) {
    return {
      studyYear:
        normalizedStudyLevel === "Bachelor"
          ? "Bachelor students can only select years 1-3."
          : "Master students can only select years 1-5.",
    };
  }

  const normalizedJobTypes = mapStudentJobTypes(jobTypes ?? []);
  if (normalizedStudyLevel === "Bachelor" && normalizedJobTypes.includes("Masteroppgave")) {
    return { jobTypes: "Master thesis is only available to master students." };
  }
  if (normalizedStudyLevel === "Master" && normalizedJobTypes.includes("Bacheloroppgave")) {
    return { jobTypes: "Bachelor thesis is only available to bachelor students." };
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
    return "The passwords must match.";
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
      label: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      key: "uppercase",
      label: "At least one uppercase letter",
      met: /[A-ZÆØÅ]/.test(password),
    },
    {
      key: "number",
      label: "At least one number",
      met: /\d/.test(password),
    },
    {
      key: "special",
      label: "At least one special character",
      met: /[^\p{L}\p{N}\s]/u.test(password),
    },
    {
      key: "match",
      label: "Passwords match",
      met: Boolean(confirmPassword) && password.length > 0 && password === confirmPassword,
    },
  ];

  const metCount = requirements.slice(0, 4).filter((requirement) => requirement.met).length;

  if (password.length === 0) {
    return {
      requirements,
      metCount,
      filledSegments: 0,
      label: "None",
    };
  }

  if (metCount <= 1) {
    return {
      requirements,
      metCount,
      filledSegments: 1,
      label: "Weak",
    };
  }

  if (metCount <= 3) {
    return {
      requirements,
      metCount,
      filledSegments: 2,
      label: "Medium",
    };
  }

  return {
    requirements,
    metCount,
    filledSegments: 3,
    label: "Strong",
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
    return "Registration is not available on the admin domain.";
  }
  if (hostRole !== expectedRole) {
    return expectedRole === "student"
      ? "Student registration is only available on the student domain."
      : "Company registration is only available on the company domain.";
  }
  return null;
}

export function validateMagicLinkRoleForHost(hostname: string | null | undefined, requestedRole: AppRole) {
  const hostRole = roleFromHost(hostname ?? null);
  if (!hostRole) return null;
  if (hostRole === "admin") {
    return "Magic links are not available on the admin domain.";
  }
  if (hostRole !== requestedRole) {
    return hostRole === "student"
      ? "This domain only supports student sign-in."
      : "This domain only supports company sign-in.";
  }
  return null;
}
