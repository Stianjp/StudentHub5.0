import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { assertSupabaseEnv, shouldBypassSupabaseInDev } from "@/lib/supabase/env";
import { resolveCookieDomain } from "@/lib/supabase/cookie-domain";
import { isRecoverableRefreshTokenError } from "@/lib/supabase/auth-errors";

export async function updateSession(request: NextRequest) {
  if (shouldBypassSupabaseInDev()) {
    return NextResponse.next({ request });
  }

  const { supabaseUrl, supabaseAnonKey, cookieDomain } = assertSupabaseEnv();
  const domain = resolveCookieDomain(request.headers.get("host"), cookieDomain);
  let response = NextResponse.next({ request });

  function clearSessionCookies() {
    request.cookies
      .getAll()
      .filter(
        (cookie) => cookie.name.startsWith("sb-") && !cookie.name.endsWith("-code-verifier"),
      )
      .forEach((cookie) => {
        request.cookies.set({ name: cookie.name, value: "" });
        response.cookies.set({
          name: cookie.name,
          value: "",
          maxAge: 0,
          path: "/",
        });
        if (domain) {
          response.cookies.set({
            name: cookie.name,
            value: "",
            maxAge: 0,
            path: "/",
            domain,
          });
        }
      });
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, { ...options, domain });
        });
      },
    },
  });

  try {
    const { error } = await supabase.auth.getUser();
    if (error && isRecoverableRefreshTokenError(error)) {
      clearSessionCookies();
    }
  } catch (error) {
    if (isRecoverableRefreshTokenError(error as { code?: string; message?: string })) {
      clearSessionCookies();
      return response;
    }
    throw error;
  }
  return response;
}
