import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Briefcase, Calendar, Check, ChevronRight, Heart, Users } from "lucide-react";
import { getOrCreateStudentForUser } from "@/lib/student";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listActiveEvents } from "@/lib/events";
import { computeMatch } from "@/lib/matching";
import { getLatestCompanyRegistrationLogos } from "@/lib/company";

const PACKAGE_PRIORITY = {
  platinum: 4,
  gold: 3,
  silver: 2,
  standard: 1,
} as const;

const PACKAGE_LABEL = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  standard: "Standard",
} as const;

const PACKAGE_STYLES = {
  platinum: "border-[#F6A6BD]/40 bg-[#F6A6BD]/15 text-[#FDE9F0]",
  gold: "border-[#F4C95D]/40 bg-[#F4C95D]/15 text-[#FFF2C8]",
  silver: "border-[#80D4F6]/40 bg-[#80D4F6]/15 text-[#E5F8FF]",
  standard: "border-[#70C08E]/40 bg-[#70C08E]/15 text-[#E7F7EC]",
} as const;

type StudentCompletionFields = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  study_program?: string | null;
  study_level?: string | null;
  study_year?: number | string | null;
  work_style?: string | null;
  social_profile?: string | null;
  team_size?: string | null;
  about?: string | null;
};

function calcProfileCompletion(student: StudentCompletionFields) {
  const fields = [
    student.full_name,
    student.email,
    student.phone,
    student.study_program,
    student.study_level,
    student.study_year,
    student.work_style,
    student.social_profile,
    student.team_size,
    student.about,
  ];
  const filled = fields.filter((value) => value !== null && value !== undefined && String(value).trim() !== "").length;
  return Math.round((filled / fields.length) * 100);
}

type RecommendedCompanyCard = {
  company: {
    id: string;
    name: string;
    location: string | null;
    recruitment_fields: string[];
    recruitment_job_types: string[];
    branding_message: string | null;
  };
  eventName: string | null;
  packageTier: keyof typeof PACKAGE_PRIORITY;
  matchScore: number;
  studyFieldScore: number;
  jobTypeScore: number;
  levelScore: number;
  likedScore: number;
};

function compareRecommendations(a: RecommendedCompanyCard, b: RecommendedCompanyCard) {
  return (
    PACKAGE_PRIORITY[b.packageTier] - PACKAGE_PRIORITY[a.packageTier] ||
    b.studyFieldScore - a.studyFieldScore ||
    b.levelScore - a.levelScore ||
    b.jobTypeScore - a.jobTypeScore ||
    b.matchScore - a.matchScore ||
    b.likedScore - a.likedScore ||
    a.company.name.localeCompare(b.company.name, "en-GB")
  );
}

function summarizeCompany(card: RecommendedCompanyCard) {
  if (card.company.branding_message?.trim()) {
    return card.company.branding_message.trim().slice(0, 96);
  }

  const details = [
    card.company.recruitment_fields.slice(0, 2).join(", "),
    card.company.recruitment_job_types[0] ?? "",
    card.company.location ?? "",
  ].filter(Boolean);

  return details.join(" • ") || "Relevant match for your profile.";
}

function getCompanyInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "BD";
  return parts.map((part) => part.slice(0, 1)).join("").toUpperCase();
}

export default async function StudentDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in?role=student&next=%2Fstudent%2Fdashboard");
  }

  const student = await getOrCreateStudentForUser(user.id, user.email);
  const completion = calcProfileCompletion(student);
  const needsOnboarding = !student.full_name || !student.phone || !student.study_program || !student.study_level || !student.study_year;
  const events = await listActiveEvents();
  const eventIds = events.map((event) => event.id);

  const [likedCompanies, recommendedRows] = await Promise.all([
    (async () => {
      const likedIds = student.liked_company_ids ?? [];
      if (likedIds.length === 0) return [];
      const { data } = await supabase.from("companies").select("id, name").in("id", likedIds).order("name");
      return data ?? [];
    })(),
    (async () => {
      if (eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from("event_companies")
        .select(
          "event_id, package, registered_at, company:companies(id, name, location, recruitment_fields, recruitment_job_types, branding_message)",
        )
        .in("event_id", eventIds)
        .not("registered_at", "is", null);
      if (error) throw error;
      return (data ?? []) as Array<{
        event_id: string;
        package: keyof typeof PACKAGE_PRIORITY;
        registered_at: string | null;
        company: RecommendedCompanyCard["company"] | null;
      }>;
    })(),
  ]);
  const typedLikedCompanies = likedCompanies as Array<{ id: string; name: string }>;
  const eventNameById = new Map(events.map((event) => [event.id, event.name]));
  const recommendedCompaniesById = new Map<string, RecommendedCompanyCard>();

  for (const row of recommendedRows) {
    if (!row.company) continue;
    const match = computeMatch(student, row.company);
    if (!match.signals.relevant) continue;

    const candidate: RecommendedCompanyCard = {
      company: row.company,
      eventName: eventNameById.get(row.event_id) ?? null,
      packageTier: row.package,
      matchScore: match.score,
      studyFieldScore: match.signals.studyFieldScore,
      jobTypeScore: match.signals.jobTypeScore,
      levelScore: match.signals.levelScore,
      likedScore: match.signals.likedScore,
    };

    const existing = recommendedCompaniesById.get(row.company.id);
    if (!existing || compareRecommendations(candidate, existing) < 0) {
      recommendedCompaniesById.set(row.company.id, candidate);
    }
  }

  const recommendedCompanies = Array.from(recommendedCompaniesById.values()).sort(compareRecommendations).slice(0, 4);
  const recommendedCompanyLogos = await getLatestCompanyRegistrationLogos(
    recommendedCompanies.map((company) => company.company.id),
  );

  const nextEvent = events[0];
  const eventDate = nextEvent?.starts_at
    ? new Date(nextEvent.starts_at).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      })
    : "No upcoming events";

  let color = "#70C08E";
  if (completion <= 30) color = "#D94848";
  else if (completion <= 75) color = "#F4A261";
  const showCheck = completion === 100;

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-10">
      <header className="flex items-start justify-between gap-4 sm:items-center">
        <div className="min-w-0">
          <h2 className="break-words text-3xl font-black text-white drop-shadow-sm sm:text-4xl">
            Hi, {student.full_name ?? "student"}!
          </h2>
          <div className="mt-3 h-1.5 w-16 rounded-full bg-[#FE9A70]" />
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            aria-label="Open notifications"
            className="relative rounded-2xl border border-white/20 bg-white/10 p-3.5 text-white transition-[background-color,border-color,box-shadow] hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#846AE6]"
          >
            <Bell size={20} aria-hidden="true" />
            <span className="absolute right-3.5 top-3.5 h-2.5 w-2.5 rounded-full border-2 border-[#846AE6] bg-[#FE9A70]" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#140249] p-6 shadow-2xl sm:p-8 lg:col-span-8 lg:rounded-[3.5rem] lg:p-12">
          <div className="relative z-10">
            <span className="mb-5 inline-block rounded-xl bg-[#FE9A70] px-4 py-2 text-[11px] font-black uppercase tracking-widest text-[#140249] shadow-lg shadow-[#FE9A70]/20 sm:mb-8">
              Status
            </span>
            <h3 className="mb-4 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
              Get ready for
              <br className="hidden sm:block" />
              <span className="text-[#FE9A70]"><span className="sm:hidden"> </span>Student Connect.</span>
            </h3>
            <p className="mb-8 max-w-sm text-base font-medium text-white/80 sm:mb-12 sm:text-lg">
              Your profile is {completion}% complete and visible to our partners.
            </p>
            <Link
              href="/student"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#FE9A70] px-6 py-4 text-center text-sm font-black text-[#140249] shadow-xl shadow-[#FE9A70]/30 transition-[background-color,transform,box-shadow] hover:bg-[#F7A67E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140249] active:scale-95 sm:w-auto sm:px-10 sm:py-5"
            >
              {needsOnboarding ? "Complete profile" : "View your profile"}
            </Link>
          </div>
          <div className="pointer-events-none absolute right-0 top-0 flex h-full w-1/2 items-center justify-center opacity-10">
            <Users size={400} strokeWidth={1} className="text-[#846AE6]" aria-hidden="true" />
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-[2rem] border border-white/15 bg-[#140249] p-6 shadow-2xl sm:p-8 lg:col-span-4 lg:rounded-[3.5rem] lg:p-12">
          <div>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FE9A70] text-[#140249] shadow-xl shadow-[#FE9A70]/30 sm:mb-10 sm:h-16 sm:w-16 sm:rounded-3xl">
              <Calendar size={32} aria-hidden="true" />
            </div>
            <h4 className="mb-4 text-2xl font-black text-[#EDE8F5]">Next event</h4>
            <p className="mb-2 text-sm font-bold text-[#EDE8F5]/75">{eventDate}</p>
            <p className="text-xl font-black text-white">
              {nextEvent?.name ?? "No active events"}
            </p>
          </div>
          <Link
            href="/student/events"
            className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#FE9A70] px-4 py-4 text-sm font-black text-[#140249] shadow-lg shadow-[#FE9A70]/20 transition-[background-color,transform,box-shadow] hover:bg-[#F7A67E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140249] active:scale-[0.98] sm:mt-10 sm:py-5"
          >
            Sign up
          </Link>
        </div>
      </div>

      <section className="rounded-[2rem] border border-[#FE9A70]/35 bg-[#FE9A70] p-6 text-center shadow-2xl shadow-[#140249]/20 sm:p-8 lg:rounded-[3rem]">
        <h3 className="mx-auto max-w-3xl text-2xl font-black leading-tight text-[#140249] sm:text-3xl">
          Get your free ticket to Student Connect 2026 here
        </h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-[#140249]/78 sm:text-base">
          Open Events to complete the ticket form and connect it to your student profile.
        </p>
        <Link
          href="/student/events"
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#140249] px-6 py-4 text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-[#140249]/20 transition-[background-color,transform,box-shadow] hover:bg-[#220C6C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#140249] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FE9A70] active:scale-[0.98] sm:w-auto sm:px-10"
        >
          Get your free ticket
        </Link>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2 xl:gap-8">
        <div className="rounded-[2rem] border border-white/15 bg-[#140249] p-5 shadow-xl sm:p-8 lg:rounded-[3rem] lg:p-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-10">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="rounded-2xl bg-[#FE9A70] p-3 text-[#140249] shadow-lg shadow-[#FE9A70]/20">
                <Briefcase size={24} aria-hidden="true" />
              </div>
              <h4 className="text-lg font-black text-white sm:text-xl">Recommended companies</h4>
            </div>
            <Link href="/student/companies" className="text-xs font-black uppercase tracking-wider text-[#FE9A70] hover:underline">
              See all
            </Link>
          </div>

          <div className="space-y-3 sm:space-y-6">
            {recommendedCompanies.length > 0 ? (
              recommendedCompanies.map((company) => {
                const logoUrl = recommendedCompanyLogos[company.company.id] ?? null;

                return (
                  <Link
                    key={company.company.id}
                  href={`/student/companies?q=${encodeURIComponent(company.company.name)}`}
                  className="group flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#1B0858] p-4 shadow-sm transition-[background-color,border-color,color,box-shadow] hover:border-[#FE9A70]/40 hover:bg-[#220C6C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140249] sm:rounded-3xl sm:p-6"
                >
                  <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-white/95 p-2 shadow-inner sm:h-14 sm:w-14 sm:rounded-2xl">
                      {logoUrl ? (
                        <Image
                          src={logoUrl}
                          alt={`Logo for ${company.company.name}`}
                          width={56}
                          height={56}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-[11px] font-black text-[#140249]">
                          {getCompanyInitials(company.company.name)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-white transition-colors group-hover:text-[#FE9A70]">
                          {company.company.name}
                        </p>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${PACKAGE_STYLES[company.packageTier]}`}
                        >
                          {PACKAGE_LABEL[company.packageTier]}
                        </span>
                      </div>
                      <p className="text-xs font-bold uppercase tracking-tight text-white/55">
                        {company.eventName ?? "Active event"}
                        {company.company.location ? ` • ${company.company.location}` : ""}
                      </p>
                      <p className="max-w-md text-sm font-medium text-white/72">
                        {summarizeCompany(company)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-white/50 group-hover:text-[#FE9A70]" aria-hidden="true" />
                </Link>
                );
              })
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#1B0858] p-4 text-sm font-medium text-white/72 sm:rounded-3xl sm:p-6">
                We could not find clear company matches right now. Update your study programme, interests or job types for better recommendations.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-[2rem] border border-white/15 bg-[#140249] p-5 shadow-xl sm:p-8 lg:rounded-[3rem] lg:p-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-10">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="rounded-2xl bg-[#FE9A70] p-3 text-[#140249] shadow-lg shadow-[#FE9A70]/20">
                <Heart size={24} aria-hidden="true" />
              </div>
              <h4 className="text-lg font-black text-white sm:text-xl">Your favourites</h4>
            </div>
            <Link
              href="/student/companies"
              className="rounded-full border border-[#FE9A70]/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-[#FE9A70] transition-[background-color,border-color,color,box-shadow] hover:bg-[#FE9A70] hover:text-[#140249] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140249]"
            >
              Find more
            </Link>
          </div>

          <p className="mb-6 text-sm font-medium text-[#EDE8F5]/75">
            Marking a company as a favourite also gives consent for that company to contact you.
          </p>

          <div className="mb-10 flex flex-wrap gap-3">
            {(typedLikedCompanies.length > 0 ? typedLikedCompanies : [{ id: "none", name: "No favourites yet" }]).map(
              (company) => (
                <div
                  key={company.id}
                  className="max-w-full break-words rounded-2xl border border-white/15 bg-[#1B0858] px-4 py-3 text-sm font-black text-[#EDE8F5]/85 shadow-sm sm:px-6"
                >
                  {company.name}
                </div>
              ),
            )}
          </div>

          <div className="mt-auto rounded-[2rem] bg-[#140249] p-1 sm:rounded-[2.5rem]">
            <div className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap sm:gap-6 sm:p-8">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#846AE6] text-white shadow-inner sm:h-16 sm:w-16">
                {showCheck ? <Check size={30} strokeWidth={3} aria-hidden="true" /> : <span className="text-xl font-black">%</span>}
              </div>
              <div>
                <p className="text-lg font-black text-white">Your profile is {completion}% complete</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/70">
                  Updated today
                </p>
              </div>
              <span className="ml-auto text-lg font-black sm:text-xl" style={{ color }}>
                {completion}% {showCheck ? "✓" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
