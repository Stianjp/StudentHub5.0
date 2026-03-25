"use server";

import { requireRole } from "@/lib/auth";
import { runGmailFeasibilityCheck, type GmailFeasibilityResult } from "@/lib/gmail-feasibility";

export async function runGmailFeasibilityAction(
  _previous: GmailFeasibilityResult | null,
  _formData: FormData,
): Promise<GmailFeasibilityResult> {
  await requireRole("admin");
  return runGmailFeasibilityCheck();
}
