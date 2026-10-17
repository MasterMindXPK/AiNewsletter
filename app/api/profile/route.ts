import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { onboardingSchema } from "@/lib/onboarding/schema";
import {
  TOPIC_KEYS,
  WEIGHT_BASELINE,
  WEIGHT_KEYWORD,
  WEIGHT_TOPIC,
} from "@/lib/onboarding/topics";
import { buildEditionForUser } from "@/lib/edition/build";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Identity comes from the session cookie only, never from the request body.
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Some of your answers look invalid.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const data = parsed.data;

  const selectedTopics = new Set<string>(data.topics);
  const topicKeySet = new Set<string>(TOPIC_KEYS);

  // Case-insensitive de-dupe; skip keywords that are really topic names (same primary key).
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const raw of data.keywords) {
    const keyword = raw.trim();
    const lower = keyword.toLowerCase();
    if (!keyword || seen.has(lower) || topicKeySet.has(lower)) continue;
    seen.add(lower);
    keywords.push(keyword);
  }

  const db = getDb();

  try {
    const save = db.transaction(() => {
      db.prepare(
        `INSERT INTO profiles
           (id, name, country, city, timezone, profession, industry,
            situation_tags, languages, delivery_hour, reading_depth)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           country = excluded.country,
           city = excluded.city,
           timezone = excluded.timezone,
           profession = excluded.profession,
           industry = excluded.industry,
           situation_tags = excluded.situation_tags,
           languages = excluded.languages,
           delivery_hour = excluded.delivery_hour,
           reading_depth = excluded.reading_depth`,
      ).run(
        user.id,
        data.name.trim(),
        data.country,
        data.city.trim(),
        data.timezone,
        data.profession.trim(),
        data.industry?.trim() ? data.industry.trim() : null,
        JSON.stringify(data.situation_tags),
        JSON.stringify(data.languages),
        data.delivery_hour,
        data.reading_depth,
      );

      // Re-running onboarding replaces earlier onboarding weights but keeps learned ones.
      db.prepare("DELETE FROM interest_weights WHERE user_id = ? AND source = 'onboarding'").run(
        user.id,
      );

      const insertWeight = db.prepare(
        `INSERT INTO interest_weights (user_id, key, kind, weight, source)
         VALUES (?, ?, ?, ?, 'onboarding')
         ON CONFLICT(user_id, key) DO NOTHING`,
      );

      for (const topic of TOPIC_KEYS) {
        insertWeight.run(
          user.id,
          topic,
          "topic",
          selectedTopics.has(topic) ? WEIGHT_TOPIC : WEIGHT_BASELINE,
        );
      }
      for (const keyword of keywords) {
        insertWeight.run(user.id, keyword, "keyword", WEIGHT_KEYWORD);
      }
    });

    save();
  } catch (error) {
    console.error("[api/profile] failed to save profile", error);
    return NextResponse.json(
      { error: "We could not save your profile. Please try again." },
      { status: 500 },
    );
  }

  // M5: fire-and-forget first edition build — never block the onboarding redirect.
  buildEditionForUser(db, user.id, {
    log: (msg) => console.log("[onboarding edition]", msg),
  }).catch((err: unknown) => {
    console.error("[api/profile] edition build failed (non-fatal):", err);
  });

  return NextResponse.json({ ok: true, redirectTo: "/" });
}
