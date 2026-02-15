import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRoiMetrics, hasPlatinumAccess } from "@/lib/company";

const GEMINI_MODEL = "gemini-1.5-flash";

type SummaryRequest = {
  event_id?: string;
  company_id?: string;
  question?: string;
};

type LeadRow = {
  source: "stand" | "student_portal" | "ticket";
  interests: string[];
  job_types: string[];
  study_level: string | null;
  study_year: number | null;
  field_of_study: string | null;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function includesAny(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle));
}

function buildFallbackSummary(metrics: Awaited<ReturnType<typeof getRoiMetrics>>) {
  const lines = [
    `Standbesøk: ${metrics.visitsCount}`,
    `Leads: ${metrics.leadsCount}`,
    `Konvertering: ${metrics.conversion}%`,
  ];

  if (metrics.topStudyPrograms.length > 0) {
    const top = metrics.topStudyPrograms.map((item) => `${item.program} (${item.count})`).join(", ");
    lines.push(`Topp studieretninger: ${top}`);
  }

  lines.push("Anbefaling: Følg opp leads innen 48 timer og tilpass budskapet til topp studieretninger.");
  return lines.join("\n");
}

function aggregateLeadFacts(leads: LeadRow[]) {
  const bySource = new Map<string, number>();
  const jobTypeCounts = new Map<string, number>();
  const studyCounts = new Map<string, number>();

  let summerOrGraduateAll = 0;
  let summerOrGraduateStand = 0;

  for (const lead of leads) {
    bySource.set(lead.source, (bySource.get(lead.source) ?? 0) + 1);

    const normalizedJobTypes = (lead.job_types ?? []).map(normalize);
    for (const jobType of normalizedJobTypes) {
      if (!jobType) continue;
      jobTypeCounts.set(jobType, (jobTypeCounts.get(jobType) ?? 0) + 1);
    }

    const field = lead.field_of_study ? lead.field_of_study.trim() : "Ukjent";
    studyCounts.set(field, (studyCounts.get(field) ?? 0) + 1);

    const joined = normalizedJobTypes.join(" ");
    const summerOrGraduate = includesAny(joined, [
      "sommerjobb",
      "sommer jobb",
      "summer",
      "graduate",
      "graduate-stilling",
      "graduate stilling",
      "internship",
      "trainee",
    ]);
    if (summerOrGraduate) {
      summerOrGraduateAll += 1;
      if (lead.source === "stand") {
        summerOrGraduateStand += 1;
      }
    }
  }

  return {
    leadsTotal: leads.length,
    standLeads: bySource.get("stand") ?? 0,
    portalLeads: bySource.get("student_portal") ?? 0,
    ticketLeads: bySource.get("ticket") ?? 0,
    summerOrGraduateAll,
    summerOrGraduateStand,
    jobTypeCounts: Array.from(jobTypeCounts.entries())
      .map(([jobType, count]) => ({ jobType, count }))
      .sort((a, b) => b.count - a.count),
    topStudies: Array.from(studyCounts.entries())
      .map(([study, count]) => ({ study, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}

function fallbackAnswerForQuestion(question: string, facts: ReturnType<typeof aggregateLeadFacts>) {
  const q = normalize(question);
  const asksSummerOrGraduate = includesAny(q, ["sommerjobb", "summer", "graduate", "internship", "trainee"]);
  const asksTalkedTo = includesAny(q, ["snakket", "pratet", "snakka", "stand", "mott", "meet"]);

  if (asksSummerOrGraduate) {
    if (asksTalkedTo) {
      return [
        `Fra stand-samtaler fant vi ${facts.summerOrGraduateStand} studenter som oppga sommerjobb/graduate-interesse.`,
        `Dette er basert på ${facts.standLeads} leads fra kilde 'stand'.`,
      ].join(" ");
    }
    return [
      `Totalt fant vi ${facts.summerOrGraduateAll} studenter som oppga sommerjobb/graduate-interesse.`,
      `Dette er basert på ${facts.leadsTotal} leads i eventet.`,
    ].join(" ");
  }

  return [
    `Jeg fant ikke en egen regel for dette spørsmålet i fallback-modus.`,
    `Totalt leads: ${facts.leadsTotal}. Stand-leads: ${facts.standLeads}.`,
  ].join(" ");
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
        temperature: 0.2,
        maxOutputTokens: 500,
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
  const question = typeof body?.question === "string" ? body.question.trim() : "";

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
    return NextResponse.json({ error: "Gull- eller Platinum-tilgang kreves" }, { status: 403 });
  }

  const [metrics, leadsResult] = await Promise.all([
    getRoiMetrics(companyId, eventId),
    supabase
      .from("leads")
      .select("source, interests, job_types, study_level, study_year, field_of_study")
      .eq("company_id", companyId)
      .eq("event_id", eventId),
  ]);

  if (leadsResult.error) {
    throw leadsResult.error;
  }

  const leads = (leadsResult.data ?? []) as LeadRow[];
  const facts = aggregateLeadFacts(leads);

  if (!question) {
    const prompt = [
      "Du er en senior rådgiver for karrieredager.",
      "Oppsummer ROI-data og gi 3 konkrete anbefalinger.",
      `Standbesøk: ${metrics.visitsCount}`,
      `Leads: ${metrics.leadsCount}`,
      `Konvertering: ${metrics.conversion}%`,
      `Topp studieretninger: ${
        metrics.topStudyPrograms.map((item) => `${item.program} (${item.count})`).join(", ") || "ingen data"
      }`,
    ].join("\n");

    const gemini = await callGemini(prompt);
    const summary = gemini.text ?? buildFallbackSummary(metrics);
    return NextResponse.json({ summary, fallback: gemini.text ? false : true, mode: "summary" });
  }

  const context = {
    event_id: eventId,
    company_id: companyId,
    metrics: {
      visits: metrics.visitsCount,
      leads: metrics.leadsCount,
      conversion_percent: metrics.conversion,
    },
    lead_facts: {
      leads_total: facts.leadsTotal,
      stand_leads: facts.standLeads,
      studentportal_leads: facts.portalLeads,
      ticket_leads: facts.ticketLeads,
      summer_or_graduate_all: facts.summerOrGraduateAll,
      summer_or_graduate_stand: facts.summerOrGraduateStand,
      top_job_types: facts.jobTypeCounts.slice(0, 12),
      top_studies: facts.topStudies,
    },
  };

  const qaPrompt = [
    "Du svarer på spørsmål om en bedrifts egne eventdata.",
    "VIKTIG:",
    "- Bruk kun tallene i DATA_KONTEKST.",
    "- Ikke gjett. Hvis data ikke dekker spørsmålet, skriv tydelig at data mangler.",
    "- Svar på norsk, kort og konkret.",
    "- Ta med eksakte tall i svaret.",
    "",
    `BRUKERSPORSMAL: ${question}`,
    "",
    `DATA_KONTEKST: ${JSON.stringify(context)}`,
  ].join("\n");

  const gemini = await callGemini(qaPrompt);
  const answer = gemini.text ?? fallbackAnswerForQuestion(question, facts);

  return NextResponse.json({ summary: answer, fallback: gemini.text ? false : true, mode: "question" });
}
