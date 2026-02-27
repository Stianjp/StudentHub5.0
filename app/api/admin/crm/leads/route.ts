import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { applyCrmLeadFilters, buildCrmMetrics, loadCrmDataset } from "@/lib/crm";

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.role === "admin";
}

export async function GET(request: Request) {
  const isAdmin = await requireAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const leadStatus = url.searchParams.get("leadStatus") ?? "";
  const companyStatus = url.searchParams.get("companyStatus") ?? "";
  const eventName = url.searchParams.get("event") ?? "";
  const temperature = url.searchParams.get("temperature") ?? "";
  const stopReason = url.searchParams.get("stopReason") ?? "";
  const sequenceStep = url.searchParams.get("sequenceStep") ?? "";

  try {
    const dataset = await loadCrmDataset();
    const filteredLeads = applyCrmLeadFilters(dataset.leads, {
      query,
      leadStatus,
      companyStatus,
      eventName,
      temperature,
      stopReason,
      sequenceStep,
    });

    return NextResponse.json(
      {
        fetchedAt: dataset.fetchedAt,
        sheetId: dataset.sheetId,
        sheetRange: dataset.sheetRange,
        totalLeads: dataset.leads.length,
        filteredCount: filteredLeads.length,
        options: dataset.options,
        metrics: buildCrmMetrics(filteredLeads),
        leads: filteredLeads,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil ved lasting av CRM-data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
