import { NextResponse } from "next/server";

// Placeholder for the Google button. Exchange the provider code for a session
// here once OAuth is wired up; until then, send people back to sign in.
export function GET(request: Request) {
  const url = new URL("/login", request.url);
  url.searchParams.set("notice", "google-unavailable");
  return NextResponse.redirect(url);
}
