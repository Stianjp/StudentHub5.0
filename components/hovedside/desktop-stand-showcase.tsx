"use client";

import { StandShowcase } from "@/components/hovedside/stand-showcase";
import type { PublicRegistrationStand } from "@/lib/event-registration";

type Props = {
  floorplanImagePath: string;
  floorplanAlt: string;
  floorplanWidth: number;
  floorplanHeight: number;
  stands: PublicRegistrationStand[];
};

export function DesktopStandShowcase(props: Props) {
  return <StandShowcase {...props} />;
}
