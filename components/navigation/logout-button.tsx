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
      className="rounded-full px-4 py-2 text-xs font-semibold text-surface hover:bg-secondary/15 hover:text-secondary hover:ring-2 hover:ring-secondary/60 hover:ring-offset-2 hover:ring-offset-primary"
      onClick={handleLogout}
      disabled={isPending}
    >
      Logg ut
    </Button>
  );
}
