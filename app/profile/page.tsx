import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { SiteNav } from "@/components/site-nav";
import { ProfileEditor, type ProfileData } from "@/components/profile/profile-editor";

export const metadata = {
  title: "Your Profile · Your Orbit",
  description: "Manage your reader profile, location, vocation, and newspaper delivery settings.",
};

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?next=/profile");
  }

  const db = getDb();
  const profileRow = db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(user.id) as
    | {
        id: string;
        name: string;
        country: string;
        city: string;
        timezone: string;
        profession: string;
        industry: string | null;
        situation_tags: string;
        languages: string;
        delivery_hour: number;
        reading_depth: "brief" | "standard" | "deep";
        created_at: string;
      }
    | undefined;

  if (!profileRow) {
    redirect("/onboarding");
  }

  let situationTags: string[] = [];
  try {
    situationTags = JSON.parse(profileRow.situation_tags || "[]");
  } catch {
    situationTags = [];
  }

  let languages: string[] = [];
  try {
    languages = JSON.parse(profileRow.languages || '["en"]');
  } catch {
    languages = ["en"];
  }

  const profileData: ProfileData = {
    name: profileRow.name,
    email: user.email,
    country: profileRow.country,
    city: profileRow.city,
    timezone: profileRow.timezone,
    profession: profileRow.profession,
    industry: profileRow.industry,
    situation_tags: situationTags,
    languages,
    delivery_hour: profileRow.delivery_hour,
    reading_depth: profileRow.reading_depth,
    created_at: profileRow.created_at,
  };

  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-burgundy selection:text-paper">
      <SiteNav />
      <main className="pb-16">
        <ProfileEditor initialProfile={profileData} />
      </main>
    </div>
  );
}
