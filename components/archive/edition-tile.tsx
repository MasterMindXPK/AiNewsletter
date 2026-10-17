import Link from "next/link";
import Image from "next/image";
import { Download, ArrowRight, Printer, Calendar } from "lucide-react";

export interface EditionSummary {
  id: string;
  edition_date: string;
  formatted_date: string;
  headline_of_the_day: string;
  story_count: number;
  lead_image?: string;
  lead_title?: string;
  lead_source?: string;
  topics: string[];
}

interface EditionTileProps {
  edition: EditionSummary;
}

export function EditionTile({ edition }: EditionTileProps) {
  return (
    <article className="group flex flex-col justify-between border border-rule bg-paper p-5 transition-all duration-300 hover:border-ink hover:shadow-[4px_4px_0_0_#17140f] md:p-6">
      <div>
        {/* Date header */}
        <div className="flex items-center justify-between border-b border-rule pb-3">
          <span className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-wider text-burgundy">
            <Calendar className="size-3.5" aria-hidden="true" />
            {edition.edition_date}
          </span>
          <span className="font-sans text-[11px] text-ink-muted">
            {edition.story_count} stories
          </span>
        </div>

        {/* Thumbnail Image if present */}
        <div className="relative mt-4 aspect-[16/9] w-full overflow-hidden bg-rule">
          {edition.lead_image ? (
            <Image
              src={edition.lead_image}
              alt={edition.headline_of_the_day || "Edition lead image"}
              fill
              sizes="(min-width: 1024px) 340px, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center bg-[#eee8dc] p-4 text-center">
              <span className="font-serif text-2xl font-light italic text-ink/40">Your Orbit</span>
              <span className="mt-1 font-sans text-[10px] uppercase tracking-widest text-ink-muted">
                {edition.lead_source || "Daily Paper"}
              </span>
            </div>
          )}
        </div>

        {/* Headline */}
        <h3 className="mt-4 font-serif text-lg font-medium leading-snug tracking-[-0.01em] text-ink transition-colors group-hover:text-burgundy md:text-xl">
          <Link href={`/edition/${edition.edition_date}`} className="focus-visible:outline-burgundy">
            {edition.headline_of_the_day || `Edition for ${edition.formatted_date}`}
          </Link>
        </h3>

        {/* Topic tags */}
        {edition.topics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {edition.topics.slice(0, 3).map((topic, i) => (
              <span
                key={i}
                className="rounded border border-rule px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wider text-ink-muted"
              >
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-4">
        <Link
          href={`/edition/${edition.edition_date}`}
          className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-ink transition-colors hover:text-burgundy"
        >
          <span>Read Paper</span>
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href={`/print/edition/${edition.id}`}
            className="rounded p-1.5 text-ink-muted transition-colors hover:bg-rule/40 hover:text-ink"
            title="Print view"
            aria-label="Open print view"
          >
            <Printer className="size-3.5" />
          </Link>

          <a
            href={`/api/edition/${edition.id}/pdf`}
            className="inline-flex items-center gap-1 rounded border border-rule px-2 py-1 font-sans text-[11px] font-medium text-ink transition-colors hover:border-burgundy hover:bg-burgundy hover:text-paper"
            title="Download broadsheet PDF"
          >
            <Download className="size-3" />
            <span>PDF</span>
          </a>
        </div>
      </div>
    </article>
  );
}
