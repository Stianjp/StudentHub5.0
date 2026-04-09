import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  alt?: string;
  className?: string;
  /** Aspect ratio preset */
  aspect?: "video" | "square" | "wide";
};

const aspectMap = {
  video: "aspect-video",
  square: "aspect-square",
  wide: "aspect-[3/1]",
};

export function PlaceholderImage({
  alt = "Placeholder",
  className,
  aspect = "video",
}: Props) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl bg-mist/60",
        aspectMap[aspect],
        className,
      )}
      role="img"
      aria-label={alt}
    >
      <div className="text-center text-purple/40">
        <ImageIcon size={32} className="mx-auto" />
        <span className="mt-1 block text-xs">{alt}</span>
      </div>
    </div>
  );
}
