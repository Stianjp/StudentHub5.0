import Image from "next/image";
import type { PartnerLogoItem } from "@/lib/hovedside/partner-logos";

type Props = {
  items: PartnerLogoItem[];
};

function PartnerLogoTrack({
  items,
  reverse = false,
}: {
  items: PartnerLogoItem[];
  reverse?: boolean;
}) {
  const loopItems = [...items, ...items];

  return (
    <div className="partner-carousel-mask">
      <div
        className={`partner-carousel-track ${
          reverse ? "partner-carousel-track-reverse" : ""
        }`}
      >
        {loopItems.map((item, index) => (
          <div
            key={`${item.src}-${index}`}
            className="flex min-w-[180px] items-center justify-center rounded-[26px] border border-white/55 bg-white px-6 py-5 shadow-[0_18px_50px_rgba(20,2,73,0.18)] sm:min-w-[220px]"
          >
            <div className="relative h-12 w-full sm:h-14">
              <Image
                src={item.src}
                alt={item.alt}
                fill
                className="object-contain"
                sizes="220px"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PartnerLogoCarousel({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-[28px] border border-white/12 bg-white/8 px-6 py-10 text-center text-sm text-mist/65">
        Partnerlogoer vises her når filer er lagt i `public/Partner-site/Partner-logos`.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PartnerLogoTrack items={items} />
      {items.length > 5 ? (
        <PartnerLogoTrack items={[...items].reverse()} reverse />
      ) : null}
    </div>
  );
}
