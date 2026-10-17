import type { Topic, EditionItem } from "../types";
import type { ScoredArticle } from "./select";
import type { InterestWeight, UserContext } from "./score";

// ---------------------------------------------------------------------------
// Section labels
// ---------------------------------------------------------------------------

const TOPIC_SECTION_LABELS: Partial<Record<Topic, string>> = {
  energy: "Energy & Markets",
  economy: "Economy",
  business: "Business & Finance",
  technology: "Technology",
  science: "Science",
  health: "Health",
  sports: "Sports",
  environment: "Climate & Environment",
  politics: "Politics",
  world: "World News",
  entertainment: "Entertainment",
  culture: "Arts & Culture",
  education: "Education",
  crime: "Crime & Justice",
  lifestyle: "Lifestyle",
  travel: "Travel",
  opinion: "Opinion",
};

// ---------------------------------------------------------------------------
// "Why shown" text
// ---------------------------------------------------------------------------

function buildWhyShown(
  article: {
    topics: Topic[];
    region_tags: string[];
    entities: { name: string }[];
  },
  interests: InterestWeight[],
  user: UserContext,
  isExploration: boolean,
): string {
  if (isExploration) {
    const topic = article.topics[0] as Topic | undefined;
    const label = topic
      ? (TOPIC_SECTION_LABELS[topic] ?? topic).toLowerCase()
      : "a new topic";
    return `Expanding your view — exploring ${label}`;
  }

  const topicWeights = new Map(
    interests.filter((w) => w.kind === "topic").map((w) => [w.key, w.weight]),
  );

  // Best matching topic by weight
  const bestTopic = [...article.topics]
    .filter((t) => (topicWeights.get(t) ?? 0) >= 0.5)
    .sort((a, b) => (topicWeights.get(b) ?? 0) - (topicWeights.get(a) ?? 0))[0] as
    | Topic
    | undefined;

  const isLocal = article.region_tags.includes(user.country);

  if (bestTopic) {
    const label = (TOPIC_SECTION_LABELS[bestTopic] ?? bestTopic).toLowerCase();
    if (isLocal) {
      return `Because you follow ${label} and live in ${user.city || user.country}`;
    }
    return `Because you follow ${label}`;
  }

  if (isLocal) {
    return `News relevant to ${user.city || user.country}`;
  }

  // Entity interest
  const entityWeights = new Map(
    interests
      .filter((w) => w.kind === "entity" && w.weight >= 0.5)
      .map((w) => [w.key.toLowerCase(), w.weight]),
  );
  for (const e of article.entities) {
    if (entityWeights.has(e.name.toLowerCase())) {
      return `Because you follow ${e.name}`;
    }
  }

  // Keyword interest
  const haystack = `${article.topics.join(" ")}`.toLowerCase();
  for (const w of interests) {
    if (w.kind === "keyword" && w.weight >= 0.5 && haystack.includes(w.key.toLowerCase())) {
      return `Because you follow "${w.key}"`;
    }
  }

  return "Top story today";
}

// ---------------------------------------------------------------------------
// Section assignment
// ---------------------------------------------------------------------------

/**
 * Assign each selected article to a named section and produce the final
 * `EditionItem[]` for storage in the editions table.
 *
 * Section priority:
 *  1. "Front Page"         — lead and major stories
 *  2. "In Brief"           — brief-size stories
 *  3. "Beyond Your Bubble" — exploration picks
 *  4. "Your World"         — articles from the user's country
 *  5. "<Topic> section"    — personalized section for top interest topic
 *  6. "Your Interests"     — fallback for anything else
 */
export function assignSections(
  items: ScoredArticle[],
  sizes: Map<string, "lead" | "major" | "standard" | "brief">,
  interests: InterestWeight[],
  user: UserContext,
): EditionItem[] {
  // Top 3 topics by weight (for personalized section names)
  const topTopics = interests
    .filter((w) => w.kind === "topic" && w.weight >= 0.5)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((w) => w.key as Topic);

  const result: EditionItem[] = [];
  let position = 0;

  for (const sa of items) {
    const { article, isExploration } = sa;
    const size = sizes.get(article.id) ?? "standard";

    let section: string;

    if (size === "lead" || size === "major") {
      section = "Front Page";
    } else if (size === "brief") {
      section = "In Brief";
    } else if (isExploration) {
      section = "Beyond Your Bubble";
    } else if (article.region_tags.includes(user.country)) {
      section = "Your World";
    } else {
      // Assign to the highest-weight interest topic section
      const matchedTopic = article.topics.find((t) => topTopics.includes(t));
      if (matchedTopic) {
        section = TOPIC_SECTION_LABELS[matchedTopic] ?? "Your Interests";
      } else {
        section = "Your Interests";
      }
    }

    result.push({
      article_id: article.id,
      section,
      position: position++,
      size,
      score: Math.round(sa.score * 1000) / 1000,
      why_shown: buildWhyShown(article, interests, user, isExploration),
    });
  }

  return result;
}
