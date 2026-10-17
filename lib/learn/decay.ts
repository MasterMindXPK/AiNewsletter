import type { Database } from "better-sqlite3";
import { getDb } from "@/lib/db";

export interface DecayResult {
  usersProcessed: number;
  decayedWeights: number;
  prunedWeights: number;
  penalizedIgnoredTopics: number;
}

/**
 * Daily decay process (called by npm run daily or scheduler).
 * - Multiplies learned weights by 0.98
 * - Multiplies onboarding weights by 0.995 (very slow baseline decay)
 * - Checks past 3 editions for untouched articles (ignored 3+ times) and applies -0.03 penalty
 * - Prunes learned weights below 0.05
 */
export function applyDailyDecay(db?: Database, targetUserId?: string): DecayResult {
  const database = db ?? getDb();

  const userIds: string[] = targetUserId
    ? [targetUserId]
    : (
        database
          .prepare("SELECT id FROM users")
          .all() as { id: string }[]
      ).map((u) => u.id);

  let totalDecayed = 0;
  let totalPruned = 0;
  let totalPenalized = 0;

  const now = new Date().toISOString();

  database.transaction(() => {
    for (const userId of userIds) {
      // 1. Fetch current weights
      const rows = database
        .prepare(
          "SELECT user_id, key, kind, weight, source FROM interest_weights WHERE user_id = ?"
        )
        .all(userId) as {
        user_id: string;
        key: string;
        kind: string;
        weight: number;
        source: string;
      }[];

      const updateStmt = database.prepare(
        "UPDATE interest_weights SET weight = ?, updated_at = ? WHERE user_id = ? AND key = ?"
      );
      const deleteStmt = database.prepare(
        "DELETE FROM interest_weights WHERE user_id = ? AND key = ?"
      );

      for (const row of rows) {
        // Multiplier: 0.98 for learned, 0.995 for onboarding
        const factor = row.source === "onboarding" ? 0.995 : 0.98;
        const newWeight = Number((row.weight * factor).toFixed(3));

        if (row.source === "learned" && newWeight < 0.05) {
          deleteStmt.run(userId, row.key);
          totalPruned++;
        } else {
          updateStmt.run(newWeight, now, userId, row.key);
          totalDecayed++;
        }
      }

      // 2. Identify articles repeatedly ignored across the last 3 editions
      const recentEditions = database
        .prepare(
          `SELECT id, items FROM editions
           WHERE user_id = ?
           ORDER BY edition_date DESC
           LIMIT 3`
        )
        .all(userId) as { id: string; items: string }[];

      if (recentEditions.length >= 2) {
        // Collect article IDs shown in these editions
        const shownArticleIds = new Set<string>();
        for (const ed of recentEditions) {
          try {
            const items = JSON.parse(ed.items || "[]") as { article_id: string }[];
            for (const item of items) {
              if (item.article_id) shownArticleIds.add(item.article_id);
            }
          } catch {
            // Ignore parse errors
          }
        }

        // Check which shown articles received zero positive interactions
        const engagedArticleIds = new Set(
          (
            database
              .prepare(
                `SELECT DISTINCT article_id FROM interaction_events
                 WHERE user_id = ? AND type IN ('click_through', 'read_time', 'save', 'more_like_this')`
              )
              .all(userId) as { article_id: string }[]
          ).map((e) => e.article_id)
        );

        const ignoredArticleIds = Array.from(shownArticleIds).filter(
          (id) => !engagedArticleIds.has(id)
        );

        // For repeatedly ignored articles, penalize their primary topics by -0.03
        if (ignoredArticleIds.length > 0) {
          const sample = ignoredArticleIds.slice(0, 10);
          const placeholders = sample.map(() => "?").join(",");
          const articles = database
            .prepare(`SELECT topics FROM articles WHERE id IN (${placeholders})`)
            .all(...sample) as { topics: string }[];

          const topicIgnoreCounts = new Map<string, number>();
          for (const a of articles) {
            try {
              const tops = JSON.parse(a.topics || "[]") as string[];
              for (const t of tops) {
                topicIgnoreCounts.set(t, (topicIgnoreCounts.get(t) ?? 0) + 1);
              }
            } catch {
              // Ignore
            }
          }

          const penalizeStmt = database.prepare(`
            UPDATE interest_weights
            SET weight = MAX(0.0, ROUND(weight - 0.03, 3)), updated_at = ?
            WHERE user_id = ? AND key = ?
          `);

          for (const [topic, count] of topicIgnoreCounts.entries()) {
            if (count >= 3) {
              penalizeStmt.run(now, userId, topic);
              totalPenalized++;
            }
          }
        }
      }
    }
  })();

  return {
    usersProcessed: userIds.length,
    decayedWeights: totalDecayed,
    prunedWeights: totalPruned,
    penalizedIgnoredTopics: totalPenalized,
  };
}
