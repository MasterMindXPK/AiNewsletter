import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Create account | Your Orbit",
  description: "Create an account to get a newspaper written around your interests.",
};

export default function SignupPage() {
  return (
    <>
      <SiteNav />
      <AuthShell
        eyebrow="Subscribe, free"
        title="Create account"
        description="A little more informed, every morning."
      >
        <AuthForm mode="signup" />
      </AuthShell>
    </>
  );
}
