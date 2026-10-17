"use client";

import Link from "next/link";
import { ExternalLink, BookmarkX, Clock } from "lucide-react";
import type { Article } from "@/lib/types";

interface SavedStoryCardProps {
  article: Article;
  onRemove: (articleId: string) => void;
}

export function SavedStoryCard({ article, onRemove }: SavedStoryCardProps) {
  const primaryTopic = article.topics[0] ?? "Saved";

  return (
    <article className="flex flex-col justify-between border border-rule bg-paper p-5 transition-all duration-300 hover:border-ink hover:shadow-[3px_3px_0_0_#17140f] md:p-6">
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-rule pb-2.5">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-burgundy">
            {primaryTopic}
          </span>
          <span className="flex items-center gap-1 font-sans text-xs text-ink-muted">
            <Clock className="size-3" />
            {new Date(article.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>

        <h3 className="mt-3 font-serif text-lg font-medium leading-snug tracking-[-0.01em] text-ink transition-colors hover:text-burgundy">
          <Link href={`/story/${article.id}`}>
            {article.title}
          </Link>
        </h3>

        <p className="mt-2.5 font-serif text-sm leading-relaxed text-ink/80 line-clamp-3">
          {article.summary}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-rule/60 pt-3 font-sans text-xs">
        <span className="font-medium text-ink">{article.source_name}</span>

        <div className="flex items-center gap-3">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-ink-muted transition-colors hover:text-ink"
            title="Read original source"
          >
            <ExternalLink className="size-3.5" />
            <span>Original</span>
          </a>

          <button
            type="button"
            onClick={() => onRemove(article.id)}
            className="inline-flex items-center gap-1 text-ink-muted transition-colors hover:text-burgundy"
            title="Remove from saved stories"
          >
            <BookmarkX className="size-3.5" />
            <span>Remove</span>
          </button>
        </div>
      </div>
    </article>
  );
}
