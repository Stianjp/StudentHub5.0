import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oslo Student Hub",
  description: "Screening, matching og events for studenter og bedrifter.",
  icons: {
    icon: [
      { url: "/brand/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/brand/logo.svg",
    apple: "/apple-touch-icon.png",
  },
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
