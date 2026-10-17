import type { Database } from "better-sqlite3";
import { getDb } from "@/lib/db";
import { hasGeminiKey } from "@/lib/llm/client";
import type { UserContext } from "@/lib/rank/score";

export interface ImpactNoteResult {
  relevant: boolean;
  note: string;
  confidence: "high" | "medium" | "low";
  because: string[];
}

export function computeProfileSignature(user: UserContext): string {
  const parts = [
    user.country || "global",
    user.city || "",
    user.profession || "",
    user.industry || "",
    ...(user.situation_tags || []).sort(),
  ];
  return parts.join("|").toLowerCase();
}

/**
 * Heuristic fallback for generating high-quality personal impact notes
 * when Gemini API key is absent or offline.
 */
export function generateHeuristicImpact(
  article: {
    title: string;
    summary: string;
    topics: string[];
    region_tags: string[];
  },
  user: UserContext
): ImpactNoteResult | null {
  const titleAndSummary = `${article.title} ${article.summary}`.toLowerCase();
  const topics = new Set(article.topics);
  const tags = new Set(user.situation_tags.map((t) => t.toLowerCase()));
  const city = user.city || "your area";
  const profession = user.profession || "professional";

  // 1. Commuter & Fuel / Transport impact
  if (
    (tags.has("commutes by car") || tags.has("car owner") || tags.has("commuter")) &&
    (topics.has("energy") || topics.has("economy") || titleAndSummary.includes("fuel") || titleAndSummary.includes("petrol") || titleAndSummary.includes("oil"))
  ) {
    return {
      relevant: true,
      note: `Because you commute regularly in ${city}, upcoming fuel price shifts and transport tariff revisions may noticeably affect your weekly transit expenditure.`,
      confidence: "high",
      because: ["commutes by car", city],
    };
  }

  // 2. Small business owner / Entrepreneur impact
  if (
    (tags.has("small business owner") || tags.has("entrepreneur") || tags.has("business owner")) &&
    (topics.has("economy") || topics.has("business") || topics.has("politics") || titleAndSummary.includes("tax") || titleAndSummary.includes("interest rate") || titleAndSummary.includes("tariff"))
  ) {
    return {
      relevant: true,
      note: `As a business owner based in ${city}, impending commercial tax policies or credit rate adjustments could influence operating margins and short-term capital borrowing.`,
      confidence: "high",
      because: ["small business owner", city],
    };
  }

  // 3. Tech professional / Engineer impact
  if (
    (profession.toLowerCase().includes("engineer") || profession.toLowerCase().includes("tech") || profession.toLowerCase().includes("developer")) &&
    (topics.has("technology") || topics.has("science") || titleAndSummary.includes("ai") || titleAndSummary.includes("cloud") || titleAndSummary.includes("software"))
  ) {
    return {
      relevant: true,
      note: `Given your technical background in ${profession}, expanding regional software infrastructure and AI adoption frameworks may directly create new enterprise integration opportunities.`,
      confidence: "medium",
      because: [profession, "technology focus"],
    };
  }

  // 4. Urban local impact (matches city or country)
  if (
    article.region_tags.includes(user.country) &&
    (titleAndSummary.includes(user.city.toLowerCase()) || topics.has("politics") || topics.has("world"))
  ) {
    return {
      relevant: true,
      note: `With policy decisions centered around ${user.country === "PK" ? "Pakistan" : user.country}, residents of ${city} should monitor civic utility schedules and local administrative updates over the coming week.`,
      confidence: "medium",
      because: [city, user.country],
    };
  }

  // 5. Environmental / climate impact
  if (topics.has("environment") && article.region_tags.includes(user.country)) {
    return {
      relevant: true,
      note: `Living in ${city}, seasonal environmental conditions and regional air quality indexes may warrant planning outdoor activities and energy consumption accordingly.`,
      confidence: "medium",
      because: [city, "environment"],
    };
  }

  return null;
}

/**
 * Generates or retrieves cached personal impact note for an article.
 */
export async function getPersonalImpactNote(
  articleId: string,
  articleData: {
    title: string;
    summary: string;
    topics: string[];
    region_tags: string[];
  },
  user: UserContext,
  db?: Database
): Promise<string | null> {
  const database = db ?? getDb();
  const signature = computeProfileSignature(user);

  // 1. Check cache in impact_cache table
  const cached = database
    .prepare(
      "SELECT note_json FROM impact_cache WHERE article_id = ? AND profile_signature = ?"
    )
    .get(articleId, signature) as { note_json: string } | undefined;

  if (cached) {
    try {
      const parsed = JSON.parse(cached.note_json) as ImpactNoteResult;
      return parsed.relevant ? parsed.note : null;
    } catch {
      // Ignore cache parse error
    }
  }

  // 2. Generate impact (heuristic baseline)
  let result: ImpactNoteResult | null = generateHeuristicImpact(articleData, user);

  // 3. Cache the result
  if (result) {
    database
      .prepare(`
        INSERT INTO impact_cache (article_id, profile_signature, note_json, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(article_id, profile_signature) DO UPDATE SET
          note_json = excluded.note_json
      `)
      .run(articleId, signature, JSON.stringify(result), new Date().toISOString());

    return result.note;
  }

  return null;
}
