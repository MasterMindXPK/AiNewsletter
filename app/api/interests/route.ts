import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getInterestProfileSummary } from "@/lib/learn/profile-summary";

const updateInterestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_weight"),
    key: z.string().min(1),
    weight: z.number().min(0).max(1),
  }),
  z.object({
    action: z.literal("remove"),
    key: z.string().min(1),
  }),
  z.object({
    action: z.literal("add"),
    key: z.string().min(1).max(60),
    kind: z.enum(["topic", "keyword", "entity"]),
    weight: z.number().min(0.1).max(1.0).default(0.5),
  }),
  z.object({
    action: z.literal("reset"),
  }),
]);

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = getInterestProfileSummary(user.id);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[api/interests] GET error:", error);
    return NextResponse.json({ error: "Failed to load interest profile" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = updateInterestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid action payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString();
    const payload = parsed.data;

    if (payload.action === "set_weight") {
      db.prepare(`
        UPDATE interest_weights
        SET weight = ?, updated_at = ?
        WHERE user_id = ? AND key = ?
      `).run(Number(payload.weight.toFixed(3)), now, user.id, payload.key);
    } else if (payload.action === "remove") {
      db.prepare(`
        DELETE FROM interest_weights
        WHERE user_id = ? AND key = ?
      `).run(user.id, payload.key);
    } else if (payload.action === "add") {
      const cleanKey = payload.key.trim();
      db.prepare(`
        INSERT INTO interest_weights (user_id, key, kind, weight, source, updated_at)
        VALUES (?, ?, ?, ?, 'learned', ?)
        ON CONFLICT(user_id, key) DO UPDATE SET
          weight = excluded.weight,
          updated_at = excluded.updated_at
      `).run(user.id, cleanKey, payload.kind, payload.weight, now);
    } else if (payload.action === "reset") {
      // Delete learned items, keep onboarding baseline
      db.prepare(`
        DELETE FROM interest_weights
        WHERE user_id = ? AND source = 'learned'
      `).run(user.id);
    }

    const updatedSummary = getInterestProfileSummary(user.id, db);
    return NextResponse.json({ ok: true, summary: updatedSummary });
  } catch (error) {
    console.error("[api/interests] POST error:", error);
    return NextResponse.json({ error: "Failed to update interests" }, { status: 500 });
  }
}
