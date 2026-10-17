"use client";

import { useState } from "react";
import { Sparkles, ThumbsUp, ThumbsDown, Check } from "lucide-react";

interface ImpactCalloutProps {
  note: string;
  articleId?: string;
  editionId?: string;
  className?: string;
}

export function ImpactCallout({
  note,
  articleId,
  editionId,
  className = "",
}: ImpactCalloutProps) {
  const [feedback, setFeedback] = useState<"helpful" | "not_relevant" | null>(null);

  function handleFeedback(type: "helpful" | "not_relevant") {
    setFeedback(type);
    if (articleId && editionId) {
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article_id: articleId,
          edition_id: editionId,
          type: type === "helpful" ? "more_like_this" : "less_like_this",
        }),
      }).catch(() => null);
    }
  }

  return (
    <aside
      aria-label="Personal impact analysis"
      className={`relative my-4 border-l-4 border-l-burgundy bg-paper/60 p-4 pl-5 transition-colors duration-200 border border-rule border-l-burgundy ${className}`}
    >
      <div className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-burgundy">
          <Sparkles className="size-3.5 text-burgundy" aria-hidden="true" />
          <span>What this means for you</span>
        </div>
        <span className="font-sans text-[10px] uppercase tracking-wider text-ink-muted">
          AI Analysis
        </span>
      </div>

      <p className="font-serif text-sm leading-relaxed text-ink/90 italic md:text-[15px]">
        &ldquo;{note}&rdquo;
      </p>

      <div className="mt-3 flex items-center justify-between border-t border-rule/60 pt-2 font-sans text-[11px] text-ink-muted">
        <span>Personal relevance</span>
        <div className="flex items-center gap-2">
          {feedback ? (
            <span className="inline-flex items-center gap-1 text-burgundy font-medium">
              <Check className="size-3" aria-hidden="true" />
              Feedback received
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleFeedback("helpful")}
                className="inline-flex items-center gap-1 transition-colors hover:text-burgundy"
                title="Helpful"
              >
                <ThumbsUp className="size-3" aria-hidden="true" />
                Helpful
              </button>
              <span className="text-rule">•</span>
              <button
                type="button"
                onClick={() => handleFeedback("not_relevant")}
                className="inline-flex items-center gap-1 transition-colors hover:text-burgundy"
                title="Not relevant"
              >
                <ThumbsDown className="size-3" aria-hidden="true" />
                Not relevant
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
