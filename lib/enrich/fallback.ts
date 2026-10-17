import type { Topic } from "../types";
import type { Enrichment } from "../llm/schemas";

/** An article row that still needs enrichment, with the context we need. */
export interface PendingArticle {
  id: string;
  title: string;
  source_name: string;
  source_domain: string;
  published_at: string;
  /** Feed snippet or extracted body (may contain HTML, may be empty). */
  text: string;
  /** Topics pre-filled by M3's rules (already validated). */
  topics: Topic[];
  /** Region tags pre-filled by M3's rules. */
  region_tags: string[];
  /** Source reliability, normalised to 0..1. */
  reliability: number;
  /** Number of articles sharing this cluster (1 if unclustered). */
  cluster_size: number;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

export function stripHtml(input: string): string {
  return input
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function firstSentences(text: string, count = 2, maxChars = 320): string {
  const sentences = text
    .split(/(?<=[.!?])\s+(?=["'\u201C\u2018A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
  let out = sentences.slice(0, count).join(" ");
  if (out.length > maxChars) {
    out = out.slice(0, maxChars).replace(/\s+\S*$/, "") + "\u2026";
  }
  return out;
}

/**
 * Deterministic enrichment used when the LLM is unavailable or returns
 * something unusable. Keeps the edition build alive; quality is lower:
 *  - summary: first two sentences of the text (or the headline)
 *  - topics/regions: whatever M3's rules already assigned
 *  - entities: none (M10 connections need the LLM for these)
 *  - importance: source reliability, plus a bonus when many outlets cover it
 */
export function ruleBasedEnrichment(a: PendingArticle): Enrichment {
  const text = stripHtml(a.text);
  const body = text.length >= 40 ? firstSentences(text) : "";
  const summary = body.length >= 20 ? body : a.title.trim();

  const base = 0.2 + 0.35 * clamp(a.reliability, 0, 1);
  const coverageBonus = Math.min(0.2, 0.07 * Math.max(0, a.cluster_size - 1));
  const importance = Math.round(clamp(base + coverageBonus, 0.1, 0.7) * 100) / 100;

  return {
    id: a.id,
    summary: summary.length >= 20 ? summary : `${summary} (no further detail available)`,
    topics: a.topics.length ? a.topics.slice(0, 3) : ["world"],
    entities: [],
    region_tags: a.region_tags.length ? a.region_tags : ["global"],
    importance,
  };
}
