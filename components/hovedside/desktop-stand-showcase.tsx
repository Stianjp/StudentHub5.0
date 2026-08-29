"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { PublicRegistrationStand } from "@/lib/event-registration";

const MOBILE_FLOORPLAN_IMAGE =
  "/event-register/student-connect-2026-floorplan-mobile.webp";

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

  if (!canShowFloorplanAutomatically && !floorplanRequested) {
    return (
      <div className="rounded-[28px] border border-white/12 bg-white/8 p-5 text-center shadow-[0_18px_48px_rgba(20,2,73,0.18)]">
        <p className="text-base font-semibold text-surface">
          See the full floor plan
        </p>
        <p className="mt-2 text-sm leading-relaxed text-mist/72">
          Explore the venue and see where the participating companies will be
          located during Student Connect 2026.
        </p>
        <button
          type="button"
          onClick={() => setFloorplanRequested(true)}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-secondary px-7 py-3 text-sm font-bold uppercase tracking-wider text-primary transition-colors hover:bg-secondary/90 sm:w-auto"
        >
          Show floor plan
        </button>
      </div>
    );
  }

  if (!canShowFloorplanAutomatically) {
    return (
      <div className="rounded-[28px] border border-white/12 bg-white/8 p-3 shadow-[0_18px_48px_rgba(20,2,73,0.18)] sm:p-5">
        <div className="mb-4 flex justify-center">
          <button
            type="button"
            onClick={() => setFloorplanRequested(false)}
            className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-secondary px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-secondary transition-colors hover:bg-secondary hover:text-primary"
          >
            Hide floor plan
          </button>
        </div>
        <div className="mx-auto max-w-[688px] overflow-hidden rounded-[22px] bg-white p-2 shadow-[0_18px_50px_rgba(20,2,73,0.2)] sm:p-3">
          <Image
            src={MOBILE_FLOORPLAN_IMAGE}
            alt={props.floorplanAlt}
            width={688}
            height={1312}
            sizes="(max-width: 767px) calc(100vw - 56px), 688px"
            className="h-auto w-full rounded-[16px]"
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <StandShowcase {...props} />
    </div>
  );
}
