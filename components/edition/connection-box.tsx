import Link from "next/link";
import { ArrowRight, Network } from "lucide-react";
import type { StoryConnection } from "@/lib/types";

interface ConnectionBoxProps {
  connection: StoryConnection;
  className?: string;
}

export function ConnectionBox({ connection, className = "" }: ConnectionBoxProps) {
  return (
    <aside
      aria-label="Story connection analysis"
      className={`relative my-8 border border-ink bg-paper p-5 shadow-[4px_4px_0_0_#17140f] md:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-3">
        <div className="flex items-center gap-2">
          <Network className="size-4 text-burgundy" strokeWidth={1.8} aria-hidden="true" />
          <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-burgundy">
            How It Connects
          </span>
        </div>
        <span className="inline-flex items-center border border-rule px-2 py-0.5 font-sans text-[10px] uppercase tracking-wider text-ink-muted">
          AI Analysis
        </span>
      </div>

      <h3 className="mt-3 font-serif text-lg font-medium text-ink md:text-xl">
        {connection.title}
      </h3>

      {/* Causal Chain Nodes */}
      {connection.chain && connection.chain.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {connection.chain.map((step, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {step.article_id ? (
                <Link
                  href={`/story/${step.article_id}`}
                  className="rounded border border-rule bg-paper px-2.5 py-1 font-sans text-xs text-ink transition-colors hover:border-burgundy hover:bg-burgundy hover:text-paper"
                >
                  {step.step}
                </Link>
              ) : (
                <span className="rounded border border-dashed border-rule px-2.5 py-1 font-sans text-xs text-ink-muted">
                  {step.step}
                </span>
              )}
              {idx < connection.chain.length - 1 && (
                <ArrowRight className="size-3 text-ink-muted" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 font-serif text-sm leading-relaxed text-ink/80 md:text-base">
        {connection.explanation}
      </p>
    </aside>
  );
}
