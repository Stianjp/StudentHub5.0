/** Public feedback lives on a separate host; relative links on admin are rewritten. */
export function feedbackPublicUrl(folderSlug?: string, formSlug?: string) {
  const path = [folderSlug, formSlug].filter((part): part is string => Boolean(part)).map(encodeURIComponent).join("/");
  return `https://feedback.oslostudenthub.no/${path || "#skjemaer"}`;
}
