"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function norm(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createEmailGroup(formData: FormData) {
  await requireRole("admin");

  const name = norm(formData.get("name"));
  const description = norm(formData.get("description")) || null;
  const memberType = norm(formData.get("member_type")) as "company" | "student";

  if (!name) throw new Error("Navn er påkrevd.");
  if (!["company", "student"].includes(memberType)) throw new Error("Ugyldig gruppentype.");

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("email_groups").insert({ name, description, member_type: memberType });
  if (error) throw new Error(`Kunne ikke opprette gruppe: ${error.message}`);

  revalidatePath("/admin/email/groups");
  redirect("/admin/email/groups");
}

export async function deleteEmailGroup(formData: FormData) {
  await requireRole("admin");

  const id = norm(formData.get("id"));
  if (!id) throw new Error("Gruppe-ID mangler.");

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("email_groups").delete().eq("id", id);
  if (error) throw new Error(`Kunne ikke slette gruppe: ${error.message}`);

  revalidatePath("/admin/email/groups");
  redirect("/admin/email/groups");
}

export async function addGroupMember(formData: FormData) {
  await requireRole("admin");

  const groupId = norm(formData.get("group_id"));
  const memberId = norm(formData.get("member_id"));
  const memberType = norm(formData.get("member_type")) as "company" | "student";

  if (!groupId || !memberId) throw new Error("Gruppe og medlem er påkrevd.");

  const supabase = createAdminSupabaseClient();

  let email = "";
  let displayName = "";

  if (memberType === "company") {
    const { data } = await supabase
      .from("event_companies")
      .select("invited_email, companies(name)")
      .eq("company_id", memberId)
      .not("invited_email", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    email = data?.invited_email ?? "";
    displayName = (data?.companies as { name?: string } | null)?.name ?? "";

    if (!email) {
      const { data: co } = await supabase.from("companies").select("name").eq("id", memberId).single();
      displayName = co?.name ?? "";
    }
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
      ? { group_id: groupId, company_id: memberId, email, display_name: displayName }
      : { group_id: groupId, student_id: memberId, email, display_name: displayName };

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
