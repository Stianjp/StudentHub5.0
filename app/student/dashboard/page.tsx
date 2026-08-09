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
    a.company.name.localeCompare(b.company.name, "nb-NO")
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

  return details.join(" • ") || "Relevant match for din profil.";
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
    ? new Date(nextEvent.starts_at).toLocaleDateString("nb-NO", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      })
    : "Ingen kommende events";

  let color = "#70C08E";
  if (completion <= 30) color = "#D94848";
  else if (completion <= 75) color = "#F4A261";
  const showCheck = completion === 100;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-white drop-shadow-sm">
            Hei, {student.full_name ?? "student"}! 👋
          </h2>
          <div className="mt-3 h-1.5 w-16 rounded-full bg-[#FE9A70]" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            aria-label="Åpne varsler"
            className="relative rounded-2xl border border-white/20 bg-white/10 p-3.5 text-white transition-[background-color,border-color,box-shadow] hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#846AE6]"
          >
            <Bell size={20} aria-hidden="true" />
            <span className="absolute right-3.5 top-3.5 h-2.5 w-2.5 rounded-full border-2 border-[#846AE6] bg-[#FE9A70]" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="relative overflow-hidden rounded-[3.5rem] bg-[#140249] p-12 shadow-2xl lg:col-span-8">
          <div className="relative z-10">
            <span className="mb-8 inline-block rounded-xl bg-[#FE9A70] px-4 py-2 text-[11px] font-black uppercase tracking-widest text-[#140249] shadow-lg shadow-[#FE9A70]/20">
              Status
            </span>
            <h3 className="mb-4 text-5xl font-black leading-tight text-white">
              Gjør deg klar for
              <br />
              <span className="text-[#FE9A70]">karrieredagene.</span>
            </h3>
            <p className="mb-12 max-w-sm text-lg font-medium text-white/80">
              Profilen din er {completion}% fullført og synlig for våre partnere.
            </p>
            <Link
              href="/student"
              className="inline-flex items-center rounded-2xl bg-[#FE9A70] px-10 py-5 text-sm font-black text-[#140249] shadow-xl shadow-[#FE9A70]/30 transition-[background-color,transform,box-shadow] hover:bg-[#F7A67E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140249] active:scale-95"
            >
              {needsOnboarding ? "Fullfør profil" : "Se din profil"}
            </Link>
          </div>
          <div className="pointer-events-none absolute right-0 top-0 flex h-full w-1/2 items-center justify-center opacity-10">
            <Users size={400} strokeWidth={1} className="text-[#846AE6]" aria-hidden="true" />
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-[3.5rem] border border-white/15 bg-[#140249] p-12 shadow-2xl lg:col-span-4">
          <div>
            <div className="mb-10 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FE9A70] text-[#140249] shadow-xl shadow-[#FE9A70]/30">
              <Calendar size={32} aria-hidden="true" />
            </div>
            <h4 className="mb-4 text-2xl font-black text-[#EDE8F5]">Neste Event</h4>
            <p className="mb-2 text-sm font-bold text-[#EDE8F5]/75">{eventDate}</p>
            <p className="text-xl font-black text-white">
              {nextEvent?.name ?? "Ingen aktive eventer"}
            </p>
          </div>
          <Link
            href="/student/events"
            className="mt-10 inline-flex w-full items-center justify-center rounded-2xl bg-[#FE9A70] py-5 text-sm font-black text-[#140249] shadow-lg shadow-[#FE9A70]/20 transition-[background-color,transform,box-shadow] hover:bg-[#F7A67E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140249] active:scale-[0.98]"
          >
            Meld deg på
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="rounded-[3rem] border border-white/15 bg-[#140249] p-10 shadow-xl">
          <div className="mb-10 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="rounded-2xl bg-[#FE9A70] p-3 text-[#140249] shadow-lg shadow-[#FE9A70]/20">
                <Briefcase size={24} aria-hidden="true" />
              </div>
              <h4 className="text-xl font-black text-white">Anbefalte bedrifter</h4>
            </div>
            <Link href="/student/companies" className="text-xs font-black uppercase tracking-wider text-[#FE9A70] hover:underline">
              Se alle
            </Link>
          </div>

          <div className="space-y-6">
            {recommendedCompanies.length > 0 ? (
              recommendedCompanies.map((company) => {
                const logoUrl = recommendedCompanyLogos[company.company.id] ?? null;

                return (
                  <Link
                    key={company.company.id}
                  href={`/student/companies?q=${encodeURIComponent(company.company.name)}`}
                  className="group flex items-center justify-between rounded-3xl border border-white/10 bg-[#1B0858] p-6 shadow-sm transition-[background-color,border-color,color,box-shadow] hover:border-[#FE9A70]/40 hover:bg-[#220C6C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140249]"
                >
                  <div className="flex items-center space-x-5">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/95 p-2 shadow-inner">
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
                    <div className="space-y-1.5">
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
                        {company.eventName ?? "Aktivt event"}
                        {company.company.location ? ` • ${company.company.location}` : ""}
                      </p>
                      <p className="max-w-md text-sm font-medium text-white/72">
                        {summarizeCompany(company)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-white/50 group-hover:text-[#FE9A70]" aria-hidden="true" />
                </Link>
                );
              })
            ) : (
              <div className="rounded-3xl border border-white/10 bg-[#1B0858] p-6 text-sm font-medium text-white/72">
                Vi fant ingen tydelige bedriftsmatcher akkurat nå. Oppdater studieprogram, interesser eller jobbtyper for bedre anbefalinger.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-[3rem] border border-white/15 bg-[#140249] p-10 shadow-xl">
          <div className="mb-10 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="rounded-2xl bg-[#FE9A70] p-3 text-[#140249] shadow-lg shadow-[#FE9A70]/20">
                <Heart size={24} aria-hidden="true" />
              </div>
              <h4 className="text-xl font-black text-white">Dine favoritter</h4>
            </div>
            <Link
              href="/student/companies"
              className="rounded-full border border-[#FE9A70]/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-[#FE9A70] transition-[background-color,border-color,color,box-shadow] hover:bg-[#FE9A70] hover:text-[#140249] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140249]"
            >
              Finn Flere
            </Link>
          </div>

          <p className="mb-6 text-sm font-medium text-[#EDE8F5]/75">
            Favorittmarkering betyr også samtykke til at bedriften kan kontakte deg.
          </p>

          <div className="mb-10 flex flex-wrap gap-3">
            {(typedLikedCompanies.length > 0 ? typedLikedCompanies : [{ id: "none", name: "Ingen favoritter ennå" }]).map(
              (company) => (
                <div
                  key={company.id}
                  className="rounded-2xl border border-white/15 bg-[#1B0858] px-6 py-3 text-sm font-black text-[#EDE8F5]/85 shadow-sm"
                >
                  {company.name}
                </div>
              ),
            )}
          </div>

          <div className="mt-auto rounded-[2.5rem] bg-[#140249] p-1">
            <div className="flex items-center space-x-6 p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#846AE6] text-white shadow-inner">
                {showCheck ? <Check size={30} strokeWidth={3} aria-hidden="true" /> : <span className="text-xl font-black">%</span>}
              </div>
              <div>
                <p className="text-lg font-black text-white">Profilen din er {completion}%!</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/70">
                  Sist oppdatert i dag
                </p>
              </div>
              <span className="ml-auto text-xl font-black" style={{ color }}>
                {completion}% {showCheck ? "✓" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
