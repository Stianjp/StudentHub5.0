import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import { resolveCookieDomain } from "@/lib/supabase/cookie-domain";

export async function updateSession(request: NextRequest) {
  const { supabaseUrl, supabaseAnonKey, cookieDomain } = assertSupabaseEnv();
  const domain = resolveCookieDomain(request.headers.get("host"), cookieDomain);
  let response = NextResponse.next({ request });

  function extractRefreshToken(rawValue: string): string | null {
    if (!rawValue) return null;
    try {
      const parsed = JSON.parse(rawValue);
      if (parsed?.refresh_token) return parsed.refresh_token;
      if (parsed?.currentSession?.refresh_token) return parsed.currentSession.refresh_token;
      if (Array.isArray(parsed) && parsed[1]) return parsed[1];
    } catch {
      try {
        const decoded = atob(rawValue);
        return extractRefreshToken(decoded);
      } catch {
        return null;
      }
    }
    return null;
  }

  const sessionCookies = request.cookies.getAll().filter((cookie) => cookie.name.startsWith("sb-"));
  if (sessionCookies.length === 0) {
    return response;
  }

  const hasRefresh = sessionCookies.some((cookie) => Boolean(extractRefreshToken(cookie.value)));
  if (!hasRefresh) {
    sessionCookies.forEach((cookie) => {
      response.cookies.set({
        name: cookie.name,
        value: "",
        maxAge: 0,
        domain,
      });
    });
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value, ...options, domain });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value: "", ...options, domain });
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch (error) {
    const message = (error as { message?: string }).message?.toLowerCase() ?? "";
    const code = (error as { code?: string }).code;
    if (code === "refresh_token_not_found" || message.includes("refresh token not found")) {
      // Clear stale auth cookies without calling the auth API.
      request.cookies.getAll().forEach((cookie) => {
        if (cookie.name.startsWith("sb-")) {
          response.cookies.set({
            name: cookie.name,
            value: "",
            maxAge: 0,
            domain,
          });
        }
      });
      return response;
    }
    throw error;
  }
  return response;
}
