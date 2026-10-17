import { createHash } from "node:crypto";
import type { Topic } from "@/lib/types";
import { TOPIC_KEYS } from "@/lib/onboarding/topics";

export const FRESH_WINDOW_MS = 48 * 60 * 60 * 1000;
export const MAX_TEXT_CHARS = 6000;

/** An article as fetched from any source, before it is checked and stored. */
export interface RawArticle {
  url: string;
  title: string;
  source_name: string;
  source_domain: string;
  author?: string;
  published_at: string; // ISO
  image_url?: string;
  /** Feed snippet or body text. Internal use only (LLM input), never republished. */
  text: string;
  topics: Topic[];
  region_tags: string[];
  /** 0..1, copied from the source. */
  reliability: number;
}

/** What one source (a feed or an API) returned in a run. */
export interface SourceFetchResult {
  name: string;
  articles: RawArticle[];
  error?: string;
  /** True when the source was intentionally not queried (for example, no API key). */
  skipped?: boolean;
}

const TOPIC_SET = new Set<string>(TOPIC_KEYS);

export function isTopic(value: string): value is Topic {
  return TOPIC_SET.has(value);
}

// ---------------------------------------------------------------------------
// URLs and ids
// ---------------------------------------------------------------------------

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "ref",
  "ref_src",
  "ref_url",
  "ocid",
  "cmpid",
  "cmp",
  "taid",
  "xtor",
  "ito",
]);

/** Strips tracking parameters and fragments so the same story has one key. Returns null if invalid. */
export function canonicalizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.protocol = "https:";
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (
        lower.startsWith("utm_") ||
        lower.startsWith("at_") ||
        lower.startsWith("ns_") ||
        TRACKING_PARAMS.has(lower)
      ) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return null;
  }
}

/** Stable id, so re-running ingestion never creates a second row for the same story. */
export function articleIdFor(canonicalUrl: string): string {
  return createHash("sha1").update(canonicalUrl).digest("hex").slice(0, 16);
}

/** Host without "www.", or null when the URL is invalid. */
export function hostOf(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Resolves a possibly relative image URL; keeps only http(s). */
export function absoluteUrl(candidate: string | undefined, base: string): string | undefined {
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate.trim(), base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&rdquo;": "”",
  "&ldquo;": "“",
  "&hellip;": "…",
  "&ndash;": "–",
  "&mdash;": "—",
};

export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d{1,6});/g, (match, code: string) => {
      try {
        return String.fromCodePoint(Number(code));
      } catch {
        return match;
      }
    })
    .replace(/&[a-z]+;|&#39;/gi, (entity) => NAMED_ENTITIES[entity.toLowerCase()] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "in", "on", "for", "and", "or", "at", "by", "with", "from",
  "as", "is", "are", "was", "were", "be", "has", "have", "had", "after", "over", "amid",
  "says", "say", "said", "new", "its", "it", "this", "that", "will", "up", "down",
]);

/** Normalized title tokens for near-duplicate detection. */
export function titleTokens(title: string): Set<string> {
  const withoutSuffix = title.replace(/\s+[|\-–—]\s+[^|\-–—]{2,40}$/, "");
  const cleaned = withoutSuffix
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ");
  const tokens = cleaned.split(/\s+/).filter((token) => token.length > 1 && !STOPWORDS.has(token));
  return new Set(tokens);
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** Parses a feed date into ISO. Future dates are clamped to now; missing or bad dates use now. */
export function toIsoDate(value: unknown, now: Date): string {
  const parsed =
    typeof value === "string" || typeof value === "number" || value instanceof Date
      ? new Date(value)
      : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return now.toISOString();
  const ceiling = now.getTime() + 60 * 60 * 1000;
  return new Date(Math.min(parsed.getTime(), ceiling)).toISOString();
}

// ---------------------------------------------------------------------------
// Rule-based topic guess (used until LLM enrichment runs, and as its fallback)
// ---------------------------------------------------------------------------

const TOPIC_PATTERNS: [Topic, RegExp][] = [
  ["energy", /\b(oil|crude|brent|petrol|diesel|lng|opec|fuel|electricity|power tariff|solar|renewables?|energy|circular debt|nepra)\b/i],
  ["economy", /\b(inflation|imf|interest rates?|gdp|budget|economy|economic|rupee|taxes|sbp|central bank|recession|tariffs?)\b/i],
  ["business", /\b(stocks?|shares|psx|markets?|companies|company|profits?|earnings|merger|acquisition|investors?|bank|exports?|imports?|ceo)\b/i],
  ["technology", /\b(ai|artificial intelligence|software|apps?|smartphones?|google|apple|microsoft|openai|chips?|cyber\w*|hackers?|tech|robots?|nvidia|tesla)\b/i],
  ["sports", /\b(cricket|football|match|tournament|psl|olympics?|fifa|icc|league|goal|tennis|hockey|wicket|innings)\b/i],
  ["health", /\b(health|hospital|doctors?|disease|virus|vaccine|dengue|cancer|patients?|medical|who)\b/i],
  ["science", /\b(scientists?|researchers?|study|nasa|space|planet|species|physics|quantum|astronomy|discovery)\b/i],
  ["environment", /\b(climate|flood\w*|pollution|smog|heatwave|emissions|wildlife|monsoon|carbon|glacier)\b/i],
  ["education", /\b(schools?|universit\w+|students?|exams?|curriculum|hec|teachers?|scholarships?)\b/i],
  ["crime", /\b(police|arrested?|murder|court|trial|sentenced|terror\w*|killed|robbery|fraud)\b/i],
  ["politics", /\b(government|minister|parliament|election\w*|senate|president|prime minister|party|assembly|pti|pml|ppp|cabinet|congress)\b/i],
  ["entertainment", /\b(film|movie|drama|actors?|actress|singer|netflix|bollywood|box office|album|concert|series)\b/i],
  ["culture", /\b(art|books?|author|museum|festival|poetry|exhibition|heritage)\b/i],
  ["travel", /\b(airline|flights?|airport|visa|tourism|tourists?|travel)\b/i],
  ["lifestyle", /\b(recipe|fashion|fitness|diet|wedding|wellbeing|food|home decor)\b/i],
  ["world", /\b(ceasefire|united nations|nato|gaza|ukraine|summit|war|sanctions|diplomat\w*)\b/i],
];

export function guessTopics(title: string, text: string): Topic[] {
  const haystack = `${title} ${text.slice(0, 300)}`;
  const found: Topic[] = [];
  for (const [topic, pattern] of TOPIC_PATTERNS) {
    if (pattern.test(haystack)) found.push(topic);
    if (found.length === 3) break;
  }
  return found;
}

/** Source topics win when the feed is topical; otherwise guess from the text. */
export function topicsFor(hint: readonly Topic[], title: string, text: string): Topic[] {
  if (hint.length > 0) return [...hint].slice(0, 3);
  return guessTopics(title, text);
}
