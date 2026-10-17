import { type NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { loadEditionForUser, loadMockEdition } from "@/lib/edition/load";
import { renderEditionPdf } from "@/lib/pdf/render";
import { DEFAULT_TIMEZONE } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteProps): Promise<Response> {
  try {
    const { id } = await params;

    // Handle mock edition request
    if (id === "mock-edition-2026-10-17" || id === "sample" || id.startsWith("mock-")) {
      const mockData = loadMockEdition();
      const pdfBuffer = await renderEditionPdf(mockData, {
        readerName: "Sample Reader",
        userTimezone: DEFAULT_TIMEZONE,
      });

      return new Response(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="YourOrbit-Sample-${mockData.edition.edition_date}.pdf"`,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // Authenticated user check
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in to download your edition PDF." }, { status: 401 });
    }

    const db = getDb();

    // Verify ownership of the edition
    const editionRow = db
      .prepare("SELECT id, user_id, edition_date FROM editions WHERE id = ?")
      .get(id) as { id: string; user_id: string; edition_date: string } | undefined;

    if (!editionRow) {
      return NextResponse.json({ error: "Edition not found" }, { status: 404 });
    }

    if (editionRow.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized access to this edition" }, { status: 403 });
    }

    const profile = db
      .prepare("SELECT name, timezone FROM profiles WHERE id = ?")
      .get(user.id) as { name: string; timezone: string } | undefined;

    const editionData = loadEditionForUser(user.id, editionRow.edition_date);
    if (!editionData) {
      return NextResponse.json({ error: "Failed to load edition data" }, { status: 500 });
    }

    const forceRegenerate = req.nextUrl.searchParams.get("regenerate") === "true";

    const pdfBuffer = await renderEditionPdf(editionData, {
      readerName: profile?.name,
      userTimezone: profile?.timezone ?? DEFAULT_TIMEZONE,
      forceRegenerate,
    });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="YourOrbit-${editionRow.edition_date}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[api/edition/[id]/pdf] error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to render PDF. Please try again." },
      { status: 500 }
    );
  }
}
