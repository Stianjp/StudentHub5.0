import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { assertSupabaseEnv } from "@/lib/supabase/env";

export function createRouteSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = assertSupabaseEnv();
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
