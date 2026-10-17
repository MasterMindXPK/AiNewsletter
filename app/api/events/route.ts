import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { recordLearningFromEvent } from "@/lib/learn/update";

const eventSchema = z.object({
  article_id: z.string().min(1),
  edition_id: z.string().min(1),
  type: z.enum([
    "open",
    "click_through",
    "read_time",
    "skip",
    "save",
    "more_like_this",
    "less_like_this",
    "hide_topic",
    "hide_source",
  ]),
  value: z.number().optional(),
});

const batchSchema = z.union([eventSchema, z.array(eventSchema)]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      // Signed-out visitors don't write to DB, return 200 so navigator.sendBeacon succeeds
      return NextResponse.json({ ok: true, anonymous: true });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = batchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid event shape", issues: parsed.error.issues }, { status: 400 });
    }

    const events = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
    if (events.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const db = getDb();

    const insertEvent = db.prepare(
      `INSERT INTO interaction_events (id, user_id, article_id, edition_id, type, value, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const toggleSave = db.transaction((articleId: string) => {
      const existing = db
        .prepare("SELECT 1 FROM saved_articles WHERE user_id = ? AND article_id = ?")
        .get(user.id, articleId);

      if (existing) {
        db.prepare("DELETE FROM saved_articles WHERE user_id = ? AND article_id = ?").run(user.id, articleId);
        return false;
      } else {
        db.prepare(
          `INSERT INTO saved_articles (user_id, article_id, created_at)
           VALUES (?, ?, ?)`
        ).run(user.id, articleId, new Date().toISOString());
        return true;
      }
    });

    const now = new Date().toISOString();
    let savedState: boolean | undefined;

    let lastOutcome = undefined;

    db.transaction(() => {
      for (const ev of events) {
        insertEvent.run(
          randomUUID(),
          user.id,
          ev.article_id,
          ev.edition_id,
          ev.type,
          ev.value ?? null,
          now
        );

        if (ev.type === "save") {
          savedState = toggleSave(ev.article_id);
        }

        // Apply real-time weight adaptation and discovery
        lastOutcome = recordLearningFromEvent(db, {
          userId: user.id,
          articleId: ev.article_id,
          type: ev.type,
          value: ev.value,
        });
      }
    })();

    return NextResponse.json({ ok: true, saved: savedState, learned: lastOutcome });
  } catch (error) {
    console.error("[api/events] error recording event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
