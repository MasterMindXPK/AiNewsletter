import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { safeNextPath } from "@/lib/auth/guards";
import {
  clearLoginFailures,
  isLoginBlocked,
  recordLoginFailure,
} from "@/lib/auth/rate-limit";
import { loginSchema, toFieldErrors } from "@/lib/auth/schemas";
import { setSessionCookie, userHasProfile } from "@/lib/auth/session";

const BAD_CREDENTIALS = "Incorrect email or password.";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fields: toFieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const { email, password, next } = parsed.data;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limitKey = `${ip}:${email}`;

  if (isLoginBlocked(limitKey)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const user = getDb()
    .prepare("SELECT id, password_hash FROM users WHERE email = ?")
    .get(email) as { id: string; password_hash: string } | undefined;

  const valid = await verifyPassword(password, user?.password_hash ?? null);
  if (!user || !valid) {
    recordLoginFailure(limitKey);
    return NextResponse.json({ error: BAD_CREDENTIALS }, { status: 401 });
  }

  clearLoginFailures(limitKey);
  await setSessionCookie(user.id);
  return NextResponse.json({
    ok: true,
    redirectTo: userHasProfile(user.id) ? safeNextPath(next) : "/onboarding",
  });
}
