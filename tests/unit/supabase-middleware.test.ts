import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  cookieOptions: null as null | {
    getAll: () => Array<{ name: string; value: string }>;
  },
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url, _key, options) => {
    mocks.cookieOptions = options.cookies;
    return { auth: { getUser: mocks.getUser } };
  }),
}));

vi.mock("@/lib/supabase/env", () => ({
  assertSupabaseEnv: () => ({
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "test-key",
    cookieDomain: ".oslostudenthub.no",
  }),
  shouldBypassSupabaseInDev: () => false,
}));

import { updateSession } from "@/lib/supabase/middleware";

describe("Supabase session middleware", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.cookieOptions = null;
  });

  it("passes every session-cookie chunk to Supabase without deleting it first", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const request = new NextRequest("https://student.oslostudenthub.no/auth/callback", {
      headers: {
        cookie: [
          "sb-example-auth-token.0=first-chunk",
          "sb-example-auth-token.1=second-chunk",
          "sb-example-auth-token-code-verifier=verifier",
        ].join("; "),
      },
    });

    const response = await updateSession(request);

    expect(mocks.cookieOptions?.getAll().map(({ name }) => name)).toEqual([
      "sb-example-auth-token.0",
      "sb-example-auth-token.1",
      "sb-example-auth-token-code-verifier",
    ]);
    expect(response.cookies.getAll()).toEqual([]);
  });
});
