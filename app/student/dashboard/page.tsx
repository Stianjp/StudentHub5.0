import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Briefcase, Calendar, Check, ChevronRight, Heart, Users } from "lucide-react";
import { getOrCreateStudentForUser } from "@/lib/student";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listActiveEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

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

  const [events, likedCompanies] = await Promise.all([
    listActiveEvents(),
    (async () => {
      const likedIds = student.liked_company_ids ?? [];
      if (likedIds.length === 0) return [];
      const { data } = await supabase.from("companies").select("id, name").in("id", likedIds).order("name");
      return data ?? [];
    })(),
  ]);

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
            href={nextEvent ? `/student/events/${nextEvent.id}` : "/student/events"}
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
              <h4 className="text-xl font-black text-white">Anbefalte stillinger</h4>
            </div>
            <Link href="/student/events" className="text-xs font-black uppercase tracking-wider text-[#FE9A70] hover:underline">
              Se alle
            </Link>
          </div>

          <div className="space-y-6">
            {[
              { role: "Cyber Security Intern", company: "Deloitte" },
              { role: "Graduate 2026", company: "Equinor" },
              { role: "Business Analyst", company: "KPMG" },
            ].map((job) => (
              <div
                key={job.role}
                className="group flex items-center justify-between rounded-3xl border border-white/10 bg-[#1B0858] p-6 shadow-sm transition-[background-color,border-color,color,box-shadow] hover:border-[#FE9A70]/40 hover:bg-[#220C6C]"
              >
                <div className="flex items-center space-x-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-[#140249] text-[10px] font-black text-white/45">
                    LOGO
                  </div>
                  <div>
                    <p className="font-black text-white transition-colors group-hover:text-[#FE9A70]">
                      {job.role}
                    </p>
                    <p className="text-xs font-bold uppercase tracking-tight text-white/55">
                      {job.company} • Oslo
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-white/50 group-hover:text-[#FE9A70]" aria-hidden="true" />
              </div>
            ))}
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
            {(likedCompanies.length > 0 ? likedCompanies : [{ id: "none", name: "Ingen favoritter ennå" }]).map(
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
