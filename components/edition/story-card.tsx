"use client";

import Link from "next/link";
import { ExternalLink, Bookmark, EyeOff, ThumbsUp, ThumbsDown, Clock } from "lucide-react";
import type { Article, EditionItem } from "@/lib/types";
import { ImpactCallout } from "./impact-callout";

interface StoryCardProps {
  item: EditionItem;
  article: Article;
  editionId: string;
  isSaved?: boolean;
  onToggleSave?: (articleId: string) => void;
  onSkip?: (articleId: string) => void;
  onFeedback?: (articleId: string, type: "more_like_this" | "less_like_this") => void;
  className?: string;
}

function estimateReadTime(text?: string, summary?: string): number {
  const words = (text || summary || "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours === 1) return "1h ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function StoryCard({
  item,
  article,
  editionId,
  isSaved = false,
  onToggleSave,
  onSkip,
  onFeedback,
  className = "",
}: StoryCardProps) {
  const readTime = estimateReadTime(article.raw_text, article.summary);
  const primaryTopic = article.topics[0] ?? "News";

  function handleReadOriginal() {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        article_id: article.id,
        edition_id: editionId,
        type: "click_through",
      }),
    }).catch(() => null);
  }

  return (
    <article
      data-article-id={article.id}
      className={`group flex flex-col justify-between border-b border-rule pb-6 pt-4 transition-colors md:border-b-0 ${className}`}
    >
      <div>
        {/* Category & Topic */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-burgundy">
            {primaryTopic}
          </span>
          <span className="flex items-center gap-1 font-sans text-[11px] text-ink-muted">
            <Clock className="size-3" aria-hidden="true" />
            {readTime}m read
          </span>
        </div>

        {/* Headline */}
        <h3 className="mt-2.5 font-serif text-xl font-medium leading-snug tracking-[-0.01em] text-ink transition-colors duration-300 hover:text-burgundy md:text-[1.35rem]">
          <Link href={`/story/${article.id}`} className="focus-visible:outline-burgundy">
            {article.title}
          </Link>
        </h3>

        {/* Summary */}
        <p className="mt-3 font-serif text-sm leading-relaxed text-ink/80 md:text-[15px]">
          {article.summary}
        </p>

        {/* Impact Note if present */}
        {item.impact_note && (
          <ImpactCallout
            note={item.impact_note}
            articleId={article.id}
            editionId={editionId}
          />
        )}

        {/* Why Shown */}
        {item.why_shown && (
          <p className="mt-3 font-sans text-[11px] italic text-ink-muted/90">
            {item.why_shown}
          </p>
        )}
      </div>

      {/* Footer & Story Actions */}
      <div className="mt-5 border-t border-rule/50 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Source and Time */}
          <div className="flex items-center gap-2 font-sans text-xs text-ink-muted">
            <span className="font-medium text-ink">{article.source_name}</span>
            <span aria-hidden="true" className="h-2.5 w-px bg-rule" />
            <span>{timeAgo(article.published_at)}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleReadOriginal}
              className="inline-flex items-center gap-1 rounded p-1.5 font-sans text-xs text-ink-muted transition-colors hover:bg-rule/40 hover:text-ink focus-visible:outline-burgundy"
              title="Read original source"
              aria-label={`Read original article on ${article.source_name}`}
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Original</span>
            </a>

            <button
              type="button"
              onClick={() => onToggleSave?.(article.id)}
              className={`rounded p-1.5 transition-colors hover:bg-rule/40 focus-visible:outline-burgundy ${
                isSaved ? "text-burgundy" : "text-ink-muted hover:text-ink"
              }`}
              title={isSaved ? "Remove from saved" : "Save for later"}
              aria-label={isSaved ? "Remove from saved" : "Save for later"}
            >
              <Bookmark className={`size-3.5 ${isSaved ? "fill-burgundy" : ""}`} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => onFeedback?.(article.id, "more_like_this")}
              className="rounded p-1.5 text-ink-muted transition-colors hover:bg-rule/40 hover:text-ink focus-visible:outline-burgundy"
              title="More stories like this"
              aria-label="More stories like this"
            >
              <ThumbsUp className="size-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => onFeedback?.(article.id, "less_like_this")}
              className="rounded p-1.5 text-ink-muted transition-colors hover:bg-rule/40 hover:text-ink focus-visible:outline-burgundy"
              title="Fewer stories like this"
              aria-label="Fewer stories like this"
            >
              <ThumbsDown className="size-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => onSkip?.(article.id)}
              className="rounded p-1.5 text-ink-muted transition-colors hover:bg-rule/40 hover:text-burgundy focus-visible:outline-burgundy"
              title="Skip this story"
              aria-label="Skip this story"
            >
              <EyeOff className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
