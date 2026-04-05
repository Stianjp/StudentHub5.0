"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getCompanyWithDetails, getPreferredCompanyContactEmail } from "@/lib/admin";
import {
  clearDynamicEmailGroupMembers,
  parseEmailGroupFormData,
  syncDynamicEmailGroups,
} from "@/lib/email-groups";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function norm(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createEmailGroup(formData: FormData) {
  await requireRole("admin");

  const payload = parseEmailGroupFormData(formData);

  const supabase = createAdminSupabaseClient();
  const { data: group, error } = await supabase
    .from("email_groups")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(`Kunne ikke opprette gruppe: ${error.message}`);

  if (group?.id && payload.sync_mode === "dynamic_registration") {
    await syncDynamicEmailGroups({ groupIds: [group.id] });
  }

  revalidatePath("/admin/email/groups");
  revalidatePath("/admin/email");
  redirect("/admin/email/groups");
}

export async function updateEmailGroup(formData: FormData) {
  await requireRole("admin");

  const id = norm(formData.get("id"));
  if (!id) throw new Error("Gruppe-ID mangler.");

  const payload = parseEmailGroupFormData(formData);

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("email_groups")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(`Kunne ikke oppdatere gruppe: ${error.message}`);

  if (payload.sync_mode === "dynamic_registration") {
    await syncDynamicEmailGroups({ groupIds: [id] });
  } else {
    await clearDynamicEmailGroupMembers(id);
  }

  revalidatePath("/admin/email/groups");
  revalidatePath(`/admin/email/groups/${id}`);
  revalidatePath("/admin/email");
  redirect(`/admin/email/groups/${id}`);
}

export async function deleteEmailGroup(formData: FormData) {
  await requireRole("admin");

  const id = norm(formData.get("id"));
  if (!id) throw new Error("Gruppe-ID mangler.");

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("email_groups").delete().eq("id", id);
  if (error) throw new Error(`Kunne ikke slette gruppe: ${error.message}`);

  revalidatePath("/admin/email/groups");
  revalidatePath("/admin/email");
  redirect("/admin/email/groups");
}

export async function addGroupMember(formData: FormData) {
  await requireRole("admin");

  const groupId = norm(formData.get("group_id"));
  const memberId = norm(formData.get("member_id"));
  const memberType = norm(formData.get("member_type")) as "company" | "student";

  if (!groupId || !memberId) throw new Error("Gruppe og medlem er påkrevd.");

  const supabase = createAdminSupabaseClient();
  const { data: group } = await supabase
    .from("email_groups")
    .select("sync_mode")
    .eq("id", groupId)
    .single();

  if (group?.sync_mode === "dynamic_registration") {
    throw new Error("Denne gruppen styres automatisk. Endre filteret i gruppeoppsettet i stedet.");
  }

  let email = "";
  let displayName = "";

  if (memberType === "company") {
    const [company, resolvedEmail] = await Promise.all([
      getCompanyWithDetails(memberId),
      getPreferredCompanyContactEmail(memberId),
    ]);

    displayName = company.name ?? "";
    email = resolvedEmail ?? "";
  } else {
    const { data } = await supabase
      .from("students")
      .select("email, full_name")
      .eq("id", memberId)
      .single();

    email = data?.email ?? "";
    displayName = data?.full_name ?? "";
  }

  if (!email) throw new Error("Ingen e-postadresse funnet for dette medlemmet.");

  const insert =
    memberType === "company"
      ? { group_id: groupId, company_id: memberId, email, display_name: displayName, source: "manual" as const }
      : { group_id: groupId, student_id: memberId, email, display_name: displayName, source: "manual" as const };

  const { error } = await supabase.from("email_group_members").insert(insert);
  if (error) throw new Error(`Kunne ikke legge til medlem: ${error.message}`);

  revalidatePath(`/admin/email/groups/${groupId}`);
}

export async function addManualGroupMember(formData: FormData) {
  await requireRole("admin");

  const groupId = norm(formData.get("group_id"));
  const email = norm(formData.get("email"));
  const displayName = norm(formData.get("display_name")) || null;

  if (!groupId) throw new Error("Gruppe-ID mangler.");
  if (!email || !email.includes("@")) throw new Error("Ugyldig e-postadresse.");

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("email_group_members").insert({
    group_id: groupId,
    email,
    display_name: displayName,
    source: "manual",
  });
  if (error) throw new Error(`Kunne ikke legge til: ${error.message}`);

  revalidatePath(`/admin/email/groups/${groupId}`);
}

export async function removeGroupMember(formData: FormData) {
  await requireRole("admin");

  const memberId = norm(formData.get("member_id"));
  const groupId = norm(formData.get("group_id"));
  if (!memberId) throw new Error("Medlem-ID mangler.");

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("email_group_members").delete().eq("id", memberId);
  if (error) throw new Error(`Kunne ikke fjerne medlem: ${error.message}`);

  revalidatePath(`/admin/email/groups/${groupId}`);
}

export async function syncEmailGroupMembers(formData: FormData) {
  await requireRole("admin");

  const groupId = norm(formData.get("group_id"));
  if (!groupId) throw new Error("Gruppe-ID mangler.");

  await syncDynamicEmailGroups({ groupIds: [groupId] });

  revalidatePath("/admin/email/groups");
  revalidatePath(`/admin/email/groups/${groupId}`);
  revalidatePath("/admin/email");
}
