import { NextResponse } from "next/server";
import { submitPublicRegistrationApplication } from "@/lib/event-registration";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const formData = await request.formData();
    const result = await submitPublicRegistrationApplication({ slug, formData });
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    const message = error && typeof error === "object" && "message" in error ? String(error.message) : "Could not submit registration.";
    const status = message.includes("Prices changed") ? 409 :
      message.toLowerCase().includes("required") ||
      message.toLowerCase().includes("choose") ||
      message.toLowerCase().includes("valid") ||
      message.toLowerCase().includes("available")
        ? 400
        : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
