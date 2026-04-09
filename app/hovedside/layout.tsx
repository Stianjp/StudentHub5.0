import type { Metadata } from "next";
import { Navbar } from "@/components/hovedside/navbar";
import { Footer } from "@/components/hovedside/footer";

export const metadata: Metadata = {
  title: {
    default: "Oslo Student Hub",
    template: "%s | Oslo Student Hub",
  },
  description:
    "We connect students and companies. Career events, matching and networking for students in Oslo.",
};

export default function HovedsideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="hovedside-scope flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
