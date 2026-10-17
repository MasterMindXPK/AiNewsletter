import { Check } from "lucide-react";
import type { Topic } from "@/lib/types";
import { MIN_TOPICS, TOPIC_GROUPS, TOPIC_META } from "@/lib/onboarding/topics";
import { StepHeader, type StepProps } from "./fields";

interface StepTopicsProps extends StepProps {
  error: string | null;
}

export function StepTopics({ data, update, error }: StepTopicsProps) {
  const selected = new Set(data.topics);

  function toggle(topic: Topic) {
    const next = new Set(selected);
    if (next.has(topic)) next.delete(topic);
    else next.add(topic);
    update({ topics: Array.from(next) });
  }

  const enough = data.topics.length >= MIN_TOPICS;

  return (
    <section>
      <StepHeader
        eyebrow="Your sections"
        title="What do you want to read about?"
        description={`Choose at least ${MIN_TOPICS}. Your front page will lead with these.`}
      />

      <p
        aria-live="polite"
        className={`mb-6 font-sans text-[13px] ${enough ? "text-ink-muted" : "text-ink"}`}
      >
        <span className="font-medium text-burgundy">{data.topics.length}</span> selected
        {enough ? "." : `, ${MIN_TOPICS - data.topics.length} more to go.`}
      </p>

      <div className="space-y-8">
        {TOPIC_GROUPS.map((group) => (
          <fieldset key={group.title}>
            <legend className="font-sans text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              {group.title}
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {group.topics.map((topic) => {
                const meta = TOPIC_META[topic];
                const isSelected = selected.has(topic);
                return (
                  <button
                    key={topic}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(topic)}
                    className={`group flex items-start justify-between gap-3 border px-4 py-3 text-left transition-[color,background-color,border-color,transform] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy motion-safe:active:scale-[0.98] ${
                      isSelected
                        ? "border-burgundy bg-burgundy text-paper"
                        : "border-rule text-ink hover:border-ink"
                    }`}
                  >
                    <span>
                      <span className="block font-serif text-lg leading-snug">{meta.label}</span>
                      <span
                        className={`mt-0.5 block font-sans text-[13px] ${
                          isSelected ? "text-paper/80" : "text-ink-muted"
                        }`}
                      >
                        {meta.descriptor}
                      </span>
                    </span>
                    <Check
                      className={`mt-1 size-4 shrink-0 transition-opacity duration-300 ${
                        isSelected ? "opacity-100" : "opacity-0"
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-6 border-l-2 border-burgundy bg-burgundy/5 px-4 py-3 font-sans text-sm text-burgundy motion-safe:animate-fade-in"
        >
          {error}
        </p>
      )}
    </section>
  );
}
