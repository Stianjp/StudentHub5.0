import { Navbar } from "@/components/hovedside/navbar";

const PUBLIC_SITE_BASE_URL =
  process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim() ||
  "https://www.oslostudenthub.no";

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-mist">
      <Navbar baseUrl={PUBLIC_SITE_BASE_URL} />
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
