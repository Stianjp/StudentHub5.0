"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { TableRow } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export type StandBookingPreview = {
  companyName: string;
  logoUrl: string | null;
  candidateSummary: string | null;
  candidateLevelLabel: string | null;
};

export type StandMapStand = Pick<
  TableRow<"event_registration_stands">,
  "id" | "stand_code" | "display_label" | "package_tier" | "x" | "y" | "width" | "height" | "status" | "assigned_application_id"
> & {
  bookingPreview?: StandBookingPreview | null;
};

type StandMapProps = {
  floorplanImagePath: string;
  floorplanAlt: string;
  floorplanWidth: number;
  floorplanHeight: number;
  stands: StandMapStand[];
  selectedStandId?: string | null;
  onSelectStand?: (standId: string) => void;
  className?: string;
  maxWidthClassName?: string;
  testId?: string;
};

function standStateClass(stand: StandMapStand, isSelected: boolean) {
  if (stand.status !== "available" || stand.assigned_application_id) {
    return stand.bookingPreview
      ? "border-primary/30 bg-primary/80 text-white/85 opacity-80"
      : "border-primary/20 bg-primary/70 text-surface/60 opacity-55";
  }
  if (stand.package_tier === "platinum") {
    return isSelected
      ? "z-20 border-[#140249] bg-[#f7b3c1] text-primary"
      : "border-white/80 bg-[#f7b3c1]/80 text-primary";
  }
  if (stand.package_tier === "gold") {
    return isSelected
      ? "z-20 border-[#140249] bg-[#ffd85a] text-primary"
      : "border-primary/50 bg-[#ffd85a]/85 text-primary";
  }
  if (stand.package_tier === "silver") {
    return isSelected
      ? "z-20 border-[#140249] bg-[#b7e7ff] text-primary"
      : "border-primary/40 bg-[#b7e7ff]/85 text-primary";
  }
  return isSelected
    ? "z-20 border-[#140249] bg-[#c5f1bb] text-primary"
    : "border-primary/40 bg-[#c5f1bb]/85 text-primary";
}

export function StandMap({
  floorplanImagePath,
  floorplanAlt,
  floorplanWidth,
  floorplanHeight,
  stands,
  selectedStandId,
  onSelectStand,
  className,
  maxWidthClassName,
  testId,
}: StandMapProps) {
  const isInteractive = typeof onSelectStand === "function";
  const [activeBookedStandId, setActiveBookedStandId] = useState<string | null>(null);
  const activeBookedStand = useMemo(
    () => stands.find((stand) => stand.id === activeBookedStandId && stand.bookingPreview) ?? null,
    [activeBookedStandId, stands],
  );

  return (
    <div className={cn("relative overflow-hidden rounded-[32px] border border-primary/15 bg-[#f6f0ff] p-3", className)}>
      <div
        data-testid={testId ?? "stand-map-canvas"}
        className={cn("relative mx-auto w-full overflow-hidden rounded-[28px] bg-white shadow-soft", maxWidthClassName ?? "max-w-[620px]")}
        style={{ aspectRatio: `${floorplanWidth} / ${floorplanHeight}` }}
      >
        <Image
          src={floorplanImagePath}
          alt={floorplanAlt}
          fill
          sizes="(max-width: 768px) 100vw, 620px"
          className="object-contain"
          priority
          unoptimized
        />
        {stands.map((stand) => {
          const unavailable = stand.status !== "available" || Boolean(stand.assigned_application_id);
          const isSelected = selectedStandId === stand.id;
          const isBooked = unavailable && Boolean(stand.bookingPreview);

          return (
            <button
              key={stand.id}
              type="button"
              onClick={() => {
                if (!unavailable) {
                  onSelectStand?.(stand.id);
                  return;
                }
                if (isBooked) {
                  setActiveBookedStandId(stand.id);
                }
              }}
              onMouseEnter={() => {
                if (isBooked) setActiveBookedStandId(stand.id);
              }}
              onMouseLeave={() => {
                if (isBooked) setActiveBookedStandId((current) => (current === stand.id ? null : current));
              }}
              onFocus={() => {
                if (isBooked) setActiveBookedStandId(stand.id);
              }}
              onBlur={() => {
                if (isBooked) setActiveBookedStandId((current) => (current === stand.id ? null : current));
              }}
              aria-label={stand.display_label ?? stand.stand_code}
              aria-pressed={isSelected}
              aria-disabled={unavailable}
              data-testid={`stand-map-stand-${stand.id}`}
              style={{
                left: `${stand.x}%`,
                top: `${stand.y}%`,
                width: `${stand.width}%`,
                height: `${stand.height}%`,
              }}
              className={cn(
                "absolute flex items-center justify-center overflow-hidden rounded-[4px] border px-0.5 text-center text-[8px] font-bold leading-none tracking-tight transition duration-150 md:text-[9px]",
                standStateClass(stand, isSelected),
                isInteractive && !unavailable ? "hover:brightness-[0.98]" : undefined,
                isInteractive ? "focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-0 focus-visible:outline-none" : undefined,
                !isInteractive ? "pointer-events-none" : undefined,
                unavailable && !isBooked ? "cursor-not-allowed" : undefined,
              )}
            >
              {isSelected ? (
                <span
                  aria-hidden="true"
                  className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-[#FE9A70] ring-1 ring-white"
                />
              ) : null}
              <span className="block truncate">{stand.display_label ?? stand.stand_code}</span>
            </button>
          );
        })}
      </div>
      {activeBookedStand?.bookingPreview ? (
        <div className="mx-auto mt-3 max-w-[620px] rounded-[28px] border border-primary/15 bg-white/95 p-4 shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/10 bg-[#f6f0ff]">
              {activeBookedStand.bookingPreview.logoUrl ? (
                <Image
                  src={activeBookedStand.bookingPreview.logoUrl}
                  alt={`Logo for ${activeBookedStand.bookingPreview.companyName}`}
                  width={80}
                  height={80}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <span className="px-3 text-center text-xs font-bold uppercase tracking-wider text-primary/55">
                  {activeBookedStand.bookingPreview.companyName}
                </span>
              )}
            </div>
            <div className="grid gap-1">
              <p className="text-xs font-bold uppercase tracking-widest text-[#6d28d9]">
                Booket stand
              </p>
              <h3 className="text-lg font-bold text-primary">
                {activeBookedStand.bookingPreview.companyName}
              </h3>
              <p className="text-sm text-ink/75">
                {activeBookedStand.display_label ?? activeBookedStand.stand_code}
              </p>
              {activeBookedStand.bookingPreview.candidateSummary ? (
                <p className="text-sm text-ink/80">
                  <span className="font-semibold text-primary">Interessert i:</span>{" "}
                  {activeBookedStand.bookingPreview.candidateSummary}
                </p>
              ) : null}
              {activeBookedStand.bookingPreview.candidateLevelLabel ? (
                <p className="text-sm text-ink/80">
                  <span className="font-semibold text-primary">Studienivå:</span>{" "}
                  {activeBookedStand.bookingPreview.candidateLevelLabel}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
