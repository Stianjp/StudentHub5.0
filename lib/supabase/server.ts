import { cookies, headers } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import { resolveCookieDomain } from "@/lib/supabase/cookie-domain";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const host = (await headers()).get("host");
  const { supabaseUrl, supabaseAnonKey, cookieDomain } = assertSupabaseEnv();
  const domain = resolveCookieDomain(host, cookieDomain);

  const client = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Middleware handles refresh; avoid refresh-token calls in Server Components.
      autoRefreshToken: false,
    },
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options, domain });
        } catch {
          // Setting cookies can fail in Server Components. Middleware handles refresh.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options, domain });
        } catch {
          // No-op in Server Components.
        }
      },
    },
  });

  function extractUserFromCookies() {
    const allCookies = cookieStore.getAll();
    for (const cookie of allCookies) {
      if (!cookie.name.startsWith("sb-")) continue;
      const value = cookie.value;
      try {
        const json = Buffer.from(value, "base64").toString("utf8");
        const parsed = JSON.parse(json);
        const session = parsed?.currentSession ?? parsed?.session ?? parsed;
        if (session?.user) return session.user;
      } catch {
        // ignore parse errors
      }
    }
    return null;
  }

  const originalGetUser = client.auth.getUser.bind(client.auth);
  (client.auth as any).getUser = async (...args: any[]) => {
    try {
      const result = await originalGetUser(...args);
      if (result?.data?.user) return result;
      const cookieUser = extractUserFromCookies();
      if (cookieUser) return { data: { user: cookieUser }, error: null };
      return result;
    } catch (error) {
      const message = (error as { message?: string }).message?.toLowerCase() ?? "";
      const code = (error as { code?: string }).code;
      if (code === "refresh_token_not_found" || message.includes("refresh token not found")) {
        const cookieUser = extractUserFromCookies();
        if (cookieUser) return { data: { user: cookieUser }, error: null };
        return { data: { user: null }, error: null };
      }
      throw error;
    }
  };

  return client;
}
