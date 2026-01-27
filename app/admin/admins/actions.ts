"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function inviteAdmin(formData: FormData) {
  await requireRole("admin");
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    throw new Error("E-post må fylles ut.");
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.auth.admin.inviteUserByEmail(email);
  if (error) throw error;

  revalidatePath("/admin");
}
