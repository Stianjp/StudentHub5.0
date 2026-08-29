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
  const [canShowFloorplan, setCanShowFloorplan] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(min-width: 1200px) and (hover: hover) and (pointer: fine)",
    );
    const handleChange = () => setCanShowFloorplan(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  if (!canShowFloorplan) {
    return (
      <div className="rounded-[28px] border border-white/12 bg-white/8 p-5 text-center shadow-[0_18px_48px_rgba(20,2,73,0.18)]">
        <p className="text-base font-semibold text-surface">
          The interactive stand map is shown on desktop.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-mist/72">
          We have hidden the full floor plan on touch devices to keep this page
          stable on mobile phones and tablets.
        </p>
      </div>
    );
  }

  return <StandShowcase {...props} />;
}
