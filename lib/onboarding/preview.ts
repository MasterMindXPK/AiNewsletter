import { mockArticles } from "@/lib/mock/articles";
import type { Article, Topic } from "@/lib/types";
import { TOPIC_META } from "./topics";

export interface PreviewItem {
  article: Article;
  reason: string;
}

export interface PreviewPage {
  lead: PreviewItem | null;
  majors: PreviewItem[];
  briefs: PreviewItem[];
}

function haystack(article: Article): string {
  return [
    article.title,
    article.summary,
    ...article.entities.map((entity) => entity.name),
  ]
    .join(" ")
    .toLowerCase();
}

/** Ranks the mock articles against the reader's picks to show what their front page will feel like. */
export function buildPreview(topics: Topic[], keywords: string[]): PreviewPage {
  const picked = new Set(topics);

  const ranked = mockArticles
    .map((article) => {
      const matchedTopic = article.topics.find((topic) => picked.has(topic));
      const text = haystack(article);
      const matchedKeyword = keywords.find((keyword) => text.includes(keyword.toLowerCase()));

      const score =
        (matchedTopic ? 0.8 : 0.1) * 0.6 +
        (matchedKeyword ? 0.9 : 0) * 0.4 +
        article.importance * 0.3;

      const reason = matchedKeyword
        ? `Because you follow \u201C${matchedKeyword}\u201D`
        : matchedTopic
          ? `Because you follow ${TOPIC_META[matchedTopic].label}`
          : "One of today\u2019s biggest stories";

      return { article, reason, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 7)
    .map(({ article, reason }) => ({ article, reason }));

  return {
    lead: ranked[0] ?? null,
    majors: ranked.slice(1, 3),
    briefs: ranked.slice(3),
  };
}
