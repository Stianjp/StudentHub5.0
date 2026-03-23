"use client";

import Image from "next/image";
import type { TableRow } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export type StandMapStand = Pick<
  TableRow<"event_registration_stands">,
  "id" | "stand_code" | "display_label" | "package_tier" | "x" | "y" | "width" | "height" | "status" | "assigned_application_id"
>;

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
  if (isSelected) {
    return "border-secondary bg-secondary/85 text-primary shadow-soft";
  }
  if (stand.status !== "available" || stand.assigned_application_id) {
    return "border-primary/20 bg-primary/70 text-surface/60 cursor-not-allowed opacity-55";
  }
  if (stand.package_tier === "platinum") {
    return "border-white/80 bg-[#f7b3c1]/80 text-primary";
  }
  if (stand.package_tier === "gold") {
    return "border-primary/50 bg-[#ffd85a]/85 text-primary";
  }
  if (stand.package_tier === "silver") {
    return "border-primary/40 bg-[#b7e7ff]/85 text-primary";
  }
  return "border-primary/40 bg-[#c5f1bb]/85 text-primary";
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
        />
        {stands.map((stand) => {
          const unavailable = stand.status !== "available" || Boolean(stand.assigned_application_id);
          const isSelected = selectedStandId === stand.id;

          return (
            <button
              key={stand.id}
              type="button"
              onClick={() => {
                if (!unavailable) {
                  onSelectStand?.(stand.id);
                }
              }}
              disabled={unavailable}
              aria-label={stand.display_label ?? stand.stand_code}
              aria-pressed={isSelected}
              data-testid={`stand-map-stand-${stand.id}`}
              style={{
                left: `${stand.x}%`,
                top: `${stand.y}%`,
                width: `${stand.width}%`,
                height: `${stand.height}%`,
              }}
              className={cn(
                "absolute flex items-center justify-center overflow-hidden rounded-md border px-1 text-center text-[9px] font-bold leading-none transition md:text-[10px]",
                standStateClass(stand, isSelected),
                !isInteractive ? "pointer-events-none" : undefined,
              )}
            >
              <span className="block truncate">{stand.display_label ?? stand.stand_code}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
