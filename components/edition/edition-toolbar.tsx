"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, RefreshCw, Calendar, Sparkles } from "lucide-react";

interface EditionToolbarProps {
  editionId: string;
  editionDate: string;
  headlineOfTheDay?: string;
  storyCount: number;
  pdfUrl?: string;
  isMock?: boolean;
  className?: string;
}

export function EditionToolbar({
  editionId,
  editionDate,
  headlineOfTheDay,
  storyCount,
  pdfUrl,
  isMock = false,
  className = "",
}: EditionToolbarProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  async function handleRefresh() {
    if (isMock) {
      router.push("/signup");
      return;
    }

    setRefreshing(true);
    setRefreshMessage(null);
    try {
      const res = await fetch("/api/edition/generate", { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setRefreshMessage(data.error ?? "Failed to refresh edition");
      } else {
        setRefreshMessage("Paper refreshed!");
        router.refresh();
      }
    } catch {
      setRefreshMessage("Error connecting to server");
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMessage(null), 4000);
    }
  }

  return (
    <div className={`border-b border-rule bg-paper py-3.5 ${className}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 md:px-8">
        {/* Left: Headline of the day pill or Date badge */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-1.5 border border-ink bg-ink px-2.5 py-1 font-sans text-[11px] font-medium uppercase tracking-wider text-paper">
            <Calendar className="size-3" aria-hidden="true" />
            {editionDate}
          </span>
          <span className="font-sans text-xs text-ink-muted">
            {storyCount} stories curated
          </span>
          {headlineOfTheDay && (
            <span className="hidden items-center gap-1.5 font-serif text-xs italic text-ink/80 lg:inline-flex">
              <span className="h-1 w-1 rounded-full bg-burgundy" />
              &ldquo;{headlineOfTheDay}&rdquo;
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {refreshMessage && (
            <span className="font-sans text-xs text-burgundy motion-safe:animate-fade-in">
              {refreshMessage}
            </span>
          )}

          {!isMock && (
            <Link
              href="/settings/interests"
              className="hidden sm:inline-flex items-center gap-1.5 border border-rule px-3 py-1.5 font-sans text-xs font-medium text-ink-muted transition-colors hover:border-burgundy hover:text-burgundy"
              title="View how your paper learns from your reads"
            >
              <Sparkles className="size-3 text-burgundy" aria-hidden="true" />
              <span>Interests</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 border border-rule px-3 py-1.5 font-sans text-xs font-medium text-ink transition-colors hover:border-ink hover:bg-rule/30 focus-visible:outline-burgundy disabled:opacity-50"
            title="Re-run ranking and refresh edition"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-burgundy" : ""}`} aria-hidden="true" />
            <span>{refreshing ? "Printing..." : "Refresh my paper"}</span>
          </button>

          <a
            href={pdfUrl ? pdfUrl : `/api/edition/${editionId}/pdf`}
            className="inline-flex items-center gap-1.5 border border-burgundy bg-burgundy px-3.5 py-1.5 font-sans text-xs font-medium text-paper transition-colors hover:bg-burgundy/90 focus-visible:outline-burgundy"
            title="Download broadsheet PDF edition (Module M7)"
          >
            <Download className="size-3.5" aria-hidden="true" />
            <span>Download PDF</span>
          </a>
        </div>
      </div>
    </div>
  );
}
