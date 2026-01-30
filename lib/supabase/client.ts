"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { assertSupabaseEnv } from "@/lib/supabase/env";
import { resolveCookieDomain } from "@/lib/supabase/cookie-domain";

type CookieOptions = {
  path?: string;
  maxAge?: number;
  expires?: Date;
  domain?: string;
  sameSite?: "lax" | "strict" | "none" | boolean;
  secure?: boolean;
};

function isBrowser() {
  return typeof document !== "undefined";
}

function buildCookieString(name: string, value: string, options: CookieOptions) {
  const parts = [`${name}=${value}`];
  parts.push(`Path=${options.path ?? "/"}`);
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }
  if (typeof options.sameSite === "string") {
    parts.push(`SameSite=${options.sameSite}`);
  }
  if (options.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function parseCookies() {
  if (!isBrowser()) return new Map<string, string>();
  const map = new Map<string, string>();
  document.cookie.split(";").forEach((cookie) => {
    const [rawName, ...rest] = cookie.trim().split("=");
    if (!rawName) return;
    map.set(rawName, decodeURIComponent(rest.join("=")));
  });
  return map;
}

export function createClient() {
  const { supabaseUrl, supabaseAnonKey, cookieDomain } = assertSupabaseEnv();

  if (!isBrowser()) {
    return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  const domain = resolveCookieDomain(window.location.hostname, cookieDomain);

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: true,
    },
    cookies: {
      getAll() {
        const cookies = parseCookies();
        return Array.from(cookies.entries()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          const cookieString = buildCookieString(name, value, {
            path: options?.path,
            maxAge: options?.maxAge,
            expires: options?.expires,
            sameSite: options?.sameSite,
            secure: options?.secure,
            domain,
          });
          document.cookie = cookieString;
        });
      },
    },
  });
}
