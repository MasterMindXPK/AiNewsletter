import { getDb } from "../db";
import type { Topic } from "../types";
import { generateJson, getLlmStats, hasGeminiKey, LlmError } from "../llm/client";
import {
  parseEnrichmentBatch,
  TOPIC_VALUES,
  type Enrichment,
} from "../llm/schemas";
import { buildEnrichmentPrompt, ENRICH_SYSTEM } from "./prompts";
import { ruleBasedEnrichment, type PendingArticle } from "./fallback";

type Db = ReturnType<typeof getDb>;

export interface EnrichOptions {
  /** Max articles to process this run (newest first). Default 400. */
  limit?: number;
  /** Articles per Gemini call. Default 15 (spec: 10 to 20). */
  batchSize?: number;
  /** Set false to force the rule-based path (used to test the fallback). */
  useLlm?: boolean;
  log?: (message: string) => void;
}

export interface EnrichStats {
  pending: number;
  enrichedByLlm: number;
  enrichedByFallback: number;
  llmCalls: number;
  durationMs: number;
}

const FALLBACK_RETRY_WINDOW_MS = 48 * 60 * 60 * 1000;
const MAX_CONSECUTIVE_BATCH_FAILURES = 2;

interface PendingRow {
  id: string;
  title: string;
  source_name: string;
  source_domain: string;
  published_at: string;
  raw_text: string | null;
  topics: string | null;
  region_tags: string | null;
  reliability: number | null;
  cluster_size: number;
}

/**
 * Adds a column that records HOW an article was enriched, so rule-based rows
 * can be retried with the LLM on a later run. Additive and idempotent; also
 * covers databases created before this column existed.
 */
function ensureEnrichSourceColumn(db: Db): void {
  const cols = db.prepare("PRAGMA table_info(articles)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "enrich_source")) {
    db.exec("ALTER TABLE articles ADD COLUMN enrich_source TEXT");
  }
}

function parseJsonArray(text: string | null): unknown[] {
  if (!text) return [];
  try {
    const v: unknown = JSON.parse(text);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function normaliseReliability(r: number | null): number {
  if (r === null || !Number.isFinite(r)) return 0.6;
  // Tolerate a 0-10 scale in the sources table.
  return Math.min(1, Math.max(0, r > 1 ? r / 10 : r));
}

function loadPending(db: Db, limit: number): PendingArticle[] {
  const cutoff = new Date(Date.now() - FALLBACK_RETRY_WINDOW_MS).toISOString();
  const rows = db
    .prepare(
      `SELECT a.id, a.title, a.source_name, a.source_domain, a.published_at,
              a.raw_text, a.topics, a.region_tags,
              (SELECT MAX(s.reliability) FROM sources s WHERE s.domain = a.source_domain) AS reliability,
              CASE WHEN a.cluster_id IS NULL THEN 1
                   ELSE (SELECT COUNT(*) FROM articles c WHERE c.cluster_id = a.cluster_id)
              END AS cluster_size
         FROM articles a
        WHERE a.summary IS NULL OR a.summary = ''
           OR (a.enrich_source = 'fallback' AND a.published_at >= ?)
        ORDER BY a.published_at DESC
        LIMIT ?`,
    )
    .all(cutoff, limit) as PendingRow[];

  const validTopics = TOPIC_VALUES as readonly string[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    source_name: r.source_name,
    source_domain: r.source_domain,
    published_at: r.published_at,
    text: r.raw_text ?? "",
    topics: parseJsonArray(r.topics).filter(
      (t): t is Topic => typeof t === "string" && validTopics.includes(t),
    ),
    region_tags: parseJsonArray(r.region_tags).filter(
      (t): t is string => typeof t === "string",
    ),
    reliability: normaliseReliability(r.reliability),
    cluster_size: Number(r.cluster_size) || 1,
  }));
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Fill gaps the model left (empty topics/regions) from M3's rule-based tags. */
function mergeWithExisting(e: Enrichment, a: PendingArticle): Enrichment {
  return {
    ...e,
    topics: e.topics.length ? e.topics : a.topics.length ? a.topics.slice(0, 3) : ["world"],
    region_tags: e.region_tags.length
      ? e.region_tags
      : a.region_tags.length
        ? a.region_tags
        : ["global"],
  };
}

function writeBatch(
  db: Db,
  rows: { enrichment: Enrichment; source: "llm" | "fallback" }[],
): void {
  const update = db.prepare(
    `UPDATE articles
        SET summary = ?, topics = ?, entities = ?, region_tags = ?,
            importance = ?, enrich_source = ?
      WHERE id = ?`,
  );
  const tx = db.transaction(() => {
    for (const { enrichment: e, source } of rows) {
      update.run(
        e.summary,
        JSON.stringify(e.topics),
        JSON.stringify(e.entities),
        JSON.stringify(e.region_tags),
        e.importance,
        source,
        e.id,
      );
    }
  });
  tx();
}

/**
 * Enrich every article that has no summary yet (plus recent rule-based rows,
 * which get another shot at the LLM). Never throws because of the LLM: any
 * failure degrades to rule-based enrichment so the edition build can proceed.
 */
export async function enrichPendingArticles(
  opts: EnrichOptions = {},
): Promise<EnrichStats> {
  const log = opts.log ?? ((m: string) => console.log(m));
  const limit = opts.limit ?? 400;
  const batchSize = Math.min(20, Math.max(1, opts.batchSize ?? 15));
  const started = Date.now();
  const callsBefore = getLlmStats().calls;

  const db = getDb();
  ensureEnrichSourceColumn(db);
  const pending = loadPending(db, limit);

  let llmEnabled = opts.useLlm !== false;
  if (llmEnabled && !hasGeminiKey()) {
    log("[enrich] GEMINI_API_KEY not set: using rule-based fallback for everything");
    llmEnabled = false;
  }

  let enrichedByLlm = 0;
  let enrichedByFallback = 0;
  let consecutiveFailures = 0;

  if (pending.length === 0) {
    log("[enrich] nothing to enrich");
    return { pending: 0, enrichedByLlm, enrichedByFallback, llmCalls: 0, durationMs: Date.now() - started };
  }
  log(`[enrich] ${pending.length} articles to enrich (batch size ${batchSize})`);

  const batches = chunk(pending, batchSize);
  for (const [index, batch] of batches.entries()) {
    const done = new Map<string, Enrichment>();

    if (llmEnabled) {
      // Up to two passes: the second only re-asks for ids the model skipped.
      for (let pass = 0; pass < 2 && done.size < batch.length; pass++) {
        const todo = batch.filter((a) => !done.has(a.id));
        try {
          const json = await generateJson(buildEnrichmentPrompt(todo), {
            system: ENRICH_SYSTEM,
          });
          const { items, rejected } = parseEnrichmentBatch(json);
          const todoIds = new Set(todo.map((a) => a.id));
          for (const item of items) {
            if (todoIds.has(item.id)) done.set(item.id, item);
          }
          if (rejected > 0) log(`[enrich]   ${rejected} item(s) failed validation`);
          consecutiveFailures = 0;
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          log(`[enrich]   LLM error: ${message}`);
          consecutiveFailures++;
          const fatal = e instanceof LlmError && e.fatal;
          if (fatal || consecutiveFailures >= MAX_CONSECUTIVE_BATCH_FAILURES) {
            llmEnabled = false;
            log("[enrich]   LLM disabled for the rest of this run; using fallback");
          }
          break;
        }
      }
    }

    const rows = batch.map((a) => {
      const fromLlm = done.get(a.id);
      return fromLlm
        ? { enrichment: mergeWithExisting(fromLlm, a), source: "llm" as const }
        : { enrichment: ruleBasedEnrichment(a), source: "fallback" as const };
    });
    writeBatch(db, rows);

    const llmCount = rows.filter((r) => r.source === "llm").length;
    enrichedByLlm += llmCount;
    enrichedByFallback += rows.length - llmCount;
    log(
      `[enrich] batch ${index + 1}/${batches.length}: ${llmCount} llm, ${rows.length - llmCount} fallback`,
    );
  }

  const stats: EnrichStats = {
    pending: pending.length,
    enrichedByLlm,
    enrichedByFallback,
    llmCalls: getLlmStats().calls - callsBefore,
    durationMs: Date.now() - started,
  };
  const pct = Math.round((enrichedByLlm / pending.length) * 100);
  log(
    `[enrich] done: ${enrichedByLlm} llm (${pct}%), ${enrichedByFallback} fallback, ${stats.llmCalls} LLM calls, ${(stats.durationMs / 1000).toFixed(1)}s`,
  );
  return stats;
}
