"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

function roleFromHostname(hostname: string) {
  const host = hostname.toLowerCase();
  if (host.startsWith("student.")) return "student";
  if (host.startsWith("bedrift.")) return "company";
  if (host.startsWith("admin.")) return "admin";
  return null;
}

export function SessionGuard() {
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ error }) => {
      if (!error) return;
      const message = error.message?.toLowerCase() ?? "";
      if (!message.includes("refresh token")) return;

      supabase.auth.signOut({ scope: "local" }).finally(() => {
        const role = roleFromHostname(window.location.hostname);
        const nextPath = role === "student" ? "/student" : role === "admin" ? "/admin" : "/company";
        const roleParam = role ?? "company";
        window.location.href = `/auth/sign-in?role=${roleParam}&next=${encodeURIComponent(nextPath)}`;
      });
    });
  }, []);

  return null;
}
