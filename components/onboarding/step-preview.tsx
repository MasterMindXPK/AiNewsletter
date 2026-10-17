import { useMemo } from "react";
import { buildPreview, type PreviewItem } from "@/lib/onboarding/preview";
import { StepHeader, type StepProps } from "./fields";

function Reason({ children }: { children: string }) {
  return (
    <p className="mt-2 font-sans text-[11px] uppercase tracking-[0.12em] text-burgundy">
      {children}
    </p>
  );
}

function Story({ item, size }: { item: PreviewItem; size: "major" | "brief" }) {
  return (
    <article>
      <h4
        className={
          size === "major"
            ? "font-serif text-xl font-medium leading-snug text-ink"
            : "font-serif text-base leading-snug text-ink"
        }
      >
        {item.article.title}
      </h4>
      {size === "major" && (
        <p className="mt-2 line-clamp-3 font-serif text-[15px] text-ink-muted">
          {item.article.summary}
        </p>
      )}
      <Reason>{item.reason}</Reason>
    </article>
  );
}

export function StepPreview({ data }: StepProps) {
  const preview = useMemo(
    () => buildPreview(data.topics, data.keywords),
    [data.topics, data.keywords],
  );
  const owner = data.name.trim();

  return (
    <section>
      <StepHeader
        eyebrow="Proof of concept"
        title="Here is a taste of your front page"
        description="Assembled from your picks using sample stories. Your real edition uses today's news."
      />

      <div className="border border-ink bg-paper p-5 motion-safe:animate-fade-up md:p-8">
        <div className="border-b-2 border-double border-ink pb-4 text-center">
          <p className="font-serif text-3xl font-medium tracking-[-0.02em] text-ink">Your Orbit</p>
          <p className="mt-1 font-serif text-sm italic text-ink-muted">
            {owner ? `The front page of ${owner}` : "Your front page"}
          </p>
        </div>

        {preview.lead ? (
          <div className="mt-6 space-y-8">
            <article className="border-b border-rule pb-8">
              <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                Lead story
              </p>
              <h3 className="mt-2 font-serif text-3xl font-medium leading-tight tracking-[-0.02em] text-ink md:text-4xl">
                {preview.lead.article.title}
              </h3>
              <p className="mt-3 font-serif text-base text-ink-muted">
                {preview.lead.article.summary}
              </p>
              <Reason>{preview.lead.reason}</Reason>
            </article>

            {preview.majors.length > 0 && (
              <div className="grid gap-8 border-b border-rule pb-8 md:grid-cols-2 md:gap-0 md:divide-x md:divide-rule">
                {preview.majors.map((item, index) => (
                  <div key={item.article.id} className={index === 0 ? "md:pr-6" : "md:pl-6"}>
                    <Story item={item} size="major" />
                  </div>
                ))}
              </div>
            )}

            {preview.briefs.length > 0 && (
              <div>
                <p className="font-sans text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                  In brief
                </p>
                <ul className="mt-3 divide-y divide-rule">
                  {preview.briefs.map((item) => (
                    <li key={item.article.id} className="py-3">
                      <Story item={item} size="brief" />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="py-10 text-center font-serif text-base italic text-ink-muted">
            Pick a few topics and your preview will appear here.
          </p>
        )}
      </div>
    </section>
  );
}
