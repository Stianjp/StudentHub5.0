import Link from "next/link";

export const dynamic = "force-dynamic";

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-mist">
      <header className="border-b border-primary/10 bg-primary text-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">ConnectHub</p>
            <h1 className="text-2xl font-bold">Event og kiosk</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <Link className="rounded-xl bg-surface/10 px-3 py-2 hover:bg-surface/20" href="/event">
              Events
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
