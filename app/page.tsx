import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <section className="rounded-2xl bg-primary px-8 py-12 text-surface shadow-soft">
        <p className="text-sm font-medium uppercase tracking-wide text-secondary">
          Oslo Student Hub
        </p>
        <h1 className="mt-3 text-4xl font-bold md:text-5xl">
          Screening, matching og eventsystem for karrieredager
        </h1>
        <p className="mt-4 max-w-3xl text-base text-mist md:text-lg">
          Denne appen kjøres på subdomener. Bruk lenkene under i utvikling
          (paths) eller koble opp host-routing via middleware når subdomener er
          klare.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          className="rounded-2xl bg-surface p-6 shadow-soft transition hover:-translate-y-0.5"
          href="/company"
        >
          <h2 className="text-xl font-semibold text-primary">Bedriftsportal</h2>
          <p className="mt-2 text-sm text-ink/80">
            Onboarding, events, leads, matching og ROI for premium-kunder.
          </p>
        </Link>
        <Link
          className="rounded-2xl bg-surface p-6 shadow-soft transition hover:-translate-y-0.5"
          href="/student"
        >
          <h2 className="text-xl font-semibold text-primary">Student</h2>
          <p className="mt-2 text-sm text-ink/80">
            Mobil-først profil, samtykke og rask QR-/kioskflyt på karrieredager.
          </p>
        </Link>
        <Link
          className="rounded-2xl bg-surface p-6 shadow-soft transition hover:-translate-y-0.5"
          href="/event"
        >
          <h2 className="text-xl font-semibold text-primary">ConnectHub Event</h2>
          <p className="mt-2 text-sm text-ink/80">
            Eventside, stand-QR, kioskmodus og datainnsamling for ROI.
          </p>
        </Link>
        <Link
          className="rounded-2xl bg-surface p-6 shadow-soft transition hover:-translate-y-0.5"
          href="/admin"
        >
          <h2 className="text-xl font-semibold text-primary">Admin (OSH)</h2>
          <p className="mt-2 text-sm text-ink/80">
            Events, invitasjoner, pakker og totalstatistikk.
          </p>
        </Link>
      </section>
    </main>
  );
}
