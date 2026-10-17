import { z } from "zod";
import type { Topic } from "@/lib/types";
import {
  MAX_TEXT_CHARS,
  FRESH_WINDOW_MS,
  stripHtml,
  toIsoDate,
  topicsFor,
  type RawArticle,
  type SourceFetchResult,
} from "./normalize";
import { USER_AGENT, errorMessage, mapLimit } from "./util";

const ENDPOINT = "https://content.guardianapis.com/search";
const PAGE_SIZE = 25;
const TIMEOUT_MS = 15_000;
const RELIABILITY = 0.85;
const NAME = "Guardian API";

/** Guardian section id to our topic. One request per section keeps results from skewing to UK news. */
const SECTION_TOPICS: Record<string, Topic> = {
  world: "world",
  business: "business",
  technology: "technology",
  science: "science",
  environment: "environment",
  commentisfree: "opinion",
  sport: "sports",
  culture: "culture",
  politics: "politics",
  education: "education",
  lifeandstyle: "lifestyle",
};

const responseSchema = z.object({
  response: z.object({
    results: z.array(
      z.object({
        webTitle: z.string(),
        webUrl: z.string(),
        webPublicationDate: z.string(),
        fields: z
          .object({
            trailText: z.string().optional(),
            thumbnail: z.string().optional(),
            byline: z.string().optional(),
            bodyText: z.string().optional(),
          })
          .optional(),
      }),
    ),
  }),
});

async function fetchSection(
  apiKey: string,
  section: string,
  topic: Topic,
  fromDate: string,
  now: Date,
): Promise<RawArticle[]> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("section", section);
  url.searchParams.set("from-date", fromDate);
  url.searchParams.set("order-by", "newest");
  url.searchParams.set("page-size", String(PAGE_SIZE));
  url.searchParams.set("show-fields", "trailText,thumbnail,byline,bodyText");

  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for section "${section}"`);

  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error(`Unexpected response shape for section "${section}"`);

  return parsed.data.response.results.map((result) => {
    const text = stripHtml(result.fields?.bodyText ?? result.fields?.trailText ?? "").slice(0, MAX_TEXT_CHARS);
    const title = stripHtml(result.webTitle);
    return {
      url: result.webUrl,
      title,
      source_name: "The Guardian",
      source_domain: "theguardian.com",
      author: result.fields?.byline?.trim() || undefined,
      published_at: toIsoDate(result.webPublicationDate, now),
      image_url: result.fields?.thumbnail,
      text,
      topics: topicsFor([topic], title, text),
      region_tags: ["global"],
      reliability: RELIABILITY,
    };
  });
}

export async function fetchGuardian(now: Date): Promise<SourceFetchResult> {
  const apiKey = process.env.GUARDIAN_API_KEY?.trim();
  if (!apiKey) return { name: NAME, articles: [], skipped: true };

  const fromDate = new Date(now.getTime() - FRESH_WINDOW_MS).toISOString().slice(0, 10);
  const sections = Object.entries(SECTION_TOPICS);

  const settled = await mapLimit(sections, 4, async ([section, topic]) => {
    try {
      return { articles: await fetchSection(apiKey, section, topic, fromDate, now) };
    } catch (error) {
      return { articles: [] as RawArticle[], error: errorMessage(error) };
    }
  });

  const articles = settled.flatMap((entry) => entry.articles);
  const errors = settled.flatMap((entry) => (entry.error ? [entry.error] : []));
  // Only report a failure when nothing came back, so one bad section does not hide good data.
  return { name: NAME, articles, error: articles.length === 0 && errors.length > 0 ? errors[0] : undefined };
}
