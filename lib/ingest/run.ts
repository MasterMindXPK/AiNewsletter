import { getDb } from "@/lib/db";
import { ClusterIndex } from "./dedupe";
import { extractArticle } from "./extract";
import { fetchGnews } from "./gnews";
import { fetchGuardian } from "./guardian";
import {
  FRESH_WINDOW_MS,
  MAX_TEXT_CHARS,
  articleIdFor,
  canonicalizeUrl,
  titleTokens,
  type RawArticle,
  type SourceFetchResult,
} from "./normalize";
import { fetchFeeds } from "./rss";
import { listActiveSources, seedSources } from "./sources";
import { mapLimit } from "./util";

type Db = ReturnType<typeof getDb>;

const MIN_TITLE_CHARS = 8;
const EXTRACT_CONCURRENCY = 4;
const DEFAULT_EXTRACT_LIMIT = 60;
/** Articles with at least this much feed text are not worth a full-page download. */
const RICH_TEXT_CHARS = 800;

export interface IngestStats {
  sourcesTried: number;
  sourcesSkipped: string[];
  failedSources: { name: string; error: string }[];
  fetched: number;
  invalid: number;
  stale: number;
  newArticles: number;
  /** Same canonical URL already stored (or seen twice in this run). */
  exactDuplicates: number;
  /** Stored, but grouped with an earlier story of nearly the same title. */
  nearDuplicates: number;
  extracted: number;
  extractFailed: number;
  poolLast48h: number;
  durationMs: number;
}

export interface IngestOptions {
  /** Max pages to download for full text this run. Default 60. */
  extractLimit?: number;
  log?: (message: string) => void;
}

interface Candidate {
  raw: RawArticle;
  canonical: string;
  ts: number;
}

interface InsertedArticle {
  id: string;
  url: string;
  ts: number;
  textLength: number;
  reliability: number;
  isLocal: boolean;
}

export interface StoreResult {
  inserted: InsertedArticle[];
  exactDuplicates: number;
  nearDuplicates: number;
}

interface ExistingRow {
  id: string;
  title: string;
  published_at: string;
  cluster_id: string | null;
}

/** Cheap prior until M4 enriches the article: more reliable sources start slightly higher. */
function baselineImportance(reliability: number): number {
  return Math.round((0.25 + 0.3 * reliability) * 100) / 100;
}

/**
 * Writes new candidates to the articles table and assigns cluster ids.
 * Exported so it can be tested without any network access.
 *
 * Enrichment marker: rows are stored with summary = ''. M4 should enrich rows where summary = ''.
 * `topics` and `region_tags` are pre-filled with rule-based values so the edition builder works
 * even before enrichment runs.
 */
export function storeCandidates(db: Db, candidates: readonly Candidate[], now: Date): StoreResult {
  const sinceIso = new Date(now.getTime() - FRESH_WINDOW_MS).toISOString();
  const existing = db
    .prepare("SELECT id, title, published_at, cluster_id FROM articles WHERE published_at >= ?")
    .all(sinceIso) as ExistingRow[];

  const index = new ClusterIndex();
  for (const row of existing) {
    index.add({
      id: row.id,
      tokens: titleTokens(row.title),
      ts: Date.parse(row.published_at),
      clusterId: row.cluster_id ?? row.id,
      needsClusterWrite: row.cluster_id === null,
    });
  }

  const exists = db.prepare("SELECT 1 AS found FROM articles WHERE canonical_url = ?");
  const insert = db.prepare(
    `INSERT INTO articles
       (id, url, canonical_url, title, source_name, source_domain, author, published_at,
        image_url, raw_text, topics, entities, region_tags, importance, cluster_id)
     VALUES
       (@id, @url, @canonical_url, @title, @source_name, @source_domain, @author, @published_at,
        @image_url, @raw_text, @topics, '[]', @region_tags, @importance, @cluster_id)
     ON CONFLICT(canonical_url) DO NOTHING`,
  );
  const writeCluster = db.prepare("UPDATE articles SET cluster_id = ? WHERE id = ? AND cluster_id IS NULL");

  const result: StoreResult = { inserted: [], exactDuplicates: 0, nearDuplicates: 0 };
  // Oldest first, so the earliest report of a story becomes the cluster root.
  const ordered = [...candidates].sort((a, b) => a.ts - b.ts);

  db.transaction(() => {
    for (const candidate of ordered) {
      if (exists.get(candidate.canonical)) {
        result.exactDuplicates++;
        continue;
      }

      const { raw } = candidate;
      const id = articleIdFor(candidate.canonical);
      const tokens = titleTokens(raw.title);
      const match = index.findMatch(tokens, candidate.ts);
      const clusterId = match ? match.clusterId : id;

      const changes = insert.run({
        id,
        url: raw.url,
        canonical_url: candidate.canonical,
        title: raw.title.slice(0, 300),
        source_name: raw.source_name,
        source_domain: raw.source_domain,
        author: raw.author ?? null,
        published_at: raw.published_at,
        image_url: raw.image_url ?? null,
        raw_text: raw.text ? raw.text.slice(0, MAX_TEXT_CHARS) : null,
        topics: JSON.stringify(raw.topics),
        region_tags: JSON.stringify(raw.region_tags),
        importance: baselineImportance(raw.reliability),
        cluster_id: clusterId,
      }).changes;

      if (changes === 0) {
        result.exactDuplicates++;
        continue;
      }

      if (match) {
        result.nearDuplicates++;
        if (match.needsClusterWrite) {
          writeCluster.run(match.clusterId, match.id);
          match.needsClusterWrite = false;
        }
      }

      index.add({ id, tokens, ts: candidate.ts, clusterId, needsClusterWrite: false });
      result.inserted.push({
        id,
        url: raw.url,
        ts: candidate.ts,
        textLength: raw.text.length,
        reliability: raw.reliability,
        isLocal: raw.region_tags.includes("PK"),
      });
    }
  })();

  return result;
}

/** Keeps only fresh, valid, unique-by-URL articles from everything fetched. */
export function selectCandidates(
  results: readonly SourceFetchResult[],
  now: Date,
): { candidates: Candidate[]; fetched: number; invalid: number; stale: number; exactDuplicates: number } {
  const cutoff = now.getTime() - FRESH_WINDOW_MS;
  const byCanonical = new Map<string, Candidate>();
  let fetched = 0;
  let invalid = 0;
  let stale = 0;
  let exactDuplicates = 0;

  for (const result of results) {
    for (const raw of result.articles) {
      fetched++;
      const canonical = canonicalizeUrl(raw.url);
      if (!canonical || raw.title.trim().length < MIN_TITLE_CHARS) {
        invalid++;
        continue;
      }
      const ts = Date.parse(raw.published_at);
      if (Number.isNaN(ts) || ts < cutoff) {
        stale++;
        continue;
      }
      if (byCanonical.has(canonical)) {
        exactDuplicates++;
        continue;
      }
      byCanonical.set(canonical, { raw, canonical, ts });
    }
  }

  return { candidates: [...byCanonical.values()], fetched, invalid, stale, exactDuplicates };
}

/** Downloads full text and the social image for the most promising new articles. */
async function enrichWithFullText(
  db: Db,
  inserted: readonly InsertedArticle[],
  limit: number,
): Promise<{ extracted: number; failed: number }> {
  const targets = inserted
    .filter((article) => article.textLength < RICH_TEXT_CHARS)
    .sort((a, b) => {
      const scoreA = a.reliability + (a.isLocal ? 0.2 : 0);
      const scoreB = b.reliability + (b.isLocal ? 0.2 : 0);
      return scoreB - scoreA || b.ts - a.ts;
    })
    .slice(0, limit);

  const update = db.prepare(
    "UPDATE articles SET raw_text = COALESCE(?, raw_text), image_url = COALESCE(image_url, ?) WHERE id = ?",
  );

  let extracted = 0;
  let failed = 0;
  await mapLimit(targets, EXTRACT_CONCURRENCY, async (article) => {
    const page = await extractArticle(article.url);
    if (!page) {
      failed++;
      return;
    }
    const betterText = page.text && page.text.length > article.textLength ? page.text : null;
    update.run(betterText, page.image ?? null, article.id);
    extracted++;
  });
  return { extracted, failed };
}

export async function runIngest(options: IngestOptions = {}): Promise<IngestStats> {
  const started = Date.now();
  const now = new Date();
  const log = options.log ?? (() => undefined);
  const db = getDb();

  seedSources(db);
  const sources = listActiveSources(db);
  log(`Fetching ${sources.length} feeds plus the Guardian and GNews APIs...`);

  const [feedResults, guardian, gnews] = await Promise.all([
    fetchFeeds(sources, now),
    fetchGuardian(now),
    fetchGnews(now),
  ]);
  const results = [...feedResults, guardian, gnews];

  const selected = selectCandidates(results, now);
  const stored = storeCandidates(db, selected.candidates, now);
  log(`Stored ${stored.inserted.length} new articles. Fetching full text for the best candidates...`);

  const full = await enrichWithFullText(db, stored.inserted, options.extractLimit ?? DEFAULT_EXTRACT_LIMIT);

  const sinceIso = new Date(now.getTime() - FRESH_WINDOW_MS).toISOString();
  const pool = db.prepare("SELECT COUNT(*) AS count FROM articles WHERE published_at >= ?").get(sinceIso) as {
    count: number;
  };

  return {
    sourcesTried: results.filter((result) => !result.skipped).length,
    sourcesSkipped: results.filter((result) => result.skipped).map((result) => result.name),
    failedSources: results.flatMap((result) =>
      result.error && !result.skipped ? [{ name: result.name, error: result.error }] : [],
    ),
    fetched: selected.fetched,
    invalid: selected.invalid,
    stale: selected.stale,
    newArticles: stored.inserted.length,
    exactDuplicates: selected.exactDuplicates + stored.exactDuplicates,
    nearDuplicates: stored.nearDuplicates,
    extracted: full.extracted,
    extractFailed: full.failed,
    poolLast48h: pool.count,
    durationMs: Date.now() - started,
  };
}

export function formatStats(stats: IngestStats): string {
  const lines = [
    `Fetched ${stats.fetched} items from ${stats.sourcesTried} sources in ${(stats.durationMs / 1000).toFixed(1)}s`,
    `  new: ${stats.newArticles}`,
    `  duplicates: ${stats.exactDuplicates} exact, ${stats.nearDuplicates} near (clustered)`,
    `  dropped: ${stats.stale} older than 48h, ${stats.invalid} invalid`,
    `  full text: ${stats.extracted} fetched, ${stats.extractFailed} failed`,
    `  pool (last 48h): ${stats.poolLast48h} articles`,
  ];
  if (stats.sourcesTried > 0 && stats.failedSources.length === stats.sourcesTried) {
    lines.push("  every source failed: check your internet connection and try again");
  }
  if (stats.sourcesSkipped.length > 0) {
    lines.push(`  skipped (no API key): ${stats.sourcesSkipped.join(", ")}`);
  }
  if (stats.failedSources.length > 0) {
    lines.push(`  failed sources (${stats.failedSources.length}):`);
    for (const failure of stats.failedSources) lines.push(`    - ${failure.name}: ${failure.error}`);
  }
  return lines.join("\n");
}
