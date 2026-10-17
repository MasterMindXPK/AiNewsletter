"use client";

import Link from "next/link";
import { ExternalLink, Bookmark } from "lucide-react";
import type { Article, EditionItem } from "@/lib/types";

interface InBriefStripProps {
  items: { item: EditionItem; article: Article }[];
  editionId: string;
  savedArticleIds?: Set<string>;
  onToggleSave?: (articleId: string) => void;
  className?: string;
}

export function InBriefStrip({
  items,
  editionId,
  savedArticleIds,
  onToggleSave,
  className = "",
}: InBriefStripProps) {
  if (items.length === 0) return null;

  function handleReadOriginal(articleId: string) {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        article_id: articleId,
        edition_id: editionId,
        type: "click_through",
      }),
    }).catch(() => null);
  }

  return (
    <section className={`border border-ink bg-paper p-6 ${className}`}>
      <div className="flex items-center justify-between border-b border-rule pb-3">
        <h3 className="font-serif text-lg font-semibold uppercase tracking-[0.15em] text-ink">
          In Brief
        </h3>
        <span className="font-sans text-[11px] uppercase tracking-wider text-ink-muted">
          Fast updates across domains
        </span>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ item, article }) => {
          const isSaved = savedArticleIds?.has(article.id) ?? false;
          const topic = article.topics[0] ?? "Update";

          return (
            <div
              key={article.id}
              data-article-id={article.id}
              className="flex flex-col justify-between border-b border-rule/50 pb-4 last:border-b-0 sm:border-b-0 sm:border-r sm:border-rule/50 sm:pr-4 sm:last:border-r-0"
            >
              <div>
                <span className="font-sans text-[10px] font-semibold uppercase tracking-wider text-burgundy">
                  {topic}
                </span>

                <h4 className="mt-1 font-serif text-[15px] font-medium leading-snug text-ink transition-colors hover:text-burgundy">
                  <Link href={`/story/${article.id}`}>
                    {article.title}
                  </Link>
                </h4>

                <p className="mt-1.5 font-serif text-xs leading-relaxed text-ink/70 line-clamp-3">
                  {article.summary}
                </p>

                {item.why_shown && (
                  <p className="mt-2 font-sans text-[10px] italic text-ink-muted">
                    {item.why_shown}
                  </p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-rule/30 pt-2 font-sans text-[11px] text-ink-muted">
                <span className="truncate text-ink font-medium">{article.source_name}</span>
                <div className="flex items-center gap-2">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleReadOriginal(article.id)}
                    className="p-1 transition-colors hover:text-ink"
                    title="Read original source"
                  >
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onToggleSave?.(article.id)}
                    className={`p-1 transition-colors ${
                      isSaved ? "text-burgundy" : "hover:text-ink"
                    }`}
                    title={isSaved ? "Saved" : "Save"}
                  >
                    <Bookmark className={`size-3 ${isSaved ? "fill-burgundy" : ""}`} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
