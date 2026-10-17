import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { SiteNav } from "@/components/site-nav";
import { safeNextPath } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Sign in | Your Orbit",
  description: "Sign in to read your personalised morning edition.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; notice?: string }>;
}) {
  const { next, notice } = await searchParams;

  return (
    <>
      <SiteNav />
      <AuthShell
        eyebrow="Welcome back"
        title="Sign in"
        description="Your morning edition is waiting."
      >
        <AuthForm
          mode="login"
          next={next ? safeNextPath(next) : undefined}
          notice={notice}
        />
      </AuthShell>
    </>
  );
}
