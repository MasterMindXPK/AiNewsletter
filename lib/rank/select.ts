import type { Topic } from "../types";
import {
  scoreArticle,
  type ArticleForScoring,
  type InterestWeight,
  type UserContext,
  type ScoreContext,
} from "./score";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoredArticle {
  article: ArticleForScoring;
  score: number;
  /** True when this article is an exploration pick (low-interest topic). */
  isExploration: boolean;
}

export interface SelectOptions {
  readingDepth: "brief" | "standard" | "deep";
  interests: InterestWeight[];
  user: UserContext;
  /** Article ids shown in the last 3 editions → eligible but penalised. */
  seenArticleIds: Set<string>;
  /** Topics to hard-filter out (weight = 0 or explicit hide). */
  hiddenTopics: Set<string>;
  /** Source domains to hard-filter out (explicit hide). */
  hiddenSources: Set<string>;
  /** topic → count of appearances in last 3 editions (for exploration bonus). */
  seenTopicCounts: Map<string, number>;
  now: Date;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORY_COUNTS: Record<"brief" | "standard" | "deep", number> = {
  brief: 8,
  standard: 14,
  deep: 22,
};

// How many of the total slots are reserved for exploration.
const EXPLORATION_COUNTS: Record<"brief" | "standard" | "deep", number> = {
  brief: 1,
  standard: 2,
  deep: 3,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * An article counts as exploration when ALL its topics have low user weight
 * (< 0.35) or are absent from the interest list entirely.
 */
function isExplorationArticle(
  article: ArticleForScoring,
  interests: InterestWeight[],
): boolean {
  const topicWeights = new Map(
    interests.filter((w) => w.kind === "topic").map((w) => [w.key, w.weight]),
  );
  return article.topics.every((t) => (topicWeights.get(t) ?? 0) < 0.35);
}

/** Hard-filter: returns false when the article must be excluded entirely. */
function passesHardFilter(article: ArticleForScoring, opts: SelectOptions): boolean {
  for (const t of article.topics) {
    if (opts.hiddenTopics.has(t)) return false;
  }
  if (opts.hiddenSources.has(article.source_domain)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Main selection
// ---------------------------------------------------------------------------

/**
 * Select up to `total` articles from `pool` using scored greedy selection.
 * - One article per cluster (near-duplicate deduplication).
 * - Source diversity enforced via a running count passed into the scoring context.
 * - A small number of slots are reserved for exploration picks.
 * - Already-seen articles are penalised but not hard-filtered.
 */
export function selectArticles(
  pool: ArticleForScoring[],
  opts: SelectOptions,
): ScoredArticle[] {
  const total = STORY_COUNTS[opts.readingDepth];
  const explorationTarget = EXPLORATION_COUNTS[opts.readingDepth];

  // ── 1. Hard filter ──────────────────────────────────────────────────────
  const eligible = pool.filter((a) => passesHardFilter(a, opts));

  // ── 2. Cluster deduplication (keep first occurrence per cluster) ─────────
  const seenClusters = new Set<string>();
  const deduped = eligible.filter((a) => {
    const key = a.cluster_id ?? a.id;
    if (seenClusters.has(key)) return false;
    seenClusters.add(key);
    return true;
  });

  // ── 3. Score all candidates ──────────────────────────────────────────────
  const runningSourceCounts = new Map<string, number>();
  const ctx: ScoreContext = {
    interests: opts.interests,
    seenTopicCounts: opts.seenTopicCounts,
    runningSourceCounts,
    seenArticleIds: opts.seenArticleIds,
    user: opts.user,
    now: opts.now,
  };

  const scored: ScoredArticle[] = deduped
    .map((a) => ({
      article: a,
      score: scoreArticle(a, ctx),
      isExploration: isExplorationArticle(a, opts.interests),
    }))
    .sort((a, b) => b.score - a.score);

  // ── 4. Greedy selection with diversity tracking ──────────────────────────
  const selected: ScoredArticle[] = [];
  const selectedIds = new Set<string>();
  let explorationChosen = 0;
  let mainChosen = 0;
  const mainTarget = total - explorationTarget;

  for (const sa of scored) {
    if (selected.length >= total) break;
    if (selectedIds.has(sa.article.id)) continue;

    const isExpl = sa.isExploration;

    if (isExpl) {
      if (explorationChosen >= explorationTarget) continue;
      explorationChosen++;
    } else {
      if (mainChosen >= mainTarget) continue;
      mainChosen++;
    }

    selected.push(sa);
    selectedIds.add(sa.article.id);

    // Update source diversity counter so later articles are penalised correctly.
    const srcCount = (runningSourceCounts.get(sa.article.source_domain) ?? 0) + 1;
    runningSourceCounts.set(sa.article.source_domain, srcCount);
  }

  // ── 5. Back-fill if we are short (e.g. too few exploration candidates) ───
  if (selected.length < total) {
    for (const sa of scored) {
      if (selected.length >= total) break;
      if (selectedIds.has(sa.article.id)) continue;
      selected.push(sa);
      selectedIds.add(sa.article.id);
    }
  }

  // Return in descending score order.
  return selected.sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Size assignment
// ---------------------------------------------------------------------------

/**
 * Assign display sizes.
 * - Position 0        → lead
 * - Positions 1–2     → major
 * - Last ~20 % or 3   → brief
 * - Everything else   → standard
 */
export function assignSizes(
  items: ScoredArticle[],
): Map<string, "lead" | "major" | "standard" | "brief"> {
  const n = items.length;
  const briefCutoff = Math.max(n - 3, Math.ceil(n * 0.8));
  const sizes = new Map<string, "lead" | "major" | "standard" | "brief">();

  items.forEach(({ article }, i) => {
    let size: "lead" | "major" | "standard" | "brief";
    if (i === 0) size = "lead";
    else if (i <= 2) size = "major";
    else if (i >= briefCutoff) size = "brief";
    else size = "standard";
    sizes.set(article.id, size);
  });

  return sizes;
}
