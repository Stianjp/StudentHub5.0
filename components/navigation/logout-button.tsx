"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ role }: { role: "student" | "company" | "admin" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Always redirect to sign-in even if signOut fails.
      } finally {
        router.replace(`/auth/sign-in?role=${role}`);
        router.refresh();
      }
    });
  };

  return (
    <button
      type="button"
      className="portal-top-link"
      onClick={handleLogout}
      disabled={isPending}
    >
      Logg ut
    </button>
  );
}
