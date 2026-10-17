import { createHash } from "node:crypto";
import type { getDb } from "@/lib/db";
import type { Topic } from "@/lib/types";
import { isTopic } from "./normalize";

type Db = ReturnType<typeof getDb>;

export interface SourceDef {
  /** Outlet name shown to readers, for example "Dawn". Several feeds can share one outlet. */
  name: string;
  domain: string;
  feed_url: string;
  /** "PK" for Pakistani outlets, otherwise "global". */
  region: string;
  /** Topic hint for topical feeds. Leave empty for general feeds (topics are guessed per story). */
  topics: Topic[];
  /** 0..1 editorial reliability prior. */
  reliability: number;
}

export interface SourceRow extends SourceDef {
  id: string;
}

function src(
  name: string,
  domain: string,
  feed_url: string,
  region: "PK" | "global",
  topics: Topic[],
  reliability: number,
): SourceDef {
  return { name, domain, feed_url, region, topics, reliability };
}

const BBC = "http://feeds.bbci.co.uk";

export const SOURCES: SourceDef[] = [
  // ---- Pakistan ----
  src("Dawn", "dawn.com", "https://www.dawn.com/feeds/home", "PK", [], 0.9),
  src("Dawn", "dawn.com", "https://www.dawn.com/feeds/business", "PK", ["business", "economy"], 0.9),
  src("Dawn", "dawn.com", "https://www.dawn.com/feeds/sport", "PK", ["sports"], 0.9),
  src("The News", "thenews.com.pk", "https://www.thenews.com.pk/rss/1/1", "PK", [], 0.8),
  src("The Express Tribune", "tribune.com.pk", "https://tribune.com.pk/feed/home", "PK", [], 0.8),
  src("The Express Tribune", "tribune.com.pk", "https://tribune.com.pk/feed/business", "PK", ["business", "economy"], 0.8),
  src("The Express Tribune", "tribune.com.pk", "https://tribune.com.pk/feed/sports", "PK", ["sports"], 0.8),
  src("The Express Tribune", "tribune.com.pk", "https://tribune.com.pk/feed/technology", "PK", ["technology"], 0.8),
  src("The Express Tribune", "tribune.com.pk", "https://tribune.com.pk/feed/world", "PK", ["world"], 0.8),
  src("Geo News", "geo.tv", "https://www.geo.tv/rss/1/1", "PK", [], 0.75),
  src("ARY News", "arynews.tv", "https://arynews.tv/feed/", "PK", [], 0.7),
  src("Business Recorder", "brecorder.com", "https://www.brecorder.com/feeds/latest-news", "PK", ["business", "economy"], 0.85),
  src("Profit by Pakistan Today", "profit.pakistantoday.com.pk", "https://profit.pakistantoday.com.pk/feed/", "PK", ["business", "economy"], 0.8),
  src("Pakistan Today", "pakistantoday.com.pk", "https://www.pakistantoday.com.pk/feed/", "PK", [], 0.75),
  src("ProPakistani", "propakistani.pk", "https://propakistani.pk/feed/", "PK", ["technology", "business"], 0.65),

  // ---- Global ----
  src("BBC News", "bbc.co.uk", `${BBC}/news/rss.xml`, "global", [], 0.9),
  src("BBC News", "bbc.co.uk", `${BBC}/news/world/rss.xml`, "global", ["world"], 0.9),
  src("BBC News", "bbc.co.uk", `${BBC}/news/world/asia/rss.xml`, "global", ["world"], 0.9),
  src("BBC News", "bbc.co.uk", `${BBC}/news/business/rss.xml`, "global", ["business", "economy"], 0.9),
  src("BBC News", "bbc.co.uk", `${BBC}/news/technology/rss.xml`, "global", ["technology"], 0.9),
  src("BBC News", "bbc.co.uk", `${BBC}/news/science_and_environment/rss.xml`, "global", ["science", "environment"], 0.9),
  src("BBC News", "bbc.co.uk", `${BBC}/news/health/rss.xml`, "global", ["health"], 0.9),
  src("BBC News", "bbc.co.uk", `${BBC}/news/entertainment_and_arts/rss.xml`, "global", ["entertainment", "culture"], 0.9),
  src("BBC Sport", "bbc.co.uk", `${BBC}/sport/rss.xml`, "global", ["sports"], 0.9),
  src("Al Jazeera", "aljazeera.com", "https://www.aljazeera.com/xml/rss/all.xml", "global", ["world"], 0.8),
  src("The Guardian", "theguardian.com", "https://www.theguardian.com/world/rss", "global", ["world"], 0.85),
  src("The Guardian", "theguardian.com", "https://www.theguardian.com/technology/rss", "global", ["technology"], 0.85),
  src("NPR", "npr.org", "https://feeds.npr.org/1001/rss.xml", "global", [], 0.85),
  src("NPR", "npr.org", "https://feeds.npr.org/1006/rss.xml", "global", ["business", "economy"], 0.85),
  src("NPR", "npr.org", "https://feeds.npr.org/1007/rss.xml", "global", ["science"], 0.85),
  src("NPR", "npr.org", "https://feeds.npr.org/1019/rss.xml", "global", ["technology"], 0.85),
  src("NPR", "npr.org", "https://feeds.npr.org/1128/rss.xml", "global", ["health"], 0.85),
  src("Ars Technica", "arstechnica.com", "https://feeds.arstechnica.com/arstechnica/index", "global", ["technology", "science"], 0.8),
  src("The Verge", "theverge.com", "https://www.theverge.com/rss/index.xml", "global", ["technology"], 0.75),
  src("TechCrunch", "techcrunch.com", "https://techcrunch.com/feed/", "global", ["technology", "business"], 0.75),
  src("WIRED", "wired.com", "https://www.wired.com/feed/rss", "global", ["technology", "culture"], 0.75),
  src("Nature", "nature.com", "https://www.nature.com/nature.rss", "global", ["science"], 0.95),
  src("ScienceDaily", "sciencedaily.com", "https://www.sciencedaily.com/rss/all.xml", "global", ["science"], 0.7),
  src("ESPNcricinfo", "espncricinfo.com", "https://www.espncricinfo.com/rss/content/story/feeds/0.xml", "global", ["sports"], 0.8),
  src("ESPN", "espn.com", "https://www.espn.com/espn/rss/news", "global", ["sports"], 0.75),
  src("DW", "dw.com", "https://rss.dw.com/rdf/rss-en-all", "global", ["world"], 0.85),
  src("France 24", "france24.com", "https://www.france24.com/en/rss", "global", ["world"], 0.8),
  src("Sky News", "news.sky.com", "https://feeds.skynews.com/feeds/rss/world.xml", "global", ["world"], 0.75),
  src("CNBC", "cnbc.com", "https://www.cnbc.com/id/100003114/device/rss/rss.html", "global", ["business", "economy"], 0.8),
  src("World Health Organization", "who.int", "https://www.who.int/rss-feeds/news-english.xml", "global", ["health"], 0.9),
];

export function sourceId(feedUrl: string): string {
  return createHash("sha1").update(feedUrl).digest("hex").slice(0, 12);
}

/**
 * Inserts or refreshes the built-in feeds. Safe to run on every ingest: it never touches the
 * `active` flag, so a feed you disable in the database stays disabled.
 */
export function seedSources(db: Db): number {
  const upsert = db.prepare(
    `INSERT INTO sources (id, name, domain, feed_url, region, topics, reliability, active)
     VALUES (@id, @name, @domain, @feed_url, @region, @topics, @reliability, 1)
     ON CONFLICT(feed_url) DO UPDATE SET
       name = excluded.name,
       domain = excluded.domain,
       region = excluded.region,
       topics = excluded.topics,
       reliability = excluded.reliability`,
  );
  db.transaction(() => {
    for (const source of SOURCES) {
      upsert.run({
        id: sourceId(source.feed_url),
        name: source.name,
        domain: source.domain,
        feed_url: source.feed_url,
        region: source.region,
        topics: JSON.stringify(source.topics),
        reliability: source.reliability,
      });
    }
  })();
  return SOURCES.length;
}

interface SourceDbRow {
  id: string;
  name: string;
  domain: string;
  feed_url: string;
  region: string;
  topics: string;
  reliability: number;
}

function parseTopics(json: string): Topic[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is Topic => typeof value === "string" && isTopic(value))
      : [];
  } catch {
    return [];
  }
}

export function listActiveSources(db: Db): SourceRow[] {
  const rows = db
    .prepare(
      "SELECT id, name, domain, feed_url, region, topics, reliability FROM sources WHERE active = 1",
    )
    .all() as SourceDbRow[];
  return rows.map((row) => ({ ...row, topics: parseTopics(row.topics) }));
}
