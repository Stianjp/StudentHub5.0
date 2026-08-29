import Script from "next/script";

const CHECKIN_REGISTRATION_SRC = "https://registration.checkin.no/registration.loader.js";

type CheckinRegistrationEmbedProps = {
  eventId: string | number;
  title?: string;
  description?: string;
  showHeader?: boolean;
};

export function CheckinRegistrationEmbed({
  eventId,
  title = "Registrer deg her",
  description = "Skjemaet under lastes fra Checkin og brukes til å hente ut gratis billett i studentportalen.",
  showHeader = true,
}: CheckinRegistrationEmbedProps) {
  return (
    <div className="grid min-w-0 gap-4">
      <div className="min-w-0 overflow-hidden rounded-2xl border border-primary/10 bg-white p-1 text-[#140249] shadow-[0_18px_50px_rgba(20,2,73,0.08)] sm:p-3 md:rounded-[28px] md:p-5">
        {showHeader ? (
          <div className="mb-4 space-y-1 px-2 pt-2 sm:px-1 sm:pt-1">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#FE9A70]">
              {title}
            </p>
            <p className="text-sm leading-relaxed text-[#140249]/80">
              {description}
            </p>
          </div>
        ) : null}
        <div
          id="checkin_registration"
          className="min-h-[620px] min-w-0 overflow-x-auto rounded-xl bg-white p-0 sm:p-2 md:min-h-[720px] md:rounded-[22px] md:p-3"
        />
      </div>
      <Script
        src={CHECKIN_REGISTRATION_SRC}
        data-event-id={String(eventId)}
        strategy="afterInteractive"
      />
    </div>
  );
}
