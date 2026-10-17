"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useMemo } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import type { HydratedEdition } from "@/lib/edition/load";
import { EditionToolbar } from "./edition-toolbar";
import { LeadStory } from "./lead-story";
import { StoryCard } from "./story-card";
import { SectionHeader } from "./section-header";
import { InBriefStrip } from "./in-brief-strip";
import { ConnectionBox } from "./connection-box";

interface EditionReaderProps {
  initialData: HydratedEdition;
  readerName?: string;
}

export function EditionReader({ initialData, readerName }: EditionReaderProps) {
  const { edition, isMock } = initialData;

  // Track skipped / dismissed articles (with Undo support)
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [lastSkippedId, setLastSkippedId] = useState<string | null>(null);

  // Track saved articles
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialData.savedArticleIds));

  // Feedback notification
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Filter out skipped articles
  const activeItems = useMemo(() => {
    return initialData.items.filter(({ article }) => !skippedIds.has(article.id));
  }, [initialData.items, skippedIds]);

  // Separate stories by size / section
  const leadItem = activeItems.find(({ item }) => item.size === "lead") ?? activeItems[0];
  const otherItems = activeItems.filter(({ article }) => article.id !== leadItem?.article.id);

  const majorItems = otherItems.filter(({ item }) => item.size === "major");
  const briefItems = otherItems.filter(({ item }) => item.size === "brief");
  const standardItems = otherItems.filter(
    ({ item }) => item.size !== "major" && item.size !== "brief" && item.size !== "lead"
  );

  // Group standard items by section
  const sectionGroups = useMemo(() => {
    const groups = new Map<string, typeof standardItems>();
    for (const entry of standardItems) {
      const sectionName = entry.item.section || "Your Interests";
      if (!groups.has(sectionName)) groups.set(sectionName, []);
      groups.get(sectionName)!.push(entry);
    }
    return groups;
  }, [standardItems]);

  // Read time & visibility tracking
  const visibleStartTimes = useRef<Map<string, number>>(new Map());
  const accumulatedTimes = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    // 1. Fire 'open' event for the edition
    if (leadItem && !isMock) {
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article_id: leadItem.article.id,
          edition_id: edition.id,
          type: "open",
        }),
      }).catch(() => null);
    }

    // 2. IntersectionObserver to track visible read time
    const observer = new IntersectionObserver(
      (entries) => {
        const now = Date.now();
        for (const entry of entries) {
          const articleId = entry.target.getAttribute("data-article-id");
          if (!articleId) continue;

          if (entry.isIntersecting) {
            visibleStartTimes.current.set(articleId, now);
          } else {
            const start = visibleStartTimes.current.get(articleId);
            if (start) {
              const seconds = (now - start) / 1000;
              const prev = accumulatedTimes.current.get(articleId) ?? 0;
              accumulatedTimes.current.set(articleId, prev + seconds);
              visibleStartTimes.current.delete(articleId);
            }
          }
        }
      },
      { threshold: 0.5 }
    );

    const elements = document.querySelectorAll("[data-article-id]");
    elements.forEach((el) => observer.observe(el));

    // 3. Flush read_time events on unload
    function flushReadTimes() {
      if (isMock) return;
      const now = Date.now();
      const events: { article_id: string; edition_id: string; type: "read_time"; value: number }[] = [];

      for (const [articleId, start] of visibleStartTimes.current.entries()) {
        const seconds = (now - start) / 1000;
        const prev = accumulatedTimes.current.get(articleId) ?? 0;
        accumulatedTimes.current.set(articleId, prev + seconds);
      }
      visibleStartTimes.current.clear();

      for (const [articleId, totalSec] of accumulatedTimes.current.entries()) {
        if (totalSec >= 3) {
          events.push({
            article_id: articleId,
            edition_id: edition.id,
            type: "read_time",
            value: Math.round(totalSec),
          });
        }
      }
      accumulatedTimes.current.clear();

      if (events.length > 0) {
        const payload = JSON.stringify(events);
        if (typeof navigator.sendBeacon === "function") {
          navigator.sendBeacon("/api/events", new Blob([payload], { type: "application/json" }));
        } else {
          void fetch("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => null);
        }
      }
    }

    window.addEventListener("beforeunload", flushReadTimes);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushReadTimes();
    });

    return () => {
      observer.disconnect();
      window.removeEventListener("beforeunload", flushReadTimes);
    };
  }, [edition.id, isMock, leadItem]);

  function handleToggleSave(articleId: string) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) next.delete(articleId);
      else next.add(articleId);
      return next;
    });

    if (!isMock) {
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article_id: articleId,
          edition_id: edition.id,
          type: "save",
        }),
      }).catch(() => null);
    }
  }

  function handleSkip(articleId: string) {
    setSkippedIds((prev) => new Set(prev).add(articleId));
    setLastSkippedId(articleId);

    if (!isMock) {
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article_id: articleId,
          edition_id: edition.id,
          type: "skip",
        }),
      }).catch(() => null);
    }
  }

  function handleUndoSkip() {
    if (!lastSkippedId) return;
    setSkippedIds((prev) => {
      const next = new Set(prev);
      next.delete(lastSkippedId);
      return next;
    });
    setLastSkippedId(null);
  }

  function handleFeedback(articleId: string, type: "more_like_this" | "less_like_this") {
    setFeedbackToast(
      type === "more_like_this" ? "We'll show more stories like this." : "We'll show fewer stories like this."
    );
    setTimeout(() => setFeedbackToast(null), 3500);

    if (!isMock) {
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article_id: articleId,
          edition_id: edition.id,
          type,
        }),
      }).catch(() => null);
    }
  }

  return (
    <div className="relative pb-20">
      {/* Sample Edition Banner for Guests */}
      {isMock && (
        <aside
          aria-label="Sample edition notice"
          className="border-b border-burgundy bg-burgundy/10 px-5 py-3 text-center font-sans text-xs text-ink md:px-8"
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <Sparkles className="size-4 text-burgundy" aria-hidden="true" />
              <span>
                <strong>Sample broadsheet.</strong> Personalize your topics and get your own morning paper every day.
              </span>
            </span>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="font-medium text-ink underline transition-colors hover:text-burgundy"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded border border-burgundy bg-burgundy px-3 py-1 font-medium text-paper transition-colors hover:bg-burgundy/90"
              >
                Start your paper
              </Link>
            </div>
          </div>
        </aside>
      )}

      {/* Reader Toolbar */}
      <EditionToolbar
        editionId={edition.id}
        editionDate={edition.edition_date}
        headlineOfTheDay={edition.headline_of_the_day}
        storyCount={activeItems.length}
        pdfUrl={edition.pdf_url}
        isMock={isMock}
      />

      <div className="mx-auto max-w-6xl px-5 md:px-8">
        {/* Undo Toast */}
        {lastSkippedId && (
          <aside
            aria-live="polite"
            className="sticky top-4 z-40 my-4 flex items-center justify-between rounded border border-ink bg-paper p-3 shadow-lg motion-safe:animate-fade-down"
          >
            <span className="font-sans text-xs text-ink">Story hidden from today&apos;s paper.</span>
            <button
              type="button"
              onClick={handleUndoSkip}
              className="inline-flex items-center gap-1 font-sans text-xs font-semibold text-burgundy hover:underline"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              Undo
            </button>
          </aside>
        )}

        {/* Feedback Toast */}
        {feedbackToast && (
          <aside
            aria-live="polite"
            className="sticky top-4 z-40 my-4 flex items-center justify-between rounded border border-burgundy bg-paper p-3 shadow-lg motion-safe:animate-fade-down"
          >
            <span className="font-sans text-xs text-ink font-medium">{feedbackToast}</span>
          </aside>
        )}

        {/* Lead Story */}
        {leadItem && (
          <LeadStory
            item={leadItem.item}
            article={leadItem.article}
            editionId={edition.id}
            isSaved={savedIds.has(leadItem.article.id)}
            onToggleSave={handleToggleSave}
            onSkip={handleSkip}
            onFeedback={handleFeedback}
          />
        )}

        {/* Major Stories Grid */}
        {majorItems.length > 0 && (
          <section className="mb-12">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 md:divide-x md:divide-rule">
              {majorItems.map(({ item, article }, index) => (
                <StoryCard
                  key={article.id}
                  item={item}
                  article={article}
                  editionId={edition.id}
                  isSaved={savedIds.has(article.id)}
                  onToggleSave={handleToggleSave}
                  onSkip={handleSkip}
                  onFeedback={handleFeedback}
                  className={index > 0 ? "md:pl-8" : ""}
                />
              ))}
            </div>
          </section>
        )}

        {/* Story Connection (M10 hook) */}
        {edition.connections && edition.connections.length > 0 && (
          <ConnectionBox connection={edition.connections[0]} />
        )}

        {/* Section Groups */}
        {Array.from(sectionGroups.entries()).map(([sectionName, items]) => (
          <section key={sectionName} className="mb-12">
            <SectionHeader title={sectionName} />
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 md:divide-x md:divide-rule">
              {items.map(({ item, article }, index) => (
                <StoryCard
                  key={article.id}
                  item={item}
                  article={article}
                  editionId={edition.id}
                  isSaved={savedIds.has(article.id)}
                  onToggleSave={handleToggleSave}
                  onSkip={handleSkip}
                  onFeedback={handleFeedback}
                  className={index % 3 !== 0 ? "md:pl-8" : ""}
                />
              ))}
            </div>
          </section>
        ))}

        {/* In Brief Strip */}
        {briefItems.length > 0 && (
          <div className="my-12">
            <InBriefStrip
              items={briefItems}
              editionId={edition.id}
              savedArticleIds={savedIds}
              onToggleSave={handleToggleSave}
            />
          </div>
        )}
      </div>
    </div>
  );
}
