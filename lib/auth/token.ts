import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "orbit_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const DEV_FALLBACK_SECRET = "orbit-secret-key-nascon26-fallback-production-safe-32chars";

function getKey(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
      ? process.env.SESSION_SECRET
      : DEV_FALLBACK_SECRET;

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
