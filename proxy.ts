import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

type HostTarget = {
  match: string;
  basePath: string;
};

const HOST_TARGETS: HostTarget[] = [
  { match: "bedrift.", basePath: "/company" },
  { match: "admin.", basePath: "/admin" },
  { match: "student.", basePath: "/student" },
  { match: "connecthub.", basePath: "/event" },
  { match: "studentconnect.", basePath: "/event" },
  { match: "event.", basePath: "/event" },
];

function resolveBasePath(request: NextRequest) {
  const hostHeader = request.headers.get("host") ?? "";
  const host = hostHeader.split(":")[0].toLowerCase();

  const hostOverride = request.nextUrl.searchParams.get("host");
  const hostToUse = hostOverride ? `${hostOverride}.oslostudenthub.no` : host;

  const target = HOST_TARGETS.find((entry) => hostToUse.startsWith(entry.match));
  return target?.basePath ?? null;
}

function shouldBypass(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/public")
  );
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (shouldBypass(pathname)) {
    return updateSession(request);
  }

  const sessionResponse = await updateSession(request);
  const basePath = resolveBasePath(request);

  if (!basePath) {
    return sessionResponse;
  }

  if (pathname.startsWith(basePath)) {
    return sessionResponse;
  }

  const url = request.nextUrl.clone();
  url.pathname = `${basePath}${pathname}`;

  const rewriteResponse = NextResponse.rewrite(url);
  copyCookies(sessionResponse, rewriteResponse);

  // TODO(subdomains): when subdomains are fully configured on Vercel,
  // remove the host query param override and rely purely on the host header.
  return rewriteResponse;
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/"],
};
