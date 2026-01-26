import { redirect } from "next/navigation";
import type { TableRow } from "@/lib/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Profile = TableRow<"profiles">;

const roleRedirect: Record<Profile["role"], string> = {
  company: "/company",
  student: "/student",
  admin: "/admin",
};

export async function getUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    const isMissingSession =
      (error as { name?: string; message?: string }).name === "AuthSessionMissingError" ||
      (error as { message?: string }).message?.includes("Auth session missing");

    if (isMissingSession) {
      return null;
    }

    throw error;
  }

  return data.user ?? null;
}

export async function getProfile() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Profile | null;
}

export async function ensureProfile(role: Profile["role"]) {
  const user = await getUser();
  if (!user) {
    const nextPath = roleRedirect[role] ?? "/";
    redirect(`/auth/sign-in?role=${role}&next=${encodeURIComponent(nextPath)}`);
  }

  const supabase = await createServerSupabaseClient();
  const now = new Date().toISOString();

  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  if (existing) {
    if (existing.role !== role && existing.role !== "admin") {
      const nextPath = roleRedirect[role] ?? "/";
      redirect(`/auth/sign-in?role=${role}&next=${encodeURIComponent(nextPath)}`);
    }
    return existing;
  }

  if (role === "admin") {
    redirect("/auth/sign-in?role=admin&reason=admin-required&next=%2Fadmin");
  }

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({ id: user.id, role, created_at: now, updated_at: now })
    .select("*")
    .single();

  if (insertError) {
    throw insertError;
  }

  return created;
}

export async function requireRole(role: Profile["role"]) {
  const profile = await ensureProfile(role);
  if (profile.role === role || profile.role === "admin") {
    return profile;
  }

  redirect(`/auth/sign-in?role=${role}`);
}
