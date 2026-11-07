const MEASUREMENT_IDS: Record<string, string> = {
  "oslostudenthub.no": "G-THBZXKH0Z6",
  "www.oslostudenthub.no": "G-THBZXKH0Z6",
  "eventregister.oslostudenthub.no": "G-GV3JX6XV6K",
  "student.oslostudenthub.no": "G-4PDD22BZ1P",
  "bedrift.oslostudenthub.no": "G-8411BGXCF1",
};

export function resolveAnalyticsMeasurementId(hostname: string) {
  const normalized = hostname.toLowerCase();
  if (normalized === "localhost" || normalized.endsWith(".localhost")) {
    return process.env.NEXT_PUBLIC_GA_TEST_MEASUREMENT_ID ?? null;
  }
  return MEASUREMENT_IDS[normalized] ?? null;
}

export function sanitizeAnalyticsPath(pathname: string) {
  return pathname
    .replace(/\/leads\/[^/]+/gi, "/leads/:id")
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi, "/:id")
    .replace(/\/[^/]*@[^/]+/g, "/:id");
}
