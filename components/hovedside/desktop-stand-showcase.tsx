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
  const [canShowFloorplanAutomatically, setCanShowFloorplanAutomatically] =
    useState(false);
  const [floorplanRequested, setFloorplanRequested] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(min-width: 1200px) and (hover: hover) and (pointer: fine)",
    );
    const handleChange = () =>
      setCanShowFloorplanAutomatically(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const showFloorplan = canShowFloorplanAutomatically || floorplanRequested;

  if (!showFloorplan) {
    return (
      <div className="rounded-[28px] border border-white/12 bg-white/8 p-5 text-center shadow-[0_18px_48px_rgba(20,2,73,0.18)]">
        <p className="text-base font-semibold text-surface">
          See the full floor plan
        </p>
        <p className="mt-2 text-sm leading-relaxed text-mist/72">
          The interactive map and stand logos load only when you request them,
          keeping the page stable on mobile phones and tablets.
        </p>
        <button
          type="button"
          onClick={() => setFloorplanRequested(true)}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-secondary px-7 py-3 text-sm font-bold uppercase tracking-wider text-primary transition-colors hover:bg-secondary/90 sm:w-auto"
        >
          Vis plantegning
        </button>
      </div>
    );
  }

  return (
    <div>
      {!canShowFloorplanAutomatically ? (
        <div className="mb-4 flex justify-center">
          <button
            type="button"
            onClick={() => setFloorplanRequested(false)}
            className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-secondary px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-secondary transition-colors hover:bg-secondary hover:text-primary"
          >
            Skjul plantegning
          </button>
        </div>
      ) : null}
      <StandShowcase {...props} />
    </div>
  );
}
