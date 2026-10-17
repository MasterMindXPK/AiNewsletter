import { z } from "zod";
import type { Topic } from "@/lib/types";
import {
  MAX_TEXT_CHARS,
  hostOf,
  stripHtml,
  toIsoDate,
  topicsFor,
  type RawArticle,
  type SourceFetchResult,
} from "./normalize";
import { USER_AGENT, errorMessage, mapLimit } from "./util";

const ENDPOINT = "https://gnews.io/api/v4/top-headlines";
const TIMEOUT_MS = 15_000;
const RELIABILITY = 0.65; // aggregator: outlets vary
const NAME = "GNews API";

interface Query {
  category: string;
  /** ISO 3166 country code, or undefined for worldwide. */
  country?: string;
  topic: Topic;
}

// The free plan allows about 100 requests a day and 10 articles per request, so keep this short.
const QUERIES: Query[] = [
  { country: "pk", category: "general", topic: "world" },
  { country: "pk", category: "nation", topic: "politics" },
  { country: "pk", category: "business", topic: "business" },
  { country: "pk", category: "sports", topic: "sports" },
  { country: "pk", category: "technology", topic: "technology" },
  { country: "pk", category: "health", topic: "health" },
  { category: "world", topic: "world" },
  { category: "science", topic: "science" },
];

const responseSchema = z.object({
  articles: z.array(
    z.object({
      title: z.string(),
      description: z.string().nullish(),
      content: z.string().nullish(),
      url: z.string(),
      image: z.string().nullish(),
      publishedAt: z.string(),
      source: z.object({ name: z.string(), url: z.string().optional() }).optional(),
    }),
  ),
});

async function runQuery(apiKey: string, query: Query, now: Date): Promise<RawArticle[]> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("lang", "en");
  url.searchParams.set("max", "10");
  url.searchParams.set("category", query.category);
  if (query.country) url.searchParams.set("country", query.country);

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for category "${query.category}"`);

  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error(`Unexpected response shape for category "${query.category}"`);

  const region = query.country ? query.country.toUpperCase() : "global";
  return parsed.data.articles.map((article) => {
    const title = stripHtml(article.title);
    const text = stripHtml(`${article.description ?? ""} ${article.content ?? ""}`).slice(0, MAX_TEXT_CHARS);
    return {
      url: article.url,
      title,
      source_name: article.source?.name ?? "GNews",
      source_domain: hostOf(article.source?.url ?? article.url) ?? "gnews.io",
      published_at: toIsoDate(article.publishedAt, now),
      image_url: article.image ?? undefined,
      text,
      topics: topicsFor([query.topic], title, text),
      region_tags: [region],
      reliability: RELIABILITY,
    };
  });
}

export async function fetchGnews(now: Date): Promise<SourceFetchResult> {
  const apiKey = process.env.GNEWS_API_KEY?.trim();
  if (!apiKey) return { name: NAME, articles: [], skipped: true };

  const settled = await mapLimit(QUERIES, 2, async (query) => {
    try {
      return { articles: await runQuery(apiKey, query, now) };
    } catch (error) {
      return { articles: [] as RawArticle[], error: errorMessage(error) };
    }
  });

  const articles = settled.flatMap((entry) => entry.articles);
  const errors = settled.flatMap((entry) => (entry.error ? [entry.error] : []));
  return { name: NAME, articles, error: articles.length === 0 && errors.length > 0 ? errors[0] : undefined };
}
