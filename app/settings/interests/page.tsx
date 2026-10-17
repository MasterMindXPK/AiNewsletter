import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getInterestProfileSummary } from "@/lib/learn/profile-summary";
import { SiteNav } from "@/components/site-nav";
import { InterestManager } from "@/components/interests/interest-manager";

export const metadata = {
  title: "Interest Profile · Your Orbit",
  description: "Transparent editorial control over what your morning paper learns from your reading habits.",
};

export default async function InterestsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/settings/interests");
  }

  const summary = getInterestProfileSummary(user.id);

  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-burgundy selection:text-paper">
      <SiteNav />
      <main className="pb-16">
        <InterestManager initialSummary={summary} />
      </main>
    </div>
  );
}
