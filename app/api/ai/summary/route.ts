import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoiMetrics, hasPlatinumAccess } from "@/lib/company";

const GEMINI_MODEL = "gemini-1.5-flash";

type SummaryRequest = {
  event_id?: string;
  company_id?: string;
};

function buildFallbackSummary(metrics: Awaited<ReturnType<typeof getRoiMetrics>>) {
  const lines = [
    `Standbesøk: ${metrics.visitsCount}`,
    `Leads: ${metrics.leadsCount}`,
    `Konvertering: ${metrics.conversion}%`,
  ];

  if (metrics.topStudyPrograms.length > 0) {
    const top = metrics.topStudyPrograms
      .map((item) => `${item.program} (${item.count})`)
      .join(", ");
    lines.push(`Topp studieretninger: ${top}`);
  }

  lines.push("Anbefaling: Følg opp leads innen 48 timer og tilpass budskapet til topp studieretninger.");
  return lines.join("\n");
}

async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { text: null, error: "Missing GEMINI_API_KEY" } as const;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 400,
      },
    }),
  });

  if (!response.ok) {
    return { text: null, error: `Gemini error: ${response.status}` } as const;
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  return { text, error: null } as const;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SummaryRequest | null;
  const eventId = body?.event_id;
  const companyId = body?.company_id;

  if (!eventId || !companyId) {
    return NextResponse.json({ error: "event_id og company_id er påkrevd" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await hasPlatinumAccess(user.id, eventId, companyId);
  if (!access) {
    return NextResponse.json({ error: "Platinum-tilgang kreves" }, { status: 403 });
  }

  const metrics = await getRoiMetrics(companyId, eventId);

  const prompt = `Du er en senior rådgiver for karrieredager.\n` +
    `Oppsummer ROI-data og gi 3 konkrete anbefalinger.\n` +
    `Standbesøk: ${metrics.visitsCount}\n` +
    `Leads: ${metrics.leadsCount}\n` +
    `Konvertering: ${metrics.conversion}%\n` +
    `Topp studieretninger: ${metrics.topStudyPrograms
      .map((item) => `${item.program} (${item.count})`)
      .join(", ") || "ingen data"}.`;

  const gemini = await callGemini(prompt);
  const summary = gemini.text ?? buildFallbackSummary(metrics);

  return NextResponse.json({ summary, fallback: gemini.text ? false : true });
}
