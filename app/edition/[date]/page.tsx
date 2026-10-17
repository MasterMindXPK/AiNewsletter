import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { Masthead } from "@/components/masthead";
import { EditionReader } from "@/components/edition/edition-reader";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { loadEditionForUser } from "@/lib/edition/load";
import { DEFAULT_TIMEZONE, formatEditionDate } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

interface EditionDatePageProps {
  params: Promise<{ date: string }>;
}

export default async function EditionDatePage({ params }: EditionDatePageProps) {
  const { date } = await params;

  // Validate format YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound();
  }

  const user = await getSessionUser();
  if (!user) {
    return (
      <>
        <SiteNav />
        <main className="mx-auto max-w-xl px-5 py-24 text-center">
          <h1 className="font-serif text-3xl font-medium text-ink">Archive Sign In</h1>
          <p className="mt-3 font-serif text-base text-ink-muted">
            Please sign in to view past editions of your personal morning paper.
          </p>
          <div className="mt-6">
            <Link
              href={`/login?next=/edition/${date}`}
              className="border border-burgundy bg-burgundy px-5 py-2.5 font-sans text-xs font-medium text-paper hover:bg-burgundy/90"
            >
              Sign in to view
            </Link>
          </div>
        </main>
      </>
    );
  }

  const db = getDb();
  const profile = db
    .prepare("SELECT name, timezone FROM profiles WHERE id = ?")
    .get(user.id) as { name: string; timezone: string } | undefined;

  const timezone = profile?.timezone ?? DEFAULT_TIMEZONE;
  const editionData = loadEditionForUser(user.id, date);

  if (!editionData) {
    return (
      <>
        <SiteNav />
        <main className="mx-auto max-w-xl px-5 py-24 text-center">
          <span className="font-sans text-xs uppercase tracking-wider text-burgundy">
            Archive lookup
          </span>
          <h1 className="mt-2 font-serif text-3xl font-medium text-ink">
            No edition found for {date}
          </h1>
          <p className="mt-3 font-serif text-base text-ink/80">
            You don&apos;t have an edition printed for this date. Check your today&apos;s paper or visit the archive.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/"
              className="border border-ink px-4 py-2 font-sans text-xs font-medium text-ink hover:bg-ink hover:text-paper"
            >
              Today&apos;s Edition
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteNav />
      <main>
        <Masthead timezone={timezone} />
        <div className="mx-auto max-w-6xl px-5 pt-3 md:px-8">
          <div className="flex items-center gap-2 border-l-2 border-burgundy bg-paper pl-3 py-1 font-sans text-xs text-ink-muted">
            <span>Historical edition: <strong>{formatEditionDate(date, timezone)}</strong> (Archived)</span>
          </div>
        </div>
        <EditionReader initialData={editionData} readerName={profile?.name} />
      </main>
    </>
  );
}
