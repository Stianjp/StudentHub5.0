import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
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
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options, domain });
          });
        } catch {
          // Setting cookies can fail in Server Components. Middleware handles refresh.
        }
      },
    },
  });

  return client;
}
