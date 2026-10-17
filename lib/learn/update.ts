import type { Database } from "better-sqlite3";
import type { EventType, Topic } from "@/lib/types";

export interface SignalEvent {
  userId: string;
  articleId: string;
  type: EventType;
  value?: number;
}

export interface LearnUpdateOutcome {
  updatedTopics: string[];
  updatedEntities: string[];
  discoveredInterests: string[];
  hiddenTopics: string[];
}

/**
 * Calculates topic delta based on user interaction event.
 * Follows M9 specification in PROJECT.md:
 * - click_through: +0.08
 * - read_time >= 30s: +0.10 (scaled up to +0.18 for deep reads)
 * - save: +0.15
 * - more_like_this: +0.25
 * - skip: -0.04
 * - less_like_this: -0.25
 */
export function calculateTopicDelta(type: EventType, value?: number): number {
  switch (type) {
    case "click_through":
      return 0.08;
    case "read_time": {
      const seconds = value ?? 0;
      if (seconds < 15) return 0; // brief glance, neutral
      if (seconds < 30) return 0.04; // partial read
      // Scaled up for deep engagement, capped at 0.18
      const scaled = 0.10 * Math.min(1.8, Math.max(1.0, seconds / 60));
      return Number(scaled.toFixed(3));
    }
    case "save":
      return 0.15;
    case "more_like_this":
      return 0.25;
    case "skip":
      return -0.04;
    case "less_like_this":
      return -0.25;
    case "open":
      return 0.02;
    default:
      return 0;
  }
}

/**
 * Updates user's interest weights immediately based on an interaction event.
 * Supports topic weight nudges, entity discovery (after 3 encounters), and hard filters.
 */
export function recordLearningFromEvent(
  db: Database,
  event: SignalEvent
): LearnUpdateOutcome {
  const outcome: LearnUpdateOutcome = {
    updatedTopics: [],
    updatedEntities: [],
    discoveredInterests: [],
    hiddenTopics: [],
  };

  const article = db
    .prepare("SELECT title, summary, topics, entities FROM articles WHERE id = ?")
    .get(event.articleId) as
    | { title: string; summary: string; topics: string; entities: string }
    | undefined;

  if (!article) {
    return outcome;
  }

  let topics: string[] = [];
  try {
    topics = JSON.parse(article.topics || "[]");
  } catch {
    topics = [];
  }

  let entities: { name: string; type: string }[] = [];
  try {
    entities = JSON.parse(article.entities || "[]");
  } catch {
    entities = [];
  }

  const now = new Date().toISOString();

  // 1. Handle hard "hide_topic"
  if (event.type === "hide_topic") {
    const hideStmt = db.prepare(`
      INSERT INTO interest_weights (user_id, key, kind, weight, source, updated_at)
      VALUES (?, ?, 'topic', 0.0, 'learned', ?)
      ON CONFLICT(user_id, key) DO UPDATE SET
        weight = 0.0,
        updated_at = excluded.updated_at
    `);

    for (const topic of topics) {
      hideStmt.run(event.userId, topic, now);
      outcome.hiddenTopics.push(topic);
    }
    return outcome;
  }

  // 2. Handle standard topic weight delta
  const delta = calculateTopicDelta(event.type, event.value);

  if (delta !== 0) {
    const getWeightStmt = db.prepare(
      "SELECT weight, source FROM interest_weights WHERE user_id = ? AND key = ?"
    );
    const upsertWeightStmt = db.prepare(`
      INSERT INTO interest_weights (user_id, key, kind, weight, source, updated_at)
      VALUES (?, ?, 'topic', ?, ?, ?)
      ON CONFLICT(user_id, key) DO UPDATE SET
        weight = excluded.weight,
        updated_at = excluded.updated_at
    `);

    for (const topic of topics) {
      const existing = getWeightStmt.get(event.userId, topic) as
        | { weight: number; source: string }
        | undefined;

      let currentWeight: number;
      let source: "onboarding" | "learned";

      if (existing) {
        currentWeight = existing.weight;
        source = existing.source === "onboarding" ? "onboarding" : "learned";
      } else {
        // If not in profile yet: positive events establish an initial interest,
        // negative events are ignored for unmentioned topics
        if (delta <= 0) continue;
        currentWeight = 0.30;
        source = "learned";
        outcome.discoveredInterests.push(topic);
      }

      // Clamp between 0.00 and 1.00
      const nextWeight = Number(
        Math.max(0.0, Math.min(1.0, currentWeight + delta)).toFixed(3)
      );

      upsertWeightStmt.run(event.userId, topic, nextWeight, source, now);
      outcome.updatedTopics.push(topic);
    }
  }

  // 3. Entity learning & discovery for positive interactions
  const isPositiveSignal =
    event.type === "click_through" ||
    event.type === "save" ||
    event.type === "more_like_this" ||
    (event.type === "read_time" && (event.value ?? 0) >= 30);

  if (isPositiveSignal && entities.length > 0) {
    const entityCheckStmt = db.prepare(
      "SELECT weight, source FROM interest_weights WHERE user_id = ? AND key = ?"
    );
    const upsertEntityStmt = db.prepare(`
      INSERT INTO interest_weights (user_id, key, kind, weight, source, updated_at)
      VALUES (?, ?, 'entity', ?, 'learned', ?)
      ON CONFLICT(user_id, key) DO UPDATE SET
        weight = excluded.weight,
        updated_at = excluded.updated_at
    `);

    // Pick up to 3 most relevant entities from the article
    const targetEntities = entities
      .filter((e) => e.name && e.name.trim().length >= 3 && !e.name.match(/^\d+$/))
      .slice(0, 3);

    for (const ent of targetEntities) {
      const cleanName = ent.name.trim();
      const existing = entityCheckStmt.get(event.userId, cleanName) as
        | { weight: number; source: string }
        | undefined;

      if (existing) {
        const nextWeight = Number(
          Math.min(1.0, existing.weight + delta * 0.75).toFixed(3)
        );
        upsertEntityStmt.run(event.userId, cleanName, nextWeight, now);
        outcome.updatedEntities.push(cleanName);
      } else {
        // Discovery rule: if this entity appeared in 2+ previous engaged events for this user,
        // promote it to a new learned entity!
        const encounterCount = db
          .prepare(
            `SELECT COUNT(DISTINCT e.article_id) as count
             FROM interaction_events e
             JOIN articles a ON e.article_id = a.id
             WHERE e.user_id = ?
               AND e.type IN ('click_through', 'save', 'more_like_this', 'read_time')
               AND a.entities LIKE ?`
          )
          .get(event.userId, `%${cleanName}%`) as { count: number } | undefined;

        if (encounterCount && encounterCount.count >= 2) {
          const initialEntityWeight = 0.40;
          upsertEntityStmt.run(event.userId, cleanName, initialEntityWeight, now);
          outcome.discoveredInterests.push(cleanName);
          outcome.updatedEntities.push(cleanName);
        }
      }
    }
  }

  return outcome;
}
