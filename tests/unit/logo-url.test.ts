import { describe, expect, it } from "vitest";
import { shouldUseDirectImageUrl } from "@/lib/logo-url";

describe("shouldUseDirectImageUrl", () => {
  it.each([
    "https://example.supabase.co/storage/v1/object/sign/logos/logo.png?token=test",
    "https://example.supabase.co/storage/v1/object/authenticated/logos/logo.png",
    "https://example.supabase.co/storage/v1/render/image/sign/logos/logo.png?token=test",
    "https://example.supabase.co/storage/v1/render/image/authenticated/logos/logo.png",
  ])("serves signed Supabase images directly: %s", (url) => {
    expect(shouldUseDirectImageUrl(url)).toBe(true);
  });

  it("allows Next.js to optimize ordinary images", () => {
    expect(shouldUseDirectImageUrl("/brand/logo.png")).toBe(false);
  });
});
