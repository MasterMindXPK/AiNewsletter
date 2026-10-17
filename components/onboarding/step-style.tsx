import { useId } from "react";
import { formatHour } from "@/lib/onboarding/draft";
import {
  DEPTH_OPTIONS,
  LANGUAGE_CODES,
  LANGUAGE_LABELS,
} from "@/lib/onboarding/topics";
import { Chip, Field, StepHeader, inputClass, labelClass, type StepProps } from "./fields";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function StepStyle({ data, update }: StepProps) {
  const hourId = useId();

  function toggleLanguage(code: (typeof LANGUAGE_CODES)[number]) {
    const has = data.languages.includes(code);
    if (has && data.languages.length === 1) return;
    const next = has
      ? data.languages.filter((item) => item !== code)
      : LANGUAGE_CODES.filter((item) => item === code || data.languages.includes(item));
    update({ languages: next });
  }

  return (
    <section>
      <StepHeader
        eyebrow="Reading style"
        title="How do you like your paper?"
        description="Set the length, the hour it lands, and the language. You can change all three later."
      />

      <div className="space-y-10">
        <fieldset>
          <legend className={labelClass}>Reading depth</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {DEPTH_OPTIONS.map((option) => {
              const selected = data.reading_depth === option.value;
              return (
                <label
                  key={option.value}
                  className={`relative block cursor-pointer border px-4 py-4 transition-colors duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-burgundy ${
                    selected
                      ? "border-burgundy bg-burgundy text-paper"
                      : "border-rule text-ink hover:border-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="reading_depth"
                    value={option.value}
                    checked={selected}
                    onChange={() => update({ reading_depth: option.value })}
                    className="sr-only"
                  />
                  <span className="block font-serif text-xl leading-snug">{option.label}</span>
                  <span
                    className={`mt-1 block font-sans text-[13px] ${
                      selected ? "text-paper/85" : "text-ink-muted"
                    }`}
                  >
                    {option.description}
                  </span>
                  <span
                    className={`mt-3 block font-sans text-[11px] uppercase tracking-[0.14em] ${
                      selected ? "text-paper/85" : "text-burgundy"
                    }`}
                  >
                    {option.time}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Field
          id={hourId}
          label="Delivery time"
          hint="Your edition is ready by this hour, in your local time."
        >
          <select
            id={hourId}
            value={data.delivery_hour}
            onChange={(event) => update({ delivery_hour: Number(event.target.value) })}
            aria-describedby={`${hourId}-hint`}
            className={inputClass}
          >
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {formatHour(hour)}
              </option>
            ))}
          </select>
        </Field>

        <fieldset>
          <legend className={labelClass}>Language</legend>
          <p className="mt-1.5 font-sans text-[13px] text-ink-muted">
            Keep at least one selected.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {LANGUAGE_CODES.map((code) => (
              <Chip
                key={code}
                selected={data.languages.includes(code)}
                onClick={() => toggleLanguage(code)}
              >
                {LANGUAGE_LABELS[code]}
              </Chip>
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  );
}
