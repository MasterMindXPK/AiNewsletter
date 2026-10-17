import Parser from "rss-parser";
import type { SourceRow } from "./sources";
import {
  MAX_TEXT_CHARS,
  absoluteUrl,
  stripHtml,
  toIsoDate,
  topicsFor,
  type RawArticle,
  type SourceFetchResult,
} from "./normalize";
import { USER_AGENT, errorMessage, mapLimit, withTimeout } from "./util";

const FEED_TIMEOUT_MS = 15_000;
const FEED_CONCURRENCY = 8;
const MAX_ITEMS_PER_FEED = 100;

interface ItemExtras {
  mediaContent?: unknown;
  mediaThumbnail?: unknown;
  contentEncoded?: string;
}

const parser = new Parser<unknown, ItemExtras>({
  timeout: FEED_TIMEOUT_MS,
  headers: {
    "User-Agent": USER_AGENT,
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

type FeedItem = Parser.Item & ItemExtras;

/** First usable image URL from an xml2js media element (or array of them). */
function mediaUrl(value: unknown, requireImage: boolean): string | undefined {
  const list = Array.isArray(value) ? value : [value];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const attrs = (entry as { $?: Record<string, string | undefined> }).$;
    const url = attrs?.url;
    if (!url) continue;
    if (requireImage) {
      const isImage =
        attrs.medium === "image" || (attrs.type ?? "").startsWith("image") || (!attrs.medium && !attrs.type);
      if (!isImage) continue;
    }
    return url;
  }
  return undefined;
}

function firstImgSrc(html: string | undefined): string | undefined {
  if (!html) return undefined;
  return /<img[^>]+src=["']([^"']+)["']/i.exec(html)?.[1];
}

function imageFor(item: FeedItem, link: string): string | undefined {
  const enclosure = item.enclosure;
  const enclosureImage =
    enclosure?.url && (enclosure.type ?? "").startsWith("image") ? enclosure.url : undefined;
  const candidate =
    mediaUrl(item.mediaContent, true) ??
    mediaUrl(item.mediaThumbnail, false) ??
    enclosureImage ??
    firstImgSrc(item.contentEncoded) ??
    firstImgSrc(item.content);
  return absoluteUrl(candidate, link);
}

function toRawArticle(item: FeedItem, source: SourceRow, now: Date): RawArticle | null {
  const link = item.link ?? (item.guid?.startsWith("http") ? item.guid : undefined);
  const title = item.title ? stripHtml(item.title) : "";
  if (!link || !title) return null;

  const body = stripHtml(item.contentEncoded ?? item.content ?? "");
  const snippet = item.contentSnippet ?? stripHtml(item.summary ?? "");
  const text = (body.length > snippet.length ? body : snippet).slice(0, MAX_TEXT_CHARS);

  return {
    url: link,
    title,
    source_name: source.name,
    source_domain: source.domain,
    author: item.creator?.trim() || undefined,
    published_at: toIsoDate(item.isoDate ?? item.pubDate, now),
    image_url: imageFor(item, link),
    text,
    topics: topicsFor(source.topics, title, text),
    region_tags: [source.region],
    reliability: source.reliability,
  };
}

export async function fetchFeed(source: SourceRow, now: Date): Promise<SourceFetchResult> {
  const name = `${source.name} <${source.feed_url}>`;
  try {
    const feed = await withTimeout(parser.parseURL(source.feed_url), FEED_TIMEOUT_MS + 3000, source.name);
    const articles: RawArticle[] = [];
    for (const item of feed.items.slice(0, MAX_ITEMS_PER_FEED)) {
      const article = toRawArticle(item, source, now);
      if (article) articles.push(article);
    }
    return { name, articles };
  } catch (error) {
    return { name, articles: [], error: errorMessage(error) };
  }
}

/** Fetches all feeds in parallel (bounded). One failing feed never affects the others. */
export function fetchFeeds(sources: readonly SourceRow[], now: Date): Promise<SourceFetchResult[]> {
  return mapLimit(sources, FEED_CONCURRENCY, (source) => fetchFeed(source, now));
}
