import type { Topic } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArticleForScoring {
  id: string;
  title: string;
  summary: string;
  topics: Topic[];
  entities: { name: string; type: string }[];
  region_tags: string[];
  importance: number;
  published_at: string;
  source_domain: string;
  /** Normalised 0..1 source reliability (already resolved from sources table). */
  reliability: number;
  cluster_id: string | null;
}

export interface InterestWeight {
  key: string;
  kind: "topic" | "keyword" | "entity";
  weight: number;
}

export interface UserContext {
  country: string;  // ISO code, e.g. "PK"
  city: string;
  profession: string;
  industry?: string | null;
  situation_tags: string[];
  reading_depth: "brief" | "standard" | "deep";
}

export interface ScoreContext {
  interests: InterestWeight[];
  /** topic -> count of times the topic appeared in the last 3 editions (for exploration). */
  seenTopicCounts: Map<string, number>;
  /** source_domain -> count of times already selected in THIS edition (diversity). */
  runningSourceCounts: Map<string, number>;
  /** article ids that appeared in the last 3 editions. */
  seenArticleIds: Set<string>;
  user: UserContext;
  now: Date;
}

// ---------------------------------------------------------------------------
// Component scorers
// ---------------------------------------------------------------------------

const RECENCY_HALF_LIFE_MS = 12 * 60 * 60 * 1000; // 12 h

export function recencyScore(publishedAt: string, now: Date): number {
  const age = now.getTime() - Date.parse(publishedAt);
  if (age < 0) return 1;
  return Math.exp((-Math.LN2 * age) / RECENCY_HALF_LIFE_MS);
}

function interestMatch(article: ArticleForScoring, interests: InterestWeight[]): number {
  if (interests.length === 0) return 0;

  const haystack = `${article.title} ${article.summary}`.toLowerCase();
  const articleEntities = new Set(article.entities.map((e) => e.name.toLowerCase()));
  let best = 0;

  for (const w of interests) {
    let hit = false;
    if (w.kind === "topic") {
      hit = article.topics.includes(w.key as Topic);
    } else if (w.kind === "keyword") {
      hit = haystack.includes(w.key.toLowerCase());
    } else if (w.kind === "entity") {
      hit = articleEntities.has(w.key.toLowerCase());
    }
    if (hit && w.weight > best) best = w.weight;
  }

  return best;
}

// Rough profession → relevant topic hints for local-relevance bonus.
const PROFESSION_TOPIC_HINTS: [RegExp, Topic[]][] = [
  [/engineer|developer|software|tech/i, ["technology", "science"]],
  [/doctor|nurse|medical|physician/i, ["health", "science"]],
  [/teacher|professor|educator/i, ["education", "science"]],
  [/farmer|agriculture/i, ["environment", "economy"]],
  [/journalist|reporter|editor/i, ["world", "politics"]],
  [/investor|banker|trader|finance/i, ["business", "economy", "energy"]],
  [/lawyer|attorney/i, ["crime", "politics"]],
  [/student/i, ["education", "science", "technology"]],
  [/exporter|importer|trade/i, ["business", "economy"]],
];

function localRelevance(article: ArticleForScoring, user: UserContext): number {
  let score = 0;

  // Country / global region tags
  if (article.region_tags.includes(user.country)) score += 0.6;
  else if (article.region_tags.includes("global")) score += 0.15;

  // City mentioned in text
  if (user.city) {
    const combined = `${article.title} ${article.summary}`.toLowerCase();
    if (combined.includes(user.city.toLowerCase())) score += 0.3;
  }

  // Profession topic affinity
  for (const [pattern, topics] of PROFESSION_TOPIC_HINTS) {
    if (pattern.test(user.profession)) {
      if (topics.some((t) => article.topics.includes(t))) {
        score += 0.25;
      }
      break;
    }
  }

  return Math.min(1, score);
}

function explorationBonus(
  article: ArticleForScoring,
  seenTopicCounts: Map<string, number>,
): number {
  for (const topic of article.topics) {
    const count = seenTopicCounts.get(topic) ?? 0;
    if (count === 0) return 0.8; // never shown this topic → strong exploration
    if (count <= 1) return 0.4;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------

/**
 * Score = 0.40 * interestMatch
 *       + 0.20 * importance
 *       + 0.15 * recency       (exp decay, half-life ~12h)
 *       + 0.10 * localRelevance
 *       + 0.10 * exploration   (adjacent topics the user has not seen)
 *       + 0.05 * sourceReliability
 *       - diversityPenalty     (3rd+ from same source this edition)
 *       - seenPenalty          (already shown in last 3 editions)
 */
export function scoreArticle(article: ArticleForScoring, ctx: ScoreContext): number {
  const im = interestMatch(article, ctx.interests);
  const imp = article.importance;
  const rec = recencyScore(article.published_at, ctx.now);
  const loc = localRelevance(article, ctx.user);
  const exp = explorationBonus(article, ctx.seenTopicCounts);
  const rel = Math.min(1, Math.max(0, article.reliability));

  // Diversity penalty: 3rd+ selection from the same source this edition
  const srcCount = ctx.runningSourceCounts.get(article.source_domain) ?? 0;
  const diversityPenalty = srcCount >= 2 ? 0.12 * (srcCount - 1) : 0;

  // Seen penalty: shown in one of the last 3 editions
  const seenPenalty = ctx.seenArticleIds.has(article.id) ? 0.4 : 0;

  const raw =
    0.40 * im +
    0.20 * imp +
    0.15 * rec +
    0.10 * loc +
    0.10 * exp +
    0.05 * rel -
    diversityPenalty -
    seenPenalty;

  return Math.max(0, Math.min(1, raw));
}
