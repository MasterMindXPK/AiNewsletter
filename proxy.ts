import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup"]);
const PUBLIC_PREFIXES = ["/api/auth/", "/auth/"];

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

const ONBOARDING_PATHS = ["/onboarding", "/api/onboarding"];

function hasProfile(userId: string): boolean {
  const row = getDb().prepare("SELECT 1 AS found FROM profiles WHERE id = ?").get(userId);
  return row !== undefined;
}

// Next 16 proxies run on the Node.js runtime, so reading SQLite here is safe.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = token ? await verifySessionToken(token) : null;

  if (userId) {
    const onboarding = ONBOARDING_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
    if (onboarding || pathname.startsWith("/api/") || hasProfile(userId)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  const response = NextResponse.redirect(loginUrl);
  if (token) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
