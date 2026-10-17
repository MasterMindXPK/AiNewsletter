"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Calendar, Bookmark, Newspaper, X } from "lucide-react";
import type { Article } from "@/lib/types";
import { EditionTile, type EditionSummary } from "./edition-tile";
import { SavedStoryCard } from "./saved-story-card";

interface ArchiveViewProps {
  editions: EditionSummary[];
  initialSavedArticles: Article[];
}

export function ArchiveView({ editions, initialSavedArticles }: ArchiveViewProps) {
  const [activeTab, setActiveTab] = useState<"editions" | "saved">("editions");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [savedArticles, setSavedArticles] = useState<Article[]>(initialSavedArticles);

  // Available topics for filtering
  const allTopics = useMemo(() => {
    const set = new Set<string>();
    for (const ed of editions) {
      for (const t of ed.topics) set.add(t);
    }
    for (const art of savedArticles) {
      for (const t of art.topics) set.add(t);
    }
    return Array.from(set).sort();
  }, [editions, savedArticles]);

  // Filtered editions
  const filteredEditions = useMemo(() => {
    return editions.filter((ed) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        ed.headline_of_the_day.toLowerCase().includes(q) ||
        ed.edition_date.includes(q) ||
        (ed.lead_title && ed.lead_title.toLowerCase().includes(q));

      const matchesTopic =
        selectedTopic === "all" || ed.topics.includes(selectedTopic);

      return matchesQuery && matchesTopic;
    });
  }, [editions, searchQuery, selectedTopic]);

  // Group editions by Month (e.g., "October 2026")
  const groupedEditions = useMemo(() => {
    const groups = new Map<string, EditionSummary[]>();
    for (const ed of filteredEditions) {
      const date = new Date(ed.edition_date + "T12:00:00Z");
      const monthYear = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      if (!groups.has(monthYear)) groups.set(monthYear, []);
      groups.get(monthYear)!.push(ed);
    }
    return groups;
  }, [filteredEditions]);

  // Filtered saved stories
  const filteredSaved = useMemo(() => {
    return savedArticles.filter((art) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        art.title.toLowerCase().includes(q) ||
        art.summary.toLowerCase().includes(q) ||
        art.source_name.toLowerCase().includes(q);

      const matchesTopic =
        selectedTopic === "all" || art.topics.includes(selectedTopic as never);

      return matchesQuery && matchesTopic;
    });
  }, [savedArticles, searchQuery, selectedTopic]);

  function handleRemoveSaved(articleId: string) {
    setSavedArticles((prev) => prev.filter((a) => a.id !== articleId));

    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        article_id: articleId,
        edition_id: "archive",
        type: "save",
      }),
    }).catch(() => null);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
      {/* Archive Header */}
      <div className="border-b-2 border-ink pb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-burgundy">
              Historical Record
            </span>
            <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl md:text-5xl">
              Paper Archive
            </h1>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 border border-rule bg-paper p-1 font-sans text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("editions")}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors ${
                activeTab === "editions"
                  ? "bg-ink text-paper"
                  : "text-ink hover:text-burgundy"
              }`}
            >
              <Calendar className="size-3.5" />
              <span>Past Editions ({editions.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("saved")}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors ${
                activeTab === "saved"
                  ? "bg-ink text-paper"
                  : "text-ink hover:text-burgundy"
              }`}
            >
              <Bookmark className="size-3.5" />
              <span>Saved Stories ({savedArticles.length})</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Topic Chips */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === "editions"
                  ? "Search by headline, date, or lead story..."
                  : "Search saved stories..."
              }
              className="w-full border border-rule bg-paper py-2 pl-9 pr-8 font-sans text-xs text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Topic Filters */}
          {allTopics.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedTopic("all")}
                className={`rounded border px-2.5 py-1 font-sans text-[11px] font-medium transition-colors ${
                  selectedTopic === "all"
                    ? "border-burgundy bg-burgundy text-paper"
                    : "border-rule bg-paper text-ink hover:border-ink"
                }`}
              >
                All Topics
              </button>
              {allTopics.slice(0, 6).map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setSelectedTopic(topic)}
                  className={`rounded border px-2.5 py-1 font-sans text-[11px] font-medium capitalize transition-colors ${
                    selectedTopic === topic
                      ? "border-burgundy bg-burgundy text-paper"
                      : "border-rule bg-paper text-ink hover:border-ink"
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-8">
        {activeTab === "editions" ? (
          /* PAST EDITIONS TAB */
          <div>
            {filteredEditions.length === 0 ? (
              <div className="py-16 text-center">
                <Newspaper className="mx-auto size-10 text-ink-muted" strokeWidth={1.5} />
                <h3 className="mt-4 font-serif text-xl font-medium text-ink">
                  {searchQuery || selectedTopic !== "all"
                    ? "No editions matched your search"
                    : "No archived editions yet"}
                </h3>
                <p className="mt-2 font-serif text-sm text-ink-muted">
                  {searchQuery || selectedTopic !== "all"
                    ? "Try adjusting your search terms or clearing topic filters."
                    : "Today's edition is ready to be printed from the front page."}
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  {(searchQuery || selectedTopic !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedTopic("all");
                      }}
                      className="border border-rule px-4 py-2 font-sans text-xs font-medium text-ink hover:bg-rule/30"
                    >
                      Clear search filters
                    </button>
                  )}
                  <Link
                    href="/"
                    className="border border-burgundy bg-burgundy px-4 py-2 font-sans text-xs font-medium text-paper hover:bg-burgundy/90"
                  >
                    View Today&apos;s Edition
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                {Array.from(groupedEditions.entries()).map(([monthYear, monthEditions]) => (
                  <section key={monthYear}>
                    <div className="mb-6 flex items-center gap-3">
                      <h2 className="font-serif text-xl font-semibold uppercase tracking-wider text-ink">
                        {monthYear}
                      </h2>
                      <div className="h-px flex-1 bg-rule" />
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {monthEditions.map((edition) => (
                        <EditionTile key={edition.id} edition={edition} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* SAVED STORIES TAB */
          <div>
            {filteredSaved.length === 0 ? (
              <div className="py-16 text-center">
                <Bookmark className="mx-auto size-10 text-ink-muted" strokeWidth={1.5} />
                <h3 className="mt-4 font-serif text-xl font-medium text-ink">
                  {searchQuery || selectedTopic !== "all"
                    ? "No saved stories matched your search"
                    : "No saved stories yet"}
                </h3>
                <p className="mt-2 font-serif text-sm text-ink-muted">
                  {searchQuery || selectedTopic !== "all"
                    ? "Try clearing your search terms."
                    : "Click the bookmark icon on any story while reading your morning paper to save it here for reference."}
                </p>
                <div className="mt-6 flex justify-center">
                  <Link
                    href="/"
                    className="border border-burgundy bg-burgundy px-4 py-2 font-sans text-xs font-medium text-paper hover:bg-burgundy/90"
                  >
                    Browse Today&apos;s Paper
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSaved.map((article) => (
                  <SavedStoryCard
                    key={article.id}
                    article={article}
                    onRemove={handleRemoveSaved}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
