import { useId } from "react";
import { Field, StepHeader, inputClass, type StepProps } from "./fields";

const PROMISES = [
  "Stories chosen around your interests, not a feed",
  "A line on why each story is in your paper",
  "What the news means for your city and your work",
];

export function StepWelcome({ data, update }: StepProps) {
  const nameId = useId();

  return (
    <section>
      <StepHeader
        eyebrow="Welcome"
        title="Let's set your front page"
        description="A few quick questions so each morning's edition leads with what matters to you. It takes about a minute, and you can skip most steps."
      />

      <Field id={nameId} label="What should we call you?" hint="Optional. Your first name is perfect.">
        <input
          id={nameId}
          type="text"
          name="name"
          value={data.name}
          onChange={(event) => update({ name: event.target.value })}
          autoComplete="given-name"
          maxLength={60}
          placeholder="Your first name"
          aria-describedby={`${nameId}-hint`}
          className={inputClass}
        />
      </Field>

      <ul className="mt-10 divide-y divide-rule border-y border-rule">
        {PROMISES.map((promise, index) => (
          <li
            key={promise}
            className="flex items-baseline gap-4 py-4 motion-safe:animate-fade-up"
            style={{ animationDelay: `${200 + index * 120}ms` }}
          >
            <span aria-hidden="true" className="font-serif text-lg italic text-burgundy">
              {index + 1}
            </span>
            <span className="font-serif text-lg text-ink">{promise}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
