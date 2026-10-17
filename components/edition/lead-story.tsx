"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ExternalLink, Bookmark, EyeOff, ThumbsUp, ThumbsDown, Clock } from "lucide-react";
import type { Article, EditionItem } from "@/lib/types";
import { ImpactCallout } from "./impact-callout";

interface LeadStoryProps {
  item: EditionItem;
  article: Article;
  editionId: string;
  isSaved?: boolean;
  onToggleSave?: (articleId: string) => void;
  onSkip?: (articleId: string) => void;
  onFeedback?: (articleId: string, type: "more_like_this" | "less_like_this") => void;
  className?: string;
}

export function LeadStory({
  item,
  article,
  editionId,
  isSaved = false,
  onToggleSave,
  onSkip,
  onFeedback,
  className = "",
}: LeadStoryProps) {
  const primaryTopic = article.topics[0] ?? "Front Page";

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
      className={`mx-auto max-w-6xl py-8 md:py-12 ${className}`}
    >
      <div className="grid gap-8 md:grid-cols-12 md:items-stretch md:gap-0">
        {/* Left Column: Lead Story Content */}
        <div className="flex flex-col md:col-span-6 md:border-r md:border-rule md:pr-10 lg:pr-14">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-burgundy motion-safe:animate-fade-up">
              {primaryTopic}
            </span>
            <span className="flex items-center gap-1 font-sans text-xs text-ink-muted">
              <Clock className="size-3" aria-hidden="true" />
              Lead Story
            </span>
          </div>

          <h2 className="mt-4 text-balance font-serif text-[2.1rem] font-medium leading-[1.1] tracking-[-0.02em] text-ink transition-colors duration-500 hover:text-burgundy sm:text-4xl lg:text-[2.75rem]">
            <Link href={`/story/${article.id}`} className="focus-visible:outline-burgundy">
              {article.title}
            </Link>
          </h2>

          <p className="mt-5 max-w-xl text-pretty font-serif text-base leading-relaxed text-ink/80 md:text-lg">
            {article.summary}
          </p>

          {item.impact_note && (
            <ImpactCallout
              note={item.impact_note}
              articleId={article.id}
              editionId={editionId}
            />
          )}

          {item.why_shown && (
            <p className="mt-3 font-sans text-xs italic text-ink-muted">
              {item.why_shown}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[13px] text-ink-muted">
            <span className="font-medium text-ink">{article.source_name}</span>
            <span aria-hidden="true" className="h-3 w-px bg-rule" />
            <span>{new Date(article.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>

          {/* Action links */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-4 md:mt-auto">
            <div className="flex items-center gap-4">
              <Link
                href={`/story/${article.id}`}
                className="group relative inline-flex items-center gap-2 pb-1 font-sans text-xs font-medium uppercase tracking-wider text-ink transition-colors duration-300 hover:text-burgundy focus-visible:outline-burgundy"
              >
                Read story
                <ArrowRight
                  className="size-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-ink" />
              </Link>

              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleReadOriginal}
                className="inline-flex items-center gap-1.5 font-sans text-xs text-ink-muted transition-colors hover:text-ink focus-visible:outline-burgundy"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                Original Source
              </a>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleSave?.(article.id)}
                className={`rounded p-1.5 transition-colors hover:bg-rule/40 focus-visible:outline-burgundy ${
                  isSaved ? "text-burgundy" : "text-ink-muted hover:text-ink"
                }`}
                title={isSaved ? "Saved" : "Save for later"}
                aria-label={isSaved ? "Saved" : "Save for later"}
              >
                <Bookmark className={`size-4 ${isSaved ? "fill-burgundy" : ""}`} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onFeedback?.(article.id, "more_like_this")}
                className="rounded p-1.5 text-ink-muted transition-colors hover:bg-rule/40 hover:text-ink focus-visible:outline-burgundy"
                title="More like this"
                aria-label="More like this"
              >
                <ThumbsUp className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onFeedback?.(article.id, "less_like_this")}
                className="rounded p-1.5 text-ink-muted transition-colors hover:bg-rule/40 hover:text-ink focus-visible:outline-burgundy"
                title="Less like this"
                aria-label="Less like this"
              >
                <ThumbsDown className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onSkip?.(article.id)}
                className="rounded p-1.5 text-ink-muted transition-colors hover:bg-rule/40 hover:text-burgundy focus-visible:outline-burgundy"
                title="Skip this story"
                aria-label="Skip this story"
              >
                <EyeOff className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Hero Figure with Reveal */}
        <figure className="group/figure md:col-span-6 md:pl-10 lg:pl-14">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-rule motion-safe:animate-image-reveal md:h-full md:min-h-[420px]">
            {article.image_url ? (
              <Image
                src={article.image_url}
                alt={article.title}
                fill
                priority
                sizes="(min-width: 1152px) 540px, (min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-1000 ease-out group-hover/figure:scale-[1.03]"
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center border border-rule bg-paper p-8 text-center">
                <span className="font-serif text-3xl font-light italic text-ink/30">Your Orbit</span>
                <p className="mt-3 max-w-xs font-sans text-xs uppercase tracking-widest text-ink-muted">
                  {article.source_name}
                </p>
              </div>
            )}
          </div>
          <figcaption className="mt-3 font-sans text-[11px] leading-snug text-ink-muted">
            <span className="uppercase tracking-wider">Photo / Source:</span> {article.source_name}
          </figcaption>
        </figure>
      </div>
      <div className="mt-10 h-px w-full bg-rule md:mt-12" />
    </article>
  );
}
