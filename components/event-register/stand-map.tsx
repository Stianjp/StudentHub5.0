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
    return "z-20 scale-[1.04] border-[#140249] bg-[#140249] text-white ring-2 ring-white outline outline-2 outline-[#FE9A70] shadow-[0_0_0_4px_rgba(254,154,112,0.28),0_10px_24px_rgba(20,2,73,0.34)]";
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
                "absolute flex items-center justify-center overflow-hidden rounded-md border px-1 text-center text-[9px] font-bold leading-none transition duration-150 md:text-[10px]",
                standStateClass(stand, isSelected),
                isInteractive && !unavailable ? "hover:scale-[1.02] focus-visible:scale-[1.02]" : undefined,
                isInteractive ? "focus-visible:ring-2 focus-visible:ring-[#FE9A70] focus-visible:ring-offset-0 focus-visible:outline-none" : undefined,
                !isInteractive ? "pointer-events-none" : undefined,
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
    </div>
  );
}
