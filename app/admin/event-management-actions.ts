"use server";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { parseOsloDateTime } from "@/lib/event-dates";
import { includedQuantities } from "@/lib/event-order";

export async function refreshEventPages(eventId: string) {
  await requireRole("admin");
  for (const path of [
    "/hovedside",
    "/hovedside/events",
    "/event-register",
    "/student/events",
    `/student/events/${eventId}`,
    "/admin/events/overview",
    `/admin/events/${eventId}`,
    `/admin/events/${eventId}/placement`,
    "/admin/event-catalog",
  ])
    revalidatePath(path);
  revalidatePath("/event-register/[slug]", "page");
  for (const tag of [
    "website-events",
    "event-registration-public-campaign-detail",
    "event-registration-public-campaigns",
  ])
    revalidateTag(tag, { expire: 0 });
}
function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}
function price(form: FormData) {
  const value = text(form, "price").replace(",", ".");
  if (!value) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error("Pris må være et positivt beløp med høyst to desimaler.");
  return z
    .number()
    .int()
    .min(0)
    .max(1000000000)
    .parse(Math.round(Number(value) * 100));
}
async function run(
  form: FormData,
  operation: (eventId: string) => Promise<void>,
) {
  await requireRole("admin");
  const eventId = z.string().uuid().parse(text(form, "eventId"));
  const requested = text(form, "returnTo");
  const returnTo =
    requested.startsWith("/admin/") && !requested.includes("\\")
      ? requested
      : `/admin/events/${eventId}`;
  let message: string | null = null;
  try {
    await operation(eventId);
    await refreshEventPages(eventId);
  } catch (error) {
    message =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Kunne ikke lagre.";
  }
  redirect(
    `${returnTo}${returnTo.includes("?") ? "&" : "?"}${message ? `error=${encodeURIComponent(message)}` : "saved=1"}`,
  );
}
export async function saveEventPublication(form: FormData) {
  return run(form, async (eventId) => {
    const db = createAdminSupabaseClient();
    let campaignId = text(form, "campaignId") || null;
    const unpublish = text(form, "intent") === "unpublish";
    if (!campaignId && !unpublish) {
      const { data: campaigns, error } = await db
        .from("event_registration_campaigns")
        .select("id")
        .eq("event_id", eventId);
      if (error) throw error;
      if (campaigns?.length) throw new Error("Velg registreringskampanje.");
      const { data: event, error: eventError } = await db
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();
      if (eventError) throw eventError;
      const { data, error: createError } = await db
        .from("event_registration_campaigns")
        .insert({
          event_id: eventId,
          slug: event.slug,
          public_title: event.name,
          is_published: false,
        })
        .select("id")
        .single();
      if (createError) throw createError;
      campaignId = data.id;
    }
    const { error } = await db.rpc("set_event_publication", {
      event_uuid: eventId,
      campaign_uuid: campaignId,
      website: form.has("website"),
      registration: form.has("registration"),
      opening: parseOsloDateTime(text(form, "opensAt")),
      closing: parseOsloDateTime(text(form, "closesAt")),
      unpublish,
    });
    if (error) throw error;
  });
}
export async function saveCatalogAddon(form: FormData) {
  return run(form, async (eventId) => {
    const db = createAdminSupabaseClient();
    const payload = {
      event_id: eventId,
      name: z.string().min(1).max(120).parse(text(form, "name")),
      description: text(form, "description") || null,
      unit: z.string().min(1).max(40).parse(text(form, "unit")),
      unit_price_ore: price(form),
      is_active: form.has("isActive"),
      sort_order: z.coerce.number().int().parse(text(form, "sortOrder")),
      kind: z.enum(["item", "attendee_ticket"]).parse(text(form, "kind")),
    };
    if (payload.is_active && payload.unit_price_ore === null)
      throw new Error("Sett pris før tillegget aktiveres.");
    const id = text(form, "id");
    const result = id
      ? await db
          .from("event_addons")
          .update(payload)
          .eq("id", id)
          .eq("event_id", eventId)
          .select("id")
          .single()
      : await db.from("event_addons").insert(payload);
    if (result.error) throw result.error;
  });
}
export async function saveCatalogPackage(form: FormData) {
  return run(form, async (eventId) => {
    const db = createAdminSupabaseClient();
    const campaignId = z.string().uuid().parse(text(form, "campaignId"));
    const { error: campaignError } = await db
      .from("event_registration_campaigns")
      .select("id")
      .eq("id", campaignId)
      .eq("event_id", eventId)
      .single();
    if (campaignError) throw campaignError;
    const { data: addons, error: addonError } = await db
      .from("event_addons")
      .select("id")
      .eq("event_id", eventId);
    if (addonError) throw addonError;
    const included = includedQuantities(
      Object.fromEntries(
        ((addons as { id: string }[]) ?? []).map((a) => [
          a.id,
          Number(text(form, `included:${a.id}`) || 0),
        ]),
      ),
    );
    const payload = {
      campaign_id: campaignId,
      package_key: z.string().min(2).parse(text(form, "packageKey")),
      public_name: z.string().min(2).parse(text(form, "name")),
      description: text(form, "description") || null,
      mapped_package: z
        .enum(["standard", "silver", "gold", "platinum"])
        .parse(text(form, "mappedPackage")),
      price_ore: price(form),
      included_quantities: included,
      is_active: form.has("isActive"),
      sort_order: z.coerce.number().int().parse(text(form, "sortOrder")),
      internal_capacity: text(form, "capacity")
        ? z.coerce.number().int().min(0).parse(text(form, "capacity"))
        : null,
    };
    if (payload.is_active && payload.price_ore === null)
      throw new Error("Sett pris før pakken aktiveres.");
    const id = text(form, "id");
    const result = id
      ? await db
          .from("event_registration_packages")
          .update(payload)
          .eq("id", id)
          .eq("campaign_id", campaignId)
          .select("id")
          .single()
      : await db.from("event_registration_packages").insert(payload);
    if (result.error) throw result.error;
  });
}
export async function copyEventCatalog(form: FormData) {
  return run(form, async (eventId) => {
    const db = createAdminSupabaseClient();
    const target = z.string().uuid().parse(text(form, "campaignId"));
    const { error: check } = await db
      .from("event_registration_campaigns")
      .select("id")
      .eq("id", target)
      .eq("event_id", eventId)
      .single();
    if (check) throw check;
    const { error } = await db.rpc("copy_event_catalog", {
      source_campaign: z.string().uuid().parse(text(form, "sourceCampaign")),
      target_campaign: target,
    });
    if (error) throw error;
  });
}
export async function saveEventPlacement(form: FormData) {
  return run(form, async (eventId) => {
    const { error } = await createAdminSupabaseClient()
      .from("event_companies")
      .update({
        confirmed_area: z.string().max(120).parse(text(form, "area")) || null,
      })
      .eq("id", z.string().uuid().parse(text(form, "registrationId")))
      .eq("event_id", eventId)
      .select("id")
      .single();
    if (error) throw error;
  });
}
