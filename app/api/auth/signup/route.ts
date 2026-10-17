import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { signupSchema, toFieldErrors } from "@/lib/auth/schemas";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fix the highlighted fields.", fields: toFieldErrors(parsed.error) },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;
  const db = getDb();

  const existing = db.prepare("SELECT 1 AS found FROM users WHERE email = ?").get(email);
  if (existing) {
    return NextResponse.json(
      {
        error: "An account with this email already exists. Try signing in instead.",
        fields: { email: "This email is already registered." },
      },
      { status: 409 },
    );
  }

  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  try {
    db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(
      id,
      email,
      passwordHash,
    );
  } catch {
    return NextResponse.json(
      { error: "We could not create your account. Please try again." },
      { status: 500 },
    );
  }

  await setSessionCookie(id);
  return NextResponse.json({ ok: true, redirectTo: "/onboarding" }, { status: 201 });
}
