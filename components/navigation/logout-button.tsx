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
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Ignore sign-out errors and force redirect.
      } finally {
        const target = `/auth/sign-in?role=${role}`;
        if (typeof window !== "undefined") {
          window.location.assign(target);
          return;
        }
        router.replace(target);
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
