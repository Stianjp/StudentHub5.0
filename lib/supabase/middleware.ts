import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import { resolveCookieDomain } from "@/lib/supabase/cookie-domain";

export async function updateSession(request: NextRequest) {
  const { supabaseUrl, supabaseAnonKey, cookieDomain } = assertSupabaseEnv();
  const domain = resolveCookieDomain(request.headers.get("host"), cookieDomain);
  let response = NextResponse.next({ request });

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
