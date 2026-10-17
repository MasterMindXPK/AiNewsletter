import { SiteNav } from "@/components/site-nav";
import { ArchiveView } from "@/components/archive/archive-view";
import type { EditionSummary } from "@/components/archive/edition-tile";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import type { Article, EditionItem, Topic } from "@/lib/types";
import { formatEditionDate, DEFAULT_TIMEZONE } from "@/lib/utils/date";
import { mockArticles } from "@/lib/mock/articles";
import { mockEdition } from "@/lib/mock/edition";

export const dynamic = "force-dynamic";

interface EditionRow {
  id: string;
  user_id: string;
  edition_date: string;
  headline_of_the_day: string;
  items: string;
  pdf_path: string | null;
  generated_at: string;
}

interface ArticleDbRow {
  id: string;
  url: string;
  canonical_url: string;
  title: string;
  source_name: string;
  source_domain: string;
  author: string | null;
  published_at: string;
  image_url: string | null;
  raw_text: string | null;
  summary: string;
  topics: string;
  entities: string;
  region_tags: string;
  importance: number;
  cluster_id: string | null;
  created_at: string;
}

function parseJson<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function mapRowToArticle(r: ArticleDbRow): Article {
  return {
    id: r.id,
    url: r.url,
    canonical_url: r.canonical_url,
    title: r.title,
    source_name: r.source_name,
    source_domain: r.source_domain,
    author: r.author ?? undefined,
    published_at: r.published_at,
    image_url: r.image_url ?? undefined,
    raw_text: r.raw_text ?? undefined,
    summary: r.summary,
    topics: parseJson<Topic[]>(r.topics, []),
    entities: parseJson<{ name: string; type: "org" | "person" | "place" | "commodity" | "currency" | "event" }[]>(
      r.entities,
      []
    ),
    region_tags: parseJson<string[]>(r.region_tags, []),
    importance: r.importance,
    cluster_id: r.cluster_id ?? undefined,
    created_at: r.created_at,
  };
}

export default async function ArchivePage() {
  const user = await getSessionUser();
  const db = getDb();

  let editions: EditionSummary[] = [];
  let savedArticles: Article[] = [];
  let userTimezone = DEFAULT_TIMEZONE;

  if (user) {
    const profile = db
      .prepare("SELECT timezone FROM profiles WHERE id = ?")
      .get(user.id) as { timezone: string } | undefined;
    userTimezone = profile?.timezone ?? DEFAULT_TIMEZONE;

    // Fetch user editions
    const editionRows = db
      .prepare(
        `SELECT id, user_id, edition_date, headline_of_the_day, items, pdf_path, generated_at
         FROM editions
         WHERE user_id = ?
         ORDER BY edition_date DESC`
      )
      .all(user.id) as EditionRow[];

    // Extract lead article IDs to fetch lead thumbnails
    const leadArticleIds: string[] = [];
    const parsedItemsMap = new Map<string, EditionItem[]>();

    for (const row of editionRows) {
      const items = parseJson<EditionItem[]>(row.items, []);
      parsedItemsMap.set(row.id, items);
      if (items.length > 0) {
        leadArticleIds.push(items[0].article_id);
      }
    }

    const leadArticleMap = new Map<string, { image_url: string | null; title: string; source_name: string }>();
    if (leadArticleIds.length > 0) {
      const placeholders = leadArticleIds.map(() => "?").join(",");
      const articles = db
        .prepare(`SELECT id, image_url, title, source_name FROM articles WHERE id IN (${placeholders})`)
        .all(...leadArticleIds) as { id: string; image_url: string | null; title: string; source_name: string }[];
      for (const a of articles) {
        leadArticleMap.set(a.id, a);
      }
    }

    editions = editionRows.map((row) => {
      const items = parsedItemsMap.get(row.id) ?? [];
      const leadId = items[0]?.article_id;
      const leadArt = leadId ? leadArticleMap.get(leadId) : undefined;
      const topics = Array.from(new Set(items.map((i) => i.section).filter(Boolean)));

      return {
        id: row.id,
        edition_date: row.edition_date,
        formatted_date: formatEditionDate(row.edition_date, userTimezone),
        headline_of_the_day: row.headline_of_the_day,
        story_count: items.length,
        lead_image: leadArt?.image_url ?? undefined,
        lead_title: leadArt?.title,
        lead_source: leadArt?.source_name,
        topics,
      };
    });

    // Fetch saved stories
    const savedRows = db
      .prepare(
        `SELECT a.*
         FROM saved_articles s
         JOIN articles a ON a.id = s.article_id
         WHERE s.user_id = ?
         ORDER BY s.created_at DESC`
      )
      .all(user.id) as ArticleDbRow[];

    savedArticles = savedRows.map(mapRowToArticle);
  } else {
    // Demo archive fallback for signed-out visitors
    const mockLead = mockArticles[0];
    editions = [
      {
        id: mockEdition.id,
        edition_date: mockEdition.edition_date,
        formatted_date: formatEditionDate(mockEdition.edition_date, DEFAULT_TIMEZONE),
        headline_of_the_day: mockEdition.headline_of_the_day,
        story_count: mockEdition.items.length,
        lead_image: mockLead.image_url,
        lead_title: mockLead.title,
        lead_source: mockLead.source_name,
        topics: ["Energy", "Business", "Technology", "World"],
      },
    ];

    savedArticles = mockArticles.slice(0, 3);
  }

  return (
    <>
      <SiteNav />
      <main>
        <ArchiveView
          editions={editions}
          initialSavedArticles={savedArticles}
        />
      </main>
    </>
  );
}
