const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

export function hasSupabaseEnv() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function hasAdminSupabaseEnv() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export function shouldBypassSupabaseInDev() {
  return process.env.NODE_ENV !== "production" && !hasSupabaseEnv();
}

export function assertSupabaseEnv(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
  cookieDomain: string | undefined;
} {
  if (!hasSupabaseEnv()) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return {
    supabaseUrl: supabaseUrl as string,
    supabaseAnonKey: supabaseAnonKey as string,
    cookieDomain,
  };
}
