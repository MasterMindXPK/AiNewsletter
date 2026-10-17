import { redirect } from "next/navigation";
import { getSessionUser, userHasProfile, type SessionUser } from "./session";

/** For protected server components: signed in, and onboarded. */
export async function requireUserWithProfile(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!userHasProfile(user.id)) redirect("/onboarding");
  return user;
}

/** Only allow same-site relative paths as post-login destinations. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next;
}
