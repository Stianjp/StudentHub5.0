import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { assertSupabaseEnv } from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  const { supabaseUrl, supabaseAnonKey, cookieDomain } = assertSupabaseEnv();
  const domain = cookieDomain ?? undefined;
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options, domain });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value, ...options, domain });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options, domain });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value: "", ...options, domain });
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}
