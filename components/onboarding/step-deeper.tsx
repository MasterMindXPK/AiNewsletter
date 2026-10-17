import { useId, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { mergeKeywords } from "@/lib/onboarding/draft";
import { MAX_KEYWORDS, TOPIC_SUGGESTIONS } from "@/lib/onboarding/topics";
import { Chip, Field, StepHeader, inputClass, type StepProps } from "./fields";

interface StepDeeperProps extends StepProps {
  pending: string;
  onPendingChange: (value: string) => void;
}

export function StepDeeper({ data, update, pending, onPendingChange }: StepDeeperProps) {
  const inputId = useId();
  const atLimit = data.keywords.length >= MAX_KEYWORDS;

  const added = new Set(data.keywords.map((keyword) => keyword.toLowerCase()));
  const suggestions = Array.from(
    new Set(data.topics.flatMap((topic) => TOPIC_SUGGESTIONS[topic])),
  )
    .filter((suggestion) => !added.has(suggestion.toLowerCase()))
    .slice(0, 12);

  function commit(raw: string) {
    const next = mergeKeywords(data.keywords, raw);
    update({ keywords: next });
    onPendingChange("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (pending.trim()) commit(pending);
  }

  function remove(keyword: string) {
    update({ keywords: data.keywords.filter((item) => item !== keyword) });
  }

  return (
    <section>
      <StepHeader
        eyebrow="Go deeper"
        title="Anything specific?"
        description="Name the people, teams, markets or themes you never want to miss. We will watch for them across every source."
      />

      <Field
        id={inputId}
        label="Add your own"
        hint={'Try "Tesla", "cricket", "PSX" or "AI regulation". Separate several with commas.'}
      >
        <div className="flex gap-2">
          <input
            id={inputId}
            type="text"
            value={pending}
            onChange={(event) => onPendingChange(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={atLimit}
            maxLength={120}
            placeholder={atLimit ? "Keyword limit reached" : "Type a keyword and press Enter"}
            aria-describedby={`${inputId}-hint`}
            className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
          />
          <button
            type="button"
            onClick={() => commit(pending)}
            disabled={atLimit || !pending.trim()}
            className="mt-2 inline-flex shrink-0 items-center gap-2 border border-ink px-4 font-sans text-[13px] font-medium uppercase tracking-[0.12em] text-ink transition-colors duration-300 hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add
          </button>
        </div>
      </Field>

      <div className="mt-8" aria-live="polite">
        <h3 className="font-sans text-xs font-medium uppercase tracking-[0.12em] text-ink">
          Your keywords{" "}
          <span className="text-ink-muted">
            ({data.keywords.length} of {MAX_KEYWORDS})
          </span>
        </h3>
        {data.keywords.length === 0 ? (
          <p className="mt-3 font-serif text-base italic text-ink-muted">
            Nothing added yet. This step is optional.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {data.keywords.map((keyword) => (
              <li key={keyword} className="motion-safe:animate-fade-in">
                <button
                  type="button"
                  onClick={() => remove(keyword)}
                  aria-label={`Remove ${keyword}`}
                  className="inline-flex items-center gap-2 border border-burgundy bg-burgundy px-3.5 py-2 font-sans text-sm text-paper transition-colors duration-300 hover:bg-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                >
                  {keyword}
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-8 border-t border-rule pt-8">
          <h3 className="font-sans text-xs font-medium uppercase tracking-[0.12em] text-ink">
            Suggested for your topics
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <Chip
                  selected={false}
                  disabled={atLimit}
                  onClick={() => update({ keywords: mergeKeywords(data.keywords, suggestion) })}
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  {suggestion}
                </Chip>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
