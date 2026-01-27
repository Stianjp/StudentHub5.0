import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { TableRow } from "@/lib/types/database";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { defaultPathForRole, roleFromHost, type AppRole } from "@/lib/host";

type Profile = TableRow<"profiles">;

const roleRedirect: Record<Profile["role"], string> = {
  company: "/company",
  student: "/student",
  admin: "/admin",
};

async function resolveHostRole() {
  const host = (await headers()).get("host");
  return roleFromHost(host);
}

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
    const hostRole = await resolveHostRole();
    const nextPath = defaultPathForRole(hostRole ?? role);
    const roleParam = hostRole ?? role;
    redirect(`/auth/sign-in?role=${roleParam}&next=${encodeURIComponent(nextPath)}`);
  }

  const hostRole = await resolveHostRole();

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
    if (hostRole && existing.role !== hostRole) {
      const nextPath = defaultPathForRole(hostRole);
      redirect(`/auth/sign-in?role=${hostRole}&next=${encodeURIComponent(nextPath)}`);
    }
    if (!hostRole && existing.role !== role && existing.role !== "admin") {
      const nextPath = roleRedirect[role] ?? "/";
      redirect(`/auth/sign-in?role=${role}&next=${encodeURIComponent(nextPath)}`);
    }
    return existing;
  }

  const effectiveRole: AppRole = hostRole ?? role;

  if (effectiveRole === "admin") {
    redirect("/auth/sign-in?role=admin&reason=admin-required&next=%2Fadmin");
  }

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({ id: user.id, role: effectiveRole, created_at: now, updated_at: now })
    .select("*")
    .single();

  if (insertError) {
    throw insertError;
  }

  return created;
}

export async function requireRole(role: Profile["role"]) {
  const profile = await ensureProfile(role);
  const hostRole = await resolveHostRole();
  if (hostRole) {
    if (profile.role === hostRole) return profile;
    const nextPath = defaultPathForRole(hostRole);
    redirect(`/auth/sign-in?role=${hostRole}&next=${encodeURIComponent(nextPath)}`);
  }

  if (profile.role === role || profile.role === "admin") return profile;
  redirect(`/auth/sign-in?role=${role}`);
}
