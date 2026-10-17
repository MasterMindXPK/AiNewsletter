import { type NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { buildEditionForUser } from "@/lib/edition/build";

/**
 * POST /api/edition/generate
 *
 * Build (or refresh) today's edition for the signed-in user.
 * Called after onboarding and by the "Refresh my paper" button (M6).
 */
export async function POST(_req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const db = getDb();
    const result = await buildEditionForUser(db, user.id, {
      log: (msg) => console.log(msg),
    });

    if (!result) {
      return NextResponse.json(
        {
          error:
            "No enriched articles are available yet. Run npm run ingest then npm run enrich first.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      editionId: result.editionId,
      editionDate: result.editionDate,
      itemCount: result.itemCount,
    });
  } catch (err) {
    console.error("[edition/generate]", err);
    return NextResponse.json({ error: "Failed to build edition" }, { status: 500 });
  }
}
