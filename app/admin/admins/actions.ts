"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isOshAdminEmail } from "@/lib/auth-registration";

export async function inviteAdmin(formData: FormData) {
  await requireRole("admin");
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    throw new Error("E-post må fylles ut.");
  }
  if (!isOshAdminEmail(email)) {
    throw new Error("Admin-brukere må ha en @oslostudenthub.no-adresse.");
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.auth.admin.inviteUserByEmail(email);
  if (error) throw error;

  revalidatePath("/admin");
}
