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
  const roleLabel = input.role === "student" ? "student account" : "company account";

  return `
    <div style="font-family:Arial,sans-serif;color:#1A1626;line-height:1.6;">
      <p>Hello,</p>
      <p>We received a request to set a new password for your Oslo Student Hub ${roleLabel}.</p>
      <p>Use the button below to continue:</p>
      <p style="margin:24px 0;">
        <a
          href="${input.resetUrl}"
          style="display:inline-block;border-radius:999px;background:#140249;color:#ffffff;padding:12px 22px;text-decoration:none;font-weight:700;"
        >
          Set a new password
        </a>
      </p>
      <p>If the button does not work, copy this link into your browser:</p>
      <p><a href="${input.resetUrl}" style="color:#140249;word-break:break-all;">${escapeHtml(input.resetUrl)}</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const role = body?.role === "student" || body?.role === "company" ? (body.role as ResetRole) : null;
  const email = typeof body?.email === "string" ? normalizeEmailAddress(body.email) : "";

  if (!role) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const hostValidationError = validateHostRoleLock(request.headers.get("host"), role);
  if (hostValidationError) {
    return NextResponse.json({ error: hostValidationError }, { status: 403 });
  }

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
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
      return NextResponse.json({ error: "The reset link could not be created." }, { status: 500 });
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
      subject: "Set a new password for Oslo Student Hub",
      html,
      type: "password_reset",
      payload: {
        role,
        resetUrl,
      },
      supabase,
    });

    if (sendResult.status !== "sent") {
      return NextResponse.json({ error: "The password reset email could not be sent." }, { status: 500 });
    }

    return genericResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
