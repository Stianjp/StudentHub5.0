import { expect, it } from "vitest";
import { resolveAnalyticsMeasurementId, sanitizeAnalyticsPath } from "@/lib/analytics";

it("routes each requested domain to its own GA4 stream", () => {
  expect(resolveAnalyticsMeasurementId("oslostudenthub.no")).toBe("G-THBZXKH0Z6");
  expect(resolveAnalyticsMeasurementId("www.oslostudenthub.no")).toBe("G-THBZXKH0Z6");
  expect(resolveAnalyticsMeasurementId("eventregister.oslostudenthub.no")).toBe("G-GV3JX6XV6K");
  expect(resolveAnalyticsMeasurementId("student.oslostudenthub.no")).toBe("G-4PDD22BZ1P");
  expect(resolveAnalyticsMeasurementId("bedrift.oslostudenthub.no")).toBe("G-8411BGXCF1");
  expect(resolveAnalyticsMeasurementId("admin.oslostudenthub.no")).toBeNull();
  expect(resolveAnalyticsMeasurementId("preview.vercel.app")).toBeNull();
});

it("removes internal identifiers from analytics paths", () => {
  expect(sanitizeAnalyticsPath("/company/leads/lead-123")).toBe("/company/leads/:id");
  expect(sanitizeAnalyticsPath("/student/events/550e8400-e29b-41d4-a716-446655440000")).toBe("/student/events/:id");
  expect(sanitizeAnalyticsPath("/hovedside/partners")).toBe("/hovedside/partners");
});
