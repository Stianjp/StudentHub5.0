import Script from "next/script";

const CHECKIN_REGISTRATION_SRC = "https://registration.checkin.no/registration.loader.js";

type CheckinRegistrationEmbedProps = {
  eventId: string | number;
  title?: string;
  description?: string;
};

export function CheckinRegistrationEmbed({
  eventId,
  title = "Registrer deg her",
  description = "Skjemaet under lastes fra Checkin og brukes til å hente ut gratis billett i studentportalen.",
}: CheckinRegistrationEmbedProps) {
  return (
    <div className="grid gap-4">
      <div className="rounded-[28px] border border-primary/10 bg-white p-4 text-[#140249] shadow-[0_18px_50px_rgba(20,2,73,0.08)] md:p-6">
        <div className="mb-4 space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#FE9A70]">{title}</p>
          <p className="text-sm leading-relaxed text-[#140249]/80">{description}</p>
        </div>
        <div
          id="checkin_registration"
          className="min-h-[620px] rounded-[22px] bg-mist/40 p-3 md:p-4"
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
