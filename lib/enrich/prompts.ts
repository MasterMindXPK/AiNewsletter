import { TOPIC_VALUES } from "../llm/schemas";
import { stripHtml, type PendingArticle } from "./fallback";

const MAX_TEXT_CHARS = 1500;

export const ENRICH_SYSTEM = `You are a news editor's assistant that turns raw articles into structured data.
Use ONLY information present in the provided text. Never speculate or add outside facts.
Be neutral: no opinion, no loaded language. Output JSON only.`;

export function buildEnrichmentPrompt(articles: PendingArticle[]): string {
  const payload = articles.map((a) => ({
    id: a.id,
    title: a.title,
    source: a.source_name,
    published_at: a.published_at,
    text: stripHtml(a.text).slice(0, MAX_TEXT_CHARS),
  }));

  return `For each article below, return JSON only.
Use ONLY information in the text. Do not speculate.
Return a JSON array with exactly one object per input article, using the same "id" values.
Schema: [{ "id": string, "summary": string (2-3 neutral sentences),
  "topics": Topic[] (max 3, most relevant first, from: ${TOPIC_VALUES.join(", ")}),
  "entities": [{ "name": string, "type": "org|person|place|commodity|currency|event" }] (max 8),
  "region_tags": string[] (ISO 3166-1 alpha-2 country codes the story directly concerns, or "global"),
  "importance": number 0..1 }]

Rules:
- Entity names must be normalized, canonical forms: "Brent crude" not "oil prices", "State Bank of Pakistan" not "the central bank", "PKR" for the Pakistani rupee. Use "commodity" for things like crude oil, wheat, gold; "currency" for currency codes.
- If the text is only a headline, base the summary on the headline and do not invent detail.
- Importance guide: 0.9+ affects millions or is a major global event; 0.5 notable regional news; 0.2 niche or soft news. Use the full range.

Articles:
${JSON.stringify(payload)}`;
}
