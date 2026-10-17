import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { loadEditionForUser, loadMockEdition } from "@/lib/edition/load";
import { generatePdfHtml } from "@/lib/pdf/template";
import { DEFAULT_TIMEZONE } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

interface PrintPageProps {
  params: Promise<{ id: string }>;
}

export default async function PrintEditionPage({ params }: PrintPageProps) {
  const { id } = await params;

  let editionData;
  let readerName = "Reader";
  let userTimezone = DEFAULT_TIMEZONE;

  if (id === "sample" || id.startsWith("mock-")) {
    editionData = loadMockEdition();
    readerName = "Sample Reader";
  } else {
    const user = await getSessionUser();
    if (!user) {
      notFound();
    }

    const db = getDb();
    const editionRow = db
      .prepare("SELECT id, user_id, edition_date FROM editions WHERE id = ?")
      .get(id) as { id: string; user_id: string; edition_date: string } | undefined;

    if (!editionRow || editionRow.user_id !== user.id) {
      notFound();
    }

    const profile = db
      .prepare("SELECT name, timezone FROM profiles WHERE id = ?")
      .get(user.id) as { name: string; timezone: string } | undefined;

    readerName = profile?.name ?? "Reader";
    userTimezone = profile?.timezone ?? DEFAULT_TIMEZONE;
    editionData = loadEditionForUser(user.id, editionRow.edition_date);
  }

  if (!editionData) {
    notFound();
  }

  const html = await generatePdfHtml(editionData, {
    readerName,
    userTimezone,
  });

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      className="min-h-screen bg-[#f7f3ec]"
    />
  );
}
