import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
} from "./token";

export interface SessionUser {
  id: string;
  email: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = await verifySessionToken(token);
  if (!userId) return null;

  const row = getDb()
    .prepare("SELECT id, email FROM users WHERE id = ?")
    .get(userId) as SessionUser | undefined;
  return row ?? null;
}

export function userHasProfile(userId: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 AS found FROM profiles WHERE id = ?")
    .get(userId);
  return row !== undefined;
}

export async function setSessionCookie(userId: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, await signSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  cookieStore.delete({
    name: SESSION_COOKIE,
    path: "/",
  });
}
