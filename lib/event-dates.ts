/** Admin scheduling uses Europe/Oslo regardless of the server's timezone. */
export function osloDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
  return parts.replace(" ", "T");
}
export function parseOsloDateTime(value: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Velg en gyldig dato og tid.");
  const nominal = Date.parse(value + ":00Z");
  // Oslo is UTC+1 or UTC+2. Reject the nonexistent hour during spring DST.
  const candidates = [1, 2]
    .map((offset) => new Date(nominal - offset * 3600000).toISOString())
    .filter((iso) => osloDateTimeLocal(iso) === value);
  if (!candidates.length)
    throw new Error("Denne lokale tiden finnes ikke. Velg en annen tid.");
  return candidates[0];
}
export function campaignStatus(
  active: boolean,
  campaign: {
    is_published: boolean;
    opens_at: string | null;
    closes_at: string | null;
  },
  now = Date.now(),
) {
  if (!active || !campaign.is_published) return "Skjult";
  if (campaign.opens_at && Date.parse(campaign.opens_at) > now)
    return "Planlagt åpning";
  if (campaign.closes_at && Date.parse(campaign.closes_at) < now)
    return "Stengt";
  return "Åpen";
}
