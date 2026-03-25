import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { assertSupabaseEnv } from "@/lib/supabase/env";

let publicSupabaseClient: ReturnType<typeof createClient<Database>> | null = null;

export function createPublicSupabaseClient() {
  if (publicSupabaseClient) {
    return publicSupabaseClient;
  }

  const { supabaseUrl, supabaseAnonKey } = assertSupabaseEnv();
  publicSupabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return publicSupabaseClient;
}
