import type { Database } from "better-sqlite3";
import type { EditionItem } from "@/lib/types";
import type { UserContext } from "@/lib/rank/score";
import { getPersonalImpactNote } from "./generate";

/**
 * Attaches tailored personal impact notes to the top 2-4 most relevant stories in an edition.
 */
export async function attachImpactNotes(
  items: EditionItem[],
  user: UserContext,
  db: Database
): Promise<EditionItem[]> {
  if (items.length === 0) return items;

  // Prioritize lead and major stories
  const candidateItems = items.filter(
    (i) => i.size === "lead" || i.size === "major" || i.section === "Your World"
  );

  const articleIds = candidateItems.map((i) => i.article_id);
  if (articleIds.length === 0) return items;

  const placeholders = articleIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT id, title, summary, topics, region_tags
       FROM articles
       WHERE id IN (${placeholders})`
    )
    .all(...articleIds) as {
    id: string;
    title: string;
    summary: string;
    topics: string;
    region_tags: string;
  }[];

  const articleMap = new Map(rows.map((r) => [r.id, r]));
  let attachedCount = 0;
  const maxNotes = 4;

  const enrichedItems: EditionItem[] = [];

  for (const item of items) {
    if (attachedCount >= maxNotes) {
      enrichedItems.push(item);
      continue;
    }

    const art = articleMap.get(item.article_id);
    if (!art) {
      enrichedItems.push(item);
      continue;
    }

    let topics: string[] = [];
    try {
      topics = JSON.parse(art.topics || "[]");
    } catch {
      topics = [];
    }

    let regionTags: string[] = [];
    try {
      regionTags = JSON.parse(art.region_tags || "[]");
    } catch {
      regionTags = [];
    }

    const note = await getPersonalImpactNote(
      item.article_id,
      {
        title: art.title,
        summary: art.summary,
        topics,
        region_tags: regionTags,
      },
      user,
      db
    );

    if (note) {
      enrichedItems.push({
        ...item,
        impact_note: note,
      });
      attachedCount++;
    } else {
      enrichedItems.push(item);
    }
  }

  return enrichedItems;
}
