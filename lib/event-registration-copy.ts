type PublicRegistrationCopyInput = {
  slug: string;
  publicTitle: string | null | undefined;
  publicSubtitle: string | null | undefined;
  publicDescription: string | null | undefined;
  eventName: string;
  eventSlug?: string | null | undefined;
};

type PublicRegistrationCopy = {
  title: string;
  subtitle: string | null;
  description: string | null;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function isStudentConnect2026(input: PublicRegistrationCopyInput) {
  const haystack = [
    input.slug,
    input.eventSlug ?? "",
    normalizeText(input.eventName).toLowerCase(),
    normalizeText(input.publicTitle).toLowerCase(),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes("student-connect-2026") || haystack.includes("student connect 2026");
}

export function getPublicRegistrationCopy(input: PublicRegistrationCopyInput): PublicRegistrationCopy {
  if (isStudentConnect2026(input)) {
    return {
      title: "Student Connect 2026",
      subtitle: "Organized by Oslo Student Hub",
      description:
        "Register your company for Student Connect 2026 by Oslo Student Hub. Choose your package, request your stand and add the team members who need portal access.",
    };
  }

  return {
    title: normalizeText(input.publicTitle) || input.eventName,
    subtitle: normalizeText(input.publicSubtitle) || null,
    description: normalizeText(input.publicDescription) || null,
  };
}
