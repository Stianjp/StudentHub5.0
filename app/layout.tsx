import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OSH StudentHub",
  description: "Screening, matching og events for studenter og bedrifter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
