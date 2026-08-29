"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { PublicRegistrationStand } from "@/lib/event-registration";

const StandShowcase = dynamic(
  () => import("@/components/hovedside/stand-showcase").then((mod) => mod.StandShowcase),
  { ssr: false },
);

type Props = {
  floorplanImagePath: string;
  floorplanAlt: string;
  floorplanWidth: number;
  floorplanHeight: number;
  stands: PublicRegistrationStand[];
};

export function DesktopStandShowcase(props: Props) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const handleChange = () => setIsDesktop(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  if (!isDesktop) return null;

  return <StandShowcase {...props} />;
}
