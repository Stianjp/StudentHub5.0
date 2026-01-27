"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ role }: { role: "student" | "company" | "admin" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push(`/auth/sign-in?role=${role}`);
      router.refresh();
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      className="portal-top-link"
      onClick={handleLogout}
      disabled={isPending}
    >
      Logg ut
    </Button>
  );
}
