import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "orbit_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const DEV_FALLBACK_SECRET = "orbit-dev-only-secret-set-SESSION_SECRET-in-env-local";

function getKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : DEV_FALLBACK_SECRET);

  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET is missing or too short. Set a long random string in .env.local.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getKey());
}

/** Returns the user id from a valid token, or null. Safe for the edge runtime. */
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ["HS256"],
    });
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}
