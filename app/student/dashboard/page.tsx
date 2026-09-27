import Image from "next/image";
import Link from "next/link";
import { Ticket, UserRound, Building2, ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getOrCreateStudentForUser } from "@/lib/student";
import { getUser } from "@/lib/auth";
import { listStudentParticipatingCompanies } from "@/lib/student-companies";
import { calcProfileCompletion } from "@/lib/student-portal";
import { shouldUseDirectImageUrl } from "@/lib/logo-url";

export default async function StudentDashboardPage() {
  const profile = await requireRole("student");
  const user = await getUser();
  const [student, companies] = await Promise.all([
    getOrCreateStudentForUser(profile.id, user?.email),
    listStudentParticipatingCompanies(),
  ]);
  const completion = calcProfileCompletion(student);
  const favouriteCount = new Set(student.liked_company_ids ?? []).size;
  const firstName = student.full_name?.trim().split(/\s+/)[0];

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">Student portal</p>
        <h1 className="mt-1 break-words text-2xl font-bold text-primary sm:text-3xl">
          {firstName ? `Hi, ${firstName}!` : "Your dashboard"}
        </h1>
      </header>

      <section aria-labelledby="ticket-heading" className="rounded-2xl border border-primary/10 bg-primary p-5 text-white sm:p-7">
        <div className="flex items-center gap-2 text-secondary">
          <Ticket size={20} aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-widest">Student Connect 2026</p>
        </div>
        <h2 id="ticket-heading" className="mt-3 text-xl font-bold sm:text-2xl">Get your free ticket</h2>
        <p className="mt-2 text-sm leading-relaxed text-mist">Join Student Connect 2026. Get your free ticket before the event.</p>
        <Link href="/student/events" className="button-link mt-5 w-full gap-2 sm:w-auto">
          Get your free ticket <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <section aria-labelledby="profile-heading" className="rounded-2xl border border-primary/10 bg-white p-5 shadow-soft sm:p-7">
        <div className="flex items-center gap-2 text-primary">
          <UserRound size={20} aria-hidden="true" />
          <h2 id="profile-heading" className="text-xl font-bold">Your profile</h2>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-primary">
          <p>{completion === 100 ? "Profile complete" : "Your profile is getting there"}</p>
          <span className="text-lg font-bold tabular-nums">{completion}%</span>
        </div>
        <progress className="student-profile-progress mt-2 block h-2.5 w-full" value={completion} max={100} aria-label="Profile completion">{completion}%</progress>
        <p className="mt-3 text-sm leading-relaxed text-ink/75">Help participating companies get to know your background and interests.</p>
        <Link href="/student" className="button-link mt-5 w-full sm:w-auto">
          {completion === 100 ? "Edit profile" : "Complete your profile"}
        </Link>
      </section>

      <section aria-labelledby="companies-heading" className="rounded-2xl border border-primary/10 bg-white p-5 shadow-soft sm:p-7">
        <div className="flex items-center gap-2 text-primary">
          <Building2 size={20} className="shrink-0" aria-hidden="true" />
          <h2 id="companies-heading" className="text-xl font-bold">Participating companies</h2>
        </div>
        <p className="mt-2 text-sm text-ink/75">
          {companies.length} participating {companies.length === 1 ? "company" : "companies"} · {favouriteCount} {favouriteCount === 1 ? "favourite" : "favourites"} selected
        </p>
        {companies.length > 0 ? (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {companies.slice(0, 4).map((company) => (
              <li key={company.companyId} className="min-w-0 rounded-xl border border-primary/10 p-3 text-center">
                <div className="mx-auto flex h-12 items-center justify-center">
                  {company.logoUrl ? (
                    <Image src={company.logoUrl} alt="" width={96} height={48} className="max-h-12 w-auto max-w-full object-contain" unoptimized={shouldUseDirectImageUrl(company.logoUrl)} />
                  ) : <Building2 size={28} className="text-primary/60" aria-hidden="true" />}
                </div>
                <p className="mt-2 break-words text-xs font-semibold text-primary">{company.companyName}</p>
              </li>
            ))}
          </ul>
        ) : <p className="mt-4 text-sm text-ink/75">Participating companies will appear here once confirmed.</p>}
        <Link href="/student/companies" className="button-link mt-5 w-full text-center sm:w-auto">Explore companies &amp; choose favourites</Link>
      </section>
    </div>
  );
}
