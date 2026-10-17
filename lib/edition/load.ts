import { getDb } from "@/lib/db";
import type { Article, Edition, EditionItem, StoryConnection, Topic } from "@/lib/types";
import { mockEdition } from "@/lib/mock/edition";
import { mockArticles } from "@/lib/mock/articles";

export interface HydratedEditionItem {
  item: EditionItem;
  article: Article;
}

export interface HydratedEdition {
  edition: Edition;
  items: HydratedEditionItem[];
  savedArticleIds: Set<string>;
  isMock?: boolean;
}

function parseJson<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

interface ArticleRow {
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

function mapRowToArticle(r: ArticleRow): Article {
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

export function loadMockEdition(): HydratedEdition {
  const articleMap = new Map(mockArticles.map((a) => [a.id, a]));
  const items: HydratedEditionItem[] = [];

  for (const it of mockEdition.items) {
    const article = articleMap.get(it.article_id);
    if (article) {
      items.push({ item: it, article });
    }
  }

  return {
    edition: mockEdition,
    items,
    savedArticleIds: new Set<string>(),
    isMock: true,
  };
}

interface EditionRow {
  id: string;
  user_id: string;
  edition_date: string;
  headline_of_the_day: string;
  items: string;
  connections: string;
  pdf_path: string | null;
  generated_at: string;
}

export function loadEditionForUser(
  userId: string,
  editionDate?: string
): HydratedEdition | null {
  const db = getDb();

  let editionRow: EditionRow | undefined;
  if (editionDate) {
    editionRow = db
      .prepare(
        `SELECT id, user_id, edition_date, headline_of_the_day, items, connections, pdf_path, generated_at
         FROM editions
         WHERE user_id = ? AND edition_date = ?`
      )
      .get(userId, editionDate) as EditionRow | undefined;
  } else {
    editionRow = db
      .prepare(
        `SELECT id, user_id, edition_date, headline_of_the_day, items, connections, pdf_path, generated_at
         FROM editions
         WHERE user_id = ?
         ORDER BY edition_date DESC
         LIMIT 1`
      )
      .get(userId) as EditionRow | undefined;
  }

  if (!editionRow) {
    return null;
  }

  const rawItems = parseJson<EditionItem[]>(editionRow.items, []);
  const connections = parseJson<StoryConnection[]>(editionRow.connections, []);
  const articleIds = rawItems.map((i) => i.article_id);

  const articleMap = new Map<string, Article>();
  if (articleIds.length > 0) {
    const placeholders = articleIds.map(() => "?").join(",");
    const rows = db
      .prepare(`SELECT * FROM articles WHERE id IN (${placeholders})`)
      .all(...articleIds) as ArticleRow[];

    for (const r of rows) {
      articleMap.set(r.id, mapRowToArticle(r));
    }
  }

  const savedRows = db
    .prepare("SELECT article_id FROM saved_articles WHERE user_id = ?")
    .all(userId) as { article_id: string }[];
  const savedArticleIds = new Set(savedRows.map((r) => r.article_id));

  const items: HydratedEditionItem[] = [];
  for (const it of rawItems) {
    const article = articleMap.get(it.article_id);
    if (article) {
      items.push({ item: it, article });
    }
  }

  const edition: Edition = {
    id: editionRow.id,
    user_id: editionRow.user_id,
    edition_date: editionRow.edition_date,
    headline_of_the_day: editionRow.headline_of_the_day,
    items: rawItems,
    connections,
    pdf_url: editionRow.pdf_path ?? undefined,
    generated_at: editionRow.generated_at,
  };

  return {
    edition,
    items,
    savedArticleIds,
    isMock: false,
  };
}

export function loadArticleById(articleId: string): Article | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM articles WHERE id = ?").get(articleId) as ArticleRow | undefined;
  if (row) return mapRowToArticle(row);

  const mock = mockArticles.find((a) => a.id === articleId);
  return mock ?? null;
}
