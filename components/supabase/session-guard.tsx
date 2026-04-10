"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function SessionGuard() {
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.stopAutoRefresh?.();
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith("sb-") || key.startsWith("supabase."))
        .forEach((key) => localStorage.removeItem(key));
    } catch {
      // ignore localStorage issues
    }
  }, []);

  return null;
}
