import { NextResponse } from "next/server";
import { getBaseUrlForRole } from "@/lib/auth-urls";
import { normalizeEmailAddress, validateHostRoleLock } from "@/lib/auth-registration";
import {
  appendSignatureToEmailHtml,
  buildEmailSignatureHtml,
  sendTransactionalEmail,
} from "@/lib/resend";
import { findAuthUserByEmail } from "@/lib/company-access";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type ResetRole = "student" | "company";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildResetPasswordEmailHtml(input: {
  resetUrl: string;
  role: ResetRole;
}) {
  const roleLabel = input.role === "student" ? "studentkonto" : "bedriftskonto";

  return `
    <div style="font-family:Arial,sans-serif;color:#1A1626;line-height:1.6;">
      <p>Hei,</p>
      <p>Vi har mottatt en forespørsel om å sette nytt passord for din ${roleLabel} hos Oslo Student Hub.</p>
      <p>Bruk knappen under for å fortsette:</p>
      <p style="margin:24px 0;">
        <a
          href="${input.resetUrl}"
          style="display:inline-block;border-radius:999px;background:#140249;color:#ffffff;padding:12px 22px;text-decoration:none;font-weight:700;"
        >
          Sett nytt passord
        </a>
      </p>
      <p>Hvis knappen ikke virker, kan du kopiere denne lenken inn i nettleseren:</p>
      <p><a href="${input.resetUrl}" style="color:#140249;word-break:break-all;">${escapeHtml(input.resetUrl)}</a></p>
      <p>Hvis du ikke ba om dette, kan du ignorere e-posten.</p>
    </div>
  `;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const role = body?.role === "student" || body?.role === "company" ? (body.role as ResetRole) : null;
  const email = typeof body?.email === "string" ? normalizeEmailAddress(body.email) : "";

  if (!role) {
    return NextResponse.json({ error: "Ugyldig rolle." }, { status: 400 });
  }

  const hostValidationError = validateHostRoleLock(request.headers.get("host"), role);
  if (hostValidationError) {
    return NextResponse.json({ error: hostValidationError }, { status: 403 });
  }

  if (!email) {
    return NextResponse.json({ error: "E-post er påkrevd." }, { status: 400 });
  }

  const genericResponse = NextResponse.json({ ok: true });
  const supabase = createAdminSupabaseClient();

  try {
    const authUser = await findAuthUserByEmail(email);
    if (!authUser?.id) {
      return genericResponse;
    }

    const baseUrl = getBaseUrlForRole(role, new URL(request.url).origin);
    const redirectTo = `${baseUrl}/auth/reset?role=${role}`;
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (error || !data.properties?.hashed_token || !data.properties.redirect_to) {
      return NextResponse.json({ error: "Kunne ikke lage reset-lenke." }, { status: 500 });
    }

    const separator = data.properties.redirect_to.includes("?") ? "&" : "?";
    const resetUrl = `${data.properties.redirect_to}${separator}token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery`;
    const html = appendSignatureToEmailHtml(
      buildResetPasswordEmailHtml({ resetUrl, role }),
      buildEmailSignatureHtml({
        name: "Oslo Student Hub",
        title: "Support",
      }),
    );
    const sendResult = await sendTransactionalEmail({
      to: email,
      subject: "Sett nytt passord hos Oslo Student Hub",
      html,
      type: "password_reset",
      payload: {
        role,
        resetUrl,
      },
      supabase,
    });

    if (sendResult.status !== "sent") {
      return NextResponse.json({ error: "Kunne ikke sende reset-e-post." }, { status: 500 });
    }

    return genericResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ukjent feil";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
