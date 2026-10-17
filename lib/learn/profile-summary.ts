import type { Database } from "better-sqlite3";
import { getDb } from "@/lib/db";
import type { Topic, UserProfile } from "@/lib/types";

export interface TopicWeightSummary {
  key: string;
  label: string;
  weight: number;
  percentage: number;
  source: "onboarding" | "learned";
  trend: "rising" | "stable" | "fading";
  updated_at: string;
}

export interface EntityWeightSummary {
  key: string;
  kind: "entity" | "keyword";
  weight: number;
  percentage: number;
  source: "onboarding" | "learned";
  updated_at: string;
}

export interface InterestProfileSummary {
  profile: {
    name: string;
    city: string;
    country: string;
    profession: string;
    reading_depth: string;
  } | null;
  topics: TopicWeightSummary[];
  entities: EntityWeightSummary[];
  newlyNoticed: string[];
  fading: string[];
  stats: {
    totalInteractions: number;
    articlesRead: number;
    storiesSaved: number;
    topTopic: string;
    learningSignalsCount: number;
  };
  editorialObservation: string;
}

const TOPIC_LABELS: Record<string, string> = {
  world: "World & Diplomacy",
  politics: "Politics & Policy",
  business: "Business & Commerce",
  economy: "Economy & Finance",
  energy: "Energy & Infrastructure",
  technology: "Technology & AI",
  science: "Science & Discovery",
  health: "Medicine & Health",
  sports: "Sports & Athletics",
  entertainment: "Entertainment & Arts",
  culture: "Culture & Society",
  education: "Education & Learning",
  environment: "Climate & Environment",
  crime: "Law & Justice",
  lifestyle: "Lifestyle & Design",
  travel: "Travel & Geography",
  opinion: "Opinion & Analysis",
};

export function formatTopicLabel(topic: string): string {
  if (TOPIC_LABELS[topic]) return TOPIC_LABELS[topic];
  return topic.charAt(0).toUpperCase() + topic.slice(1);
}

/**
 * Compiles a transparent, editorial overview of what the paper has learned about the reader.
 */
export function getInterestProfileSummary(
  userId: string,
  db?: Database
): InterestProfileSummary {
  const database = db ?? getDb();

  // 1. Fetch user profile
  const profileRow = database
    .prepare(
      "SELECT name, city, country, profession, reading_depth FROM profiles WHERE id = ?"
    )
    .get(userId) as
    | {
        name: string;
        city: string;
        country: string;
        profession: string;
        reading_depth: string;
      }
    | undefined;

  // 2. Fetch all interest weights
  const weightRows = database
    .prepare(
      `SELECT key, kind, weight, source, updated_at
       FROM interest_weights
       WHERE user_id = ?
       ORDER BY weight DESC`
    )
    .all(userId) as {
    key: string;
    kind: string;
    weight: number;
    source: string;
    updated_at: string;
  }[];

  // 3. Fetch interaction stats from last 14 days
  const eventRows = database
    .prepare(
      `SELECT type, article_id, created_at
       FROM interaction_events
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 200`
    )
    .all(userId) as { type: string; article_id: string; created_at: string }[];

  const savedCount = (
    database
      .prepare("SELECT COUNT(*) as count FROM saved_articles WHERE user_id = ?")
      .get(userId) as { count: number }
  )?.count ?? 0;

  let readCount = 0;
  for (const ev of eventRows) {
    if (ev.type === "click_through" || ev.type === "read_time") {
      readCount++;
    }
  }

  // 4. Classify topics vs entities
  const topics: TopicWeightSummary[] = [];
  const entities: EntityWeightSummary[] = [];
  const newlyNoticed: string[] = [];
  const fading: string[] = [];

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  for (const row of weightRows) {
    const percentage = Math.round(row.weight * 100);
    const isLearned = row.source === "learned";
    const isRecentlyUpdated = row.updated_at >= sevenDaysAgo;

    let trend: "rising" | "stable" | "fading" = "stable";
    if (row.weight >= 0.70 || (isLearned && isRecentlyUpdated)) {
      trend = "rising";
    } else if (row.weight <= 0.20) {
      trend = "fading";
    }

    if (row.kind === "topic") {
      topics.push({
        key: row.key,
        label: formatTopicLabel(row.key),
        weight: row.weight,
        percentage,
        source: row.source as "onboarding" | "learned",
        trend,
        updated_at: row.updated_at,
      });

      if (trend === "rising" && isLearned) {
        newlyNoticed.push(formatTopicLabel(row.key));
      } else if (trend === "fading") {
        fading.push(formatTopicLabel(row.key));
      }
    } else {
      entities.push({
        key: row.key,
        kind: row.kind as "entity" | "keyword",
        weight: row.weight,
        percentage,
        source: row.source as "onboarding" | "learned",
        updated_at: row.updated_at,
      });

      if (row.weight >= 0.35) {
        newlyNoticed.push(row.key);
      }
    }
  }

  // 5. Generate human-like editorial observation
  const topTopics = topics.slice(0, 3).map((t) => t.label);
  const topTopicName = topTopics[0] ?? "Current Affairs";

  let editorialObservation = "";
  if (topics.length === 0) {
    editorialObservation =
      "Your reading profile is fresh. As you read, save, or skip stories in your daily editions, our editorial algorithms will curate stories tailored to your interests.";
  } else if (eventRows.length < 5) {
    editorialObservation = `Your edition is currently anchored on ${topTopics.join(", ")}, based on your onboarding selections. As you spend time with stories, this page will reflect your evolving reading habits.`;
  } else {
    const risingTopic = topics.find((t) => t.trend === "rising");
    const fadingTopic = topics.find((t) => t.trend === "fading");

    if (risingTopic && fadingTopic) {
      editorialObservation = `The editor's desk has noted your sustained focus on ${risingTopic.label}, with lighter engagement on ${fadingTopic.label}. Tomorrow's front page will reflect this shift with deeper coverage in your priority beats.`;
    } else if (risingTopic) {
      editorialObservation = `Your recent reading demonstrates strong momentum in ${risingTopic.label}. We are tuning the morning wire to bring you more authoritative coverage and analysis in this area.`;
    } else {
      editorialObservation = `Your reading shows a well-balanced appetite led by ${topTopics.slice(0, 2).join(" and ")}. Our algorithm continues to allocate ~10% of each edition to exploratory beats to broaden your horizon.`;
    }
  }

  return {
    profile: profileRow ?? null,
    topics,
    entities,
    newlyNoticed: Array.from(new Set(newlyNoticed)).slice(0, 6),
    fading: Array.from(new Set(fading)).slice(0, 4),
    stats: {
      totalInteractions: eventRows.length,
      articlesRead: readCount,
      storiesSaved: savedCount,
      topTopic: topTopicName,
      learningSignalsCount: weightRows.length,
    },
    editorialObservation,
  };
}
