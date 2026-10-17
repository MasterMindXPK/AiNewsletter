import { randomUUID } from "node:crypto";
import { getDb } from "../db";
import type { Topic } from "../types";
import type { ArticleForScoring, InterestWeight, UserContext } from "../rank/score";
import { selectArticles, assignSizes } from "../rank/select";
import { assignSections } from "../rank/sections";
import { todayInTimezone } from "../utils/date";
import { attachImpactNotes } from "../impact/select";

type Db = ReturnType<typeof getDb>;

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

interface ProfileRow {
  id: string;
  name: string;
  country: string;
  city: string;
  timezone: string;
  profession: string;
  industry: string | null;
  situation_tags: string;
  reading_depth: "brief" | "standard" | "deep";
}

interface ArticleRow {
  id: string;
  title: string;
  summary: string;
  topics: string;
  entities: string;
  region_tags: string;
  importance: number;
  published_at: string;
  source_domain: string;
  cluster_id: string | null;
  reliability: number | null;
}

interface InterestRow {
  key: string;
  kind: "topic" | "keyword" | "entity";
  weight: number;
}

interface EditionItemRef {
  article_id: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJsonArray<T>(text: string | null | undefined): T[] {
  if (!text) return [];
  try {
    const v: unknown = JSON.parse(text);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

const ARTICLE_POOL_WINDOW_MS = 48 * 60 * 60 * 1000;

function loadArticlePool(db: Db): ArticleForScoring[] {
  const cutoff = new Date(Date.now() - ARTICLE_POOL_WINDOW_MS).toISOString();
  const rows = db
    .prepare(
      `SELECT a.id, a.title, a.summary, a.topics, a.entities, a.region_tags,
              a.importance, a.published_at, a.source_domain, a.cluster_id,
              COALESCE(s.reliability, 0.6) AS reliability
         FROM articles a
         LEFT JOIN sources s ON s.domain = a.source_domain
        WHERE a.published_at >= ?
          AND a.summary IS NOT NULL
          AND a.summary != ''
        ORDER BY a.published_at DESC
        LIMIT 600`,
    )
    .all(cutoff) as ArticleRow[];

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    topics: parseJsonArray<Topic>(r.topics),
    entities: parseJsonArray<{ name: string; type: string }>(r.entities),
    region_tags: parseJsonArray<string>(r.region_tags),
    importance: r.importance,
    published_at: r.published_at,
    source_domain: r.source_domain,
    cluster_id: r.cluster_id,
    reliability: r.reliability ?? 0.6,
  }));
}

function loadInterests(db: Db, userId: string): InterestWeight[] {
  return db
    .prepare("SELECT key, kind, weight FROM interest_weights WHERE user_id = ?")
    .all(userId) as InterestRow[];
}

function loadSeenContext(
  db: Db,
  userId: string,
): { seenArticleIds: Set<string>; seenTopicCounts: Map<string, number> } {
  const editions = db
    .prepare(
      "SELECT items FROM editions WHERE user_id = ? ORDER BY edition_date DESC LIMIT 3",
    )
    .all(userId) as { items: string }[];

  const seenArticleIds = new Set<string>();
  for (const ed of editions) {
    for (const item of parseJsonArray<EditionItemRef>(ed.items)) {
      seenArticleIds.add(item.article_id);
    }
  }

  const seenTopicCounts = new Map<string, number>();
  if (seenArticleIds.size > 0) {
    const ids = [...seenArticleIds];
    const placeholders = ids.map(() => "?").join(",");
    const seenArticles = db
      .prepare(`SELECT topics FROM articles WHERE id IN (${placeholders})`)
      .all(...ids) as { topics: string }[];
    for (const a of seenArticles) {
      for (const t of parseJsonArray<string>(a.topics)) {
        seenTopicCounts.set(t, (seenTopicCounts.get(t) ?? 0) + 1);
      }
    }
  }

  return { seenArticleIds, seenTopicCounts };
}

function loadHiddenFilters(
  db: Db,
  userId: string,
): { hiddenTopics: Set<string>; hiddenSources: Set<string> } {
  // Topics with weight = 0 are treated as hidden
  const zeroWeightTopics = db
    .prepare(
      "SELECT key FROM interest_weights WHERE user_id = ? AND kind = 'topic' AND weight = 0",
    )
    .all(userId) as { key: string }[];
  const hiddenTopics = new Set(zeroWeightTopics.map((r) => r.key));

  // hide_topic interaction events → look up those articles' topics
  const hideTopicRows = db
    .prepare(
      `SELECT a.topics
         FROM interaction_events e
         JOIN articles a ON a.id = e.article_id
        WHERE e.user_id = ? AND e.type = 'hide_topic'`,
    )
    .all(userId) as { topics: string }[];
  for (const row of hideTopicRows) {
    for (const t of parseJsonArray<string>(row.topics)) {
      hiddenTopics.add(t);
    }
  }

  // hide_source interaction events → look up source_domain
  const hideSourceRows = db
    .prepare(
      `SELECT a.source_domain
         FROM interaction_events e
         JOIN articles a ON a.id = e.article_id
        WHERE e.user_id = ? AND e.type = 'hide_source'`,
    )
    .all(userId) as { source_domain: string }[];
  const hiddenSources = new Set(hideSourceRows.map((r) => r.source_domain));

  return { hiddenTopics, hiddenSources };
}

/**
 * Rule-based headline: clean up the lead article title.
 * An LLM-based version can replace this in a later pass.
 */
function ruleBasedHeadline(leadTitle: string | undefined): string {
  if (!leadTitle) return "Today's Edition";
  const clean = leadTitle.replace(/\s+/g, " ").trim();
  return clean.length > 120 ? clean.slice(0, 117) + "…" : clean;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface BuildEditionOptions {
  log?: (msg: string) => void;
}

export interface BuildEditionResult {
  /** The db row id of the upserted edition. */
  editionId: string;
  editionDate: string;
  itemCount: number;
}

/**
 * Build (or refresh) today's edition for a single user.
 * Returns null when the user has no profile or there are no enriched articles.
 * Never throws: any error is caught and logged.
 */
export async function buildEditionForUser(
  db: Db,
  userId: string,
  opts: BuildEditionOptions = {},
): Promise<BuildEditionResult | null> {
  const log = opts.log ?? (() => undefined);

  // 1. Load profile
  const profile = db
    .prepare(
      `SELECT id, name, country, city, timezone, profession, industry,
              situation_tags, reading_depth
         FROM profiles WHERE id = ?`,
    )
    .get(userId) as ProfileRow | undefined;

  if (!profile) {
    log(`[build] user ${userId} has no profile, skipping`);
    return null;
  }

  // 2. Load all inputs
  const editionDate = todayInTimezone(profile.timezone);
  const interests = loadInterests(db, userId);
  const { seenArticleIds, seenTopicCounts } = loadSeenContext(db, userId);
  const { hiddenTopics, hiddenSources } = loadHiddenFilters(db, userId);
  const pool = loadArticlePool(db);

  if (pool.length === 0) {
    log(`[build] no enriched articles available; run npm run ingest then npm run enrich`);
    return null;
  }

  // 3. Build UserContext
  const user: UserContext = {
    country: profile.country,
    city: profile.city,
    profession: profile.profession,
    industry: profile.industry,
    situation_tags: parseJsonArray<string>(profile.situation_tags),
    reading_depth: profile.reading_depth,
  };

  // 4. Select articles
  const selected = selectArticles(pool, {
    readingDepth: profile.reading_depth,
    interests,
    user,
    seenArticleIds,
    hiddenTopics,
    hiddenSources,
    seenTopicCounts,
    now: new Date(),
  });

  if (selected.length === 0) {
    log(`[build] no articles passed selection for user ${userId}`);
    return null;
  }

  // 5. Assign sizes and sections
  const sizes = assignSizes(selected);
  const items = assignSections(selected, sizes, interests, user);

  // 6. Headline of the day (rule-based; swap for LLM in a later iteration)
  const headlineOfTheDay = ruleBasedHeadline(selected[0]?.article.title);

  // 7. M11 Personal Impact Notes
  const itemsWithImpact = await attachImpactNotes(items, user, db);
  const connections: unknown[] = [];

  // 8. Upsert edition
  const generatedAt = new Date().toISOString();
  const newId = randomUUID();

  db.prepare(
    `INSERT INTO editions
       (id, user_id, edition_date, headline_of_the_day, items, connections, generated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, edition_date) DO UPDATE SET
       headline_of_the_day = excluded.headline_of_the_day,
       items               = excluded.items,
       connections         = excluded.connections,
       generated_at        = excluded.generated_at`,
  ).run(
    newId,
    userId,
    editionDate,
    headlineOfTheDay,
    JSON.stringify(itemsWithImpact),
    JSON.stringify(connections),
    generatedAt,
  );

  // Read back the actual row id (may differ from newId on an upsert conflict)
  const row = db
    .prepare("SELECT id FROM editions WHERE user_id = ? AND edition_date = ?")
    .get(userId, editionDate) as { id: string };

  log(
    `[build] edition ${editionDate} for ${profile.name}: ${items.length} stories, lead="${selected[0]?.article.title?.slice(0, 60)}…"`,
  );

  return { editionId: row.id, editionDate, itemCount: items.length };
}

/**
 * Build today's edition for every user that has a profile.
 * Exported as `buildAllEditions` so `scripts/daily.ts` and `scripts/build-editions.ts`
 * can call it.
 */
export async function buildAllEditions(opts: BuildEditionOptions = {}): Promise<void> {
  const log = opts.log ?? ((m: string) => console.log(m));
  const db = getDb();

  const users = db.prepare("SELECT id FROM profiles").all() as { id: string }[];
  log(`[build] building editions for ${users.length} user(s)`);

  let built = 0;
  let skipped = 0;

  for (const { id } of users) {
    try {
      const result = await buildEditionForUser(db, id, { log });
      if (result) built++;
      else skipped++;
    } catch (err) {
      skipped++;
      log(
        `[build] error for user ${id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  log(`[build] done: ${built} built, ${skipped} skipped`);
}
