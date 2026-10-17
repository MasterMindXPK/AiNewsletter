"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Newspaper, RefreshCw } from "lucide-react";

export function EditionEmpty() {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/edition/generate", { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to generate your paper.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error while connecting to server.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center md:py-28">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-rule bg-paper">
        <Newspaper className="size-7 text-burgundy" strokeWidth={1.5} />
      </div>

      <h2 className="mt-6 font-serif text-3xl font-medium text-ink md:text-4xl">
        Your edition is ready to be printed.
      </h2>

      <p className="mt-3 font-serif text-base leading-relaxed text-ink/80 md:text-lg">
        We have fresh articles in your orbit. Click below to assemble your personalized broadsheet for today.
      </p>

      {error && (
        <p className="mt-4 font-sans text-xs text-burgundy" role="alert">
          {error}
        </p>
      )}

      <div className="mt-8">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 border border-burgundy bg-burgundy px-6 py-3 font-sans text-sm font-medium text-paper transition-colors hover:bg-burgundy/90 focus-visible:outline-burgundy disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${generating ? "animate-spin" : ""}`} aria-hidden="true" />
          <span>{generating ? "Printing edition..." : "Print today's paper"}</span>
        </button>
      </div>
    </div>
  );
}
