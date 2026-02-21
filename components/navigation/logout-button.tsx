"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function LogoutButton({
  role,
  className,
  children,
}: {
  role: "student" | "company" | "admin";
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      try {
        const supabase = createClient();
        // Local sign-out avoids refresh token network calls.
        await supabase.auth.signOut({ scope: "local" });
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
      className={cn("portal-top-link", className)}
      onClick={handleLogout}
      disabled={isPending}
    >
      {children ?? "Logg ut"}
    </button>
  );
}
