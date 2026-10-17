import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ExternalLink, Clock, Tag } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { loadArticleById } from "@/lib/edition/load";
import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import type { Topic } from "@/lib/types";
import { ImpactCallout } from "@/components/edition/impact-callout";

export const dynamic = "force-dynamic";

interface StoryPageProps {
  params: Promise<{ id: string }>;
}

function estimateReadTime(text?: string, summary?: string): number {
  const words = (text || summary || "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { id } = await params;
  const article = loadArticleById(id);

  if (!article) {
    notFound();
  }

  const user = await getSessionUser();
  const db = getDb();

  // Find related stories by shared topics
  let relatedStories: { id: string; title: string; summary: string; source_name: string }[] = [];
  if (article.topics.length > 0) {
    const topicPattern = `%${article.topics[0]}%`;
    relatedStories = db
      .prepare(
        `SELECT id, title, summary, source_name
         FROM articles
         WHERE id != ? AND topics LIKE ?
         ORDER BY published_at DESC
         LIMIT 3`
      )
      .all(article.id, topicPattern) as { id: string; title: string; summary: string; source_name: string }[];
  }

  const readTime = estimateReadTime(article.raw_text, article.summary);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-4xl px-5 py-10 md:px-8 md:py-16">
        {/* Back Link */}
        <Link
          href="/"
          className="group inline-flex items-center gap-2 font-sans text-xs font-medium uppercase tracking-wider text-ink-muted transition-colors hover:text-burgundy"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1" />
          <span>Back to Today&apos;s Edition</span>
        </Link>

        {/* Article Header */}
        <header className="mt-8 border-b border-rule pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-burgundy">
              {article.topics[0] ?? "Story"}
            </span>
            <span aria-hidden="true" className="h-3 w-px bg-rule" />
            <span className="flex items-center gap-1 font-sans text-xs text-ink-muted">
              <Clock className="size-3" />
              {readTime} min read
            </span>
            <span aria-hidden="true" className="h-3 w-px bg-rule" />
            <span className="font-sans text-xs text-ink-muted">
              {new Date(article.published_at).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          <h1 className="mt-4 text-balance font-serif text-3xl font-medium leading-tight tracking-[-0.02em] text-ink sm:text-4xl md:text-5xl">
            {article.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 font-sans text-xs text-ink-muted">
            <div>
              {article.author ? (
                <span>By <strong className="font-medium text-ink">{article.author}</strong> for {article.source_name}</span>
              ) : (
                <span>Reported by <strong className="font-medium text-ink">{article.source_name}</strong></span>
              )}
            </div>

            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border border-rule px-3 py-1 font-medium text-ink transition-colors hover:border-burgundy hover:text-burgundy"
            >
              <ExternalLink className="size-3.5" />
              <span>Read Original on {article.source_domain}</span>
            </a>
          </div>
        </header>

        {/* Hero Image if present */}
        {article.image_url && (
          <figure className="my-8">
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-rule">
              <Image
                src={article.image_url}
                alt={article.title}
                fill
                priority
                sizes="(min-width: 896px) 800px, 100vw"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-2 text-right font-sans text-[11px] text-ink-muted">
              Image source: {article.source_name}
            </figcaption>
          </figure>
        )}

        {/* Executive Editorial Summary */}
        <div className="my-8 border-l-2 border-ink pl-5 italic font-serif text-lg leading-relaxed text-ink/90 md:text-xl">
          <p>{article.summary}</p>
        </div>

        {/* Full Text / Body */}
        <section className="prose prose-stone max-w-none font-serif text-base leading-relaxed text-ink/90 md:text-lg">
          {article.raw_text ? (
            <div className="space-y-5 whitespace-pre-line">
              {article.raw_text}
            </div>
          ) : (
            <div className="rounded border border-dashed border-rule bg-paper p-6 text-center">
              <p className="font-sans text-xs text-ink-muted">
                Full article text is preserved at the publisher&apos;s site.
              </p>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 border border-ink bg-ink px-4 py-2 font-sans text-xs font-medium text-paper hover:bg-burgundy hover:border-burgundy"
              >
                Continue reading at {article.source_name}
                <ExternalLink className="size-3" />
              </a>
            </div>
          )}
        </section>

        {/* Entities / Tags */}
        {article.entities && article.entities.length > 0 && (
          <div className="mt-10 border-t border-rule pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Tag className="size-3.5 text-ink-muted" />
              <span className="font-sans text-xs uppercase tracking-wider text-ink-muted">Mentioned:</span>
              {article.entities.map((e, idx) => (
                <span
                  key={idx}
                  className="rounded border border-rule px-2 py-0.5 font-sans text-xs text-ink"
                >
                  {e.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related Stories */}
        {relatedStories.length > 0 && (
          <aside className="mt-14 border-t-2 border-ink pt-8">
            <h2 className="font-serif text-xl font-medium text-ink">Related in Your Orbit</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {relatedStories.map((rel) => (
                <div key={rel.id} className="border-b border-rule pb-4 sm:border-b-0 sm:border-r sm:pr-4 sm:last:border-r-0">
                  <span className="font-sans text-[10px] uppercase tracking-wider text-ink-muted">
                    {rel.source_name}
                  </span>
                  <h3 className="mt-1 font-serif text-sm font-medium leading-snug text-ink hover:text-burgundy">
                    <Link href={`/story/${rel.id}`}>
                      {rel.title}
                    </Link>
                  </h3>
                  <p className="mt-1.5 font-serif text-xs leading-relaxed text-ink/70 line-clamp-3">
                    {rel.summary}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        )}
      </main>
    </>
  );
}
