import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { Textarea } from "@/components/ui/textarea";
import { requireRole } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrCreateStudentForUser } from "@/lib/student";
import { saveStudentProfile } from "@/app/student/actions";
import { SaveProfileButton } from "@/components/student/save-profile-button";
import { STUDY_CATEGORIES } from "@/components/event/study-categories";
import { listActiveEvents, listEventCompaniesForEvents } from "@/lib/events";
import { registerStudentForEvent } from "@/app/event/actions";
import { CompanyInterestSelector } from "@/components/event/company-interest-selector";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StudentProfilePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const showSaved = params.saved === "1";
  const profile = await requireRole("student");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not found");

  const student = await getOrCreateStudentForUser(profile.id, user.email);
  const events = await listActiveEvents();
  const eventCompanies = events.length ? await listEventCompaniesForEvents(events.map((event) => event.id)) : [];
  const companyMap = new Map<string, Array<{ id: string; name: string }>>();
  eventCompanies.forEach((row) => {
    const existing = companyMap.get(row.event_id) ?? [];
    existing.push({ id: row.company.id, name: row.company.name });
    companyMap.set(row.event_id, existing);
  });
  const { data: tickets } = await supabase
    .from("event_tickets")
    .select("id, event_id")
    .eq("student_id", student.id ?? "");
  const registeredEventIds = new Set((tickets ?? []).map((ticket) => ticket.event_id));


  return (
    <div className="flex flex-col gap-8 text-surface">
      <div className="rounded-3xl border border-surface/10 bg-primary/60 p-6 md:p-10">
        <SectionHeader
          eyebrow="Profil"
          title="Din studentprofil"
          description="Mobil-først profil som brukes i matching og eventflyt."
          tone="light"
        />

        <Card className="mt-8 flex flex-col gap-5 bg-primary/20 text-surface ring-1 ring-white/10">
          {showSaved ? (
            <div
              className="rounded-xl border border-success/40 bg-success/20 px-4 py-3 text-sm text-surface"
              aria-live="polite"
            >
              Profilen er lagret.
            </div>
          ) : null}
          <form action={saveStudentProfile} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-surface">
                Navn
                <Input name="fullName" required defaultValue={student.full_name ?? ""} />
              </label>
              <label className="text-sm font-semibold text-surface">
                E-post
                <Input name="email" type="email" required defaultValue={student.email ?? user.email ?? ""} />
              </label>
            </div>

            <label className="text-sm font-semibold text-surface">
              Telefon
              <Input name="phone" defaultValue={student.phone ?? ""} />
            </label>

            <div className="grid gap-4">
              <div className="text-sm font-semibold text-surface">
                Hovedstudie
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {STUDY_CATEGORIES.map((category) => (
                    <label
                      key={category}
                      className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm text-primary"
                    >
                      <input
                        type="radio"
                        name="studyProgram"
                        value={category}
                        required
                        defaultChecked={student.study_program === category}
                        className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                      />
                      <span className="font-semibold text-primary">{category}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="text-sm font-semibold text-surface">
                Hvilket år går du i?
                <div className="mt-2 grid gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary/70">Bachelor</span>
                    {[1, 2, 3].map((year) => (
                      <label
                        key={`bachelor-${year}`}
                        className="flex items-center gap-2 rounded-full border border-primary/20 bg-surface px-3 py-2 text-sm text-primary"
                      >
                        <input
                          type="radio"
                          name="studyTrack"
                          value={`Bachelor-${year}`}
                          required
                          defaultChecked={student.study_level === "Bachelor" && student.study_year === year}
                          className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                        />
                        {year}. år
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary/70">Master</span>
                    {[1, 2].map((year) => (
                      <label
                        key={`master-${year}`}
                        className="flex items-center gap-2 rounded-full border border-primary/20 bg-surface px-3 py-2 text-sm text-primary"
                      >
                        <input
                          type="radio"
                          name="studyTrack"
                          value={`Master-${year}`}
                          defaultChecked={student.study_level === "Master" && student.study_year === year}
                          className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                        />
                        {year}. år
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-sm font-semibold text-surface">
              Interesser (velg en eller flere)
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {STUDY_CATEGORIES.map((category) => (
                  <label
                    key={category}
                    className="flex items-center gap-2 rounded-xl border border-primary/10 bg-surface px-3 py-2 text-sm text-primary"
                  >
                    <input
                      type="checkbox"
                      name="interests"
                      value={category}
                      defaultChecked={student.interests.includes(category)}
                      className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
                    />
                    <span className="font-semibold text-primary">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-surface">
                Verdier hos arbeidsgiver (tags)
                <Input name="values" defaultValue={student.values.join(", ")} placeholder="Læring, Autonomi" />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-surface">
              <input
                className="h-4 w-4 rounded border-primary/20 text-primary focus:ring-primary"
                type="checkbox"
                name="willingToRelocate"
                defaultChecked={student.willing_to_relocate}
              />
              Jeg er villig til å flytte
            </label>

            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
              <p className="text-sm font-semibold text-surface">Arbeidspreferanser</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="text-sm font-semibold text-surface">
                  Arbeidsform
                  <select
                    name="workStyle"
                    className="mt-2 w-full rounded-full border border-primary/20 bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm outline-none"
                    defaultValue={student.work_style ?? ""}
                  >
                    <option value="">Velg</option>
                    <option value="Fast kontorplass">Fast kontorplass</option>
                    <option value="Hybrid hverdag">Hybrid hverdag</option>
                    <option value="Full fleksibilitet">Full fleksibilitet</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-surface">
                  Sosial vibe
                  <select
                    name="socialProfile"
                    className="mt-2 w-full rounded-full border border-primary/20 bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm outline-none"
                    defaultValue={student.social_profile ?? ""}
                  >
                    <option value="">Velg</option>
                    <option value="Høy sosial faktor">Høy sosial faktor</option>
                    <option value="Balansert">Balansert</option>
                    <option value="Fokus på faglig ro">Fokus på faglig ro</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-surface md:col-span-2">
                  Team-størrelse
                  <select
                    name="teamSize"
                    className="mt-2 w-full rounded-full border border-primary/20 bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm outline-none"
                    defaultValue={student.team_size ?? ""}
                  >
                    <option value="">Velg</option>
                    <option value="Små team">Små team</option>
                    <option value="Mellomstore team">Mellomstore team</option>
                    <option value="Store team">Store team</option>
                  </select>
                </label>
              </div>
            </div>

            <label className="text-sm font-semibold text-surface">
              Kort om deg (MVP-felt)
              <Textarea
                name="about"
                rows={4}
                defaultValue={student.about ?? ""}
                placeholder="Eksempel: 3. års student i informatikk med erfaring fra frontend-prosjekter, liker å jobbe i team og er åpen for sommerjobb i Oslo."
              />
              <p className="mt-2 text-xs text-surface/70">
                Tips: Skriv kort om hva du studerer, hvilke teknologier/områder du kan, og hva du ser etter (sommerjobb, deltid, internship).
              </p>
            </label>

            <SaveProfileButton />
          </form>
        </Card>

        <Card className="mt-6 flex flex-col gap-4 bg-primary/20 text-surface ring-1 ring-white/10">
          <h3 className="text-lg font-bold text-surface">Meld deg på events</h3>
          {events.length === 0 ? (
            <p className="text-sm text-surface/70">Ingen aktive events tilgjengelig.</p>
          ) : (
            <ul className="grid gap-3 text-sm text-surface/80">
              {events.map((event) => (
                <li key={event.id} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-primary/30 p-4">
                  <div>
                    <p className="font-semibold text-surface">{event.name}</p>
                    <p className="text-xs text-surface/70">
                      {new Date(event.starts_at).toLocaleString("nb-NO")} – {new Date(event.ends_at).toLocaleString("nb-NO")}
                    </p>
                  </div>
                  <form action={registerStudentForEvent}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <label className="mt-2 block text-xs font-semibold text-surface">
                      Telefon
                      <Input
                        name="phone"
                        required
                        placeholder="Telefonnummer"
                        defaultValue={student.phone ?? ""}
                        className="mt-1"
                      />
                    </label>
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-surface">Hvilke bedrifter er du interessert i?</p>
                      <p className="text-[11px] text-surface/70">Velg alle, noen eller ingen.</p>
                      <div className="mt-2">
                        <CompanyInterestSelector companies={companyMap.get(event.id) ?? []} />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="mt-3 inline-flex items-center justify-center rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-primary transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={registeredEventIds.has(event.id)}
                    >
                      {registeredEventIds.has(event.id) ? "Allerede påmeldt" : "Meld deg på"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
