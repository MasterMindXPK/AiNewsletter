import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getSessionUser, userHasProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Set up your front page | Your Orbit",
  description: "Choose your topics and reading style so every edition leads with what matters to you.",
};

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/onboarding");
  if (userHasProfile(user.id)) redirect("/");

  return (
    <>
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-5 md:px-8">
          <Link
            href="/"
            className="font-serif text-2xl font-medium tracking-[-0.02em] text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burgundy"
          >
            Your Orbit
          </Link>
          <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink-muted">
            {user.email}
          </p>
        </div>
      </header>
      <main>
        <OnboardingFlow />
      </main>
    </>
  );
}
