import { SiteNav } from "@/components/site-nav";
import { Masthead } from "@/components/masthead";
import { EditionReader } from "@/components/edition/edition-reader";
import { EditionEmpty } from "@/components/edition/edition-empty";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { loadEditionForUser, loadMockEdition } from "@/lib/edition/load";
import { todayInTimezone, DEFAULT_TIMEZONE } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSessionUser();

  if (!user) {
    // Signed-out visitors see the sample newspaper broadsheet with registration CTA
    const mockData = loadMockEdition();
    return (
      <>
        <SiteNav />
        <main>
          <Masthead timezone={DEFAULT_TIMEZONE} />
          <EditionReader initialData={mockData} />
        </main>
      </>
    );
  }

  const db = getDb();
  const profile = db
    .prepare("SELECT name, timezone FROM profiles WHERE id = ?")
    .get(user.id) as { name: string; timezone: string } | undefined;

  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const today = todayInTimezone(timezone);

  // Load today's edition (or the most recent edition for this user)
  const editionData =
    loadEditionForUser(user.id, today) ?? loadEditionForUser(user.id);

  return (
    <>
      <SiteNav />
      <main>
        <Masthead timezone={timezone} />
        {editionData ? (
          <EditionReader initialData={editionData} readerName={profile?.name} />
        ) : (
          <EditionEmpty />
        )}
      </main>
    </>
  );
}
