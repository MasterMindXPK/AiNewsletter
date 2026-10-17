import { useId } from "react";
import {
  CITY_SUGGESTIONS,
  COUNTRY_CODES,
  COUNTRY_NAMES,
  INDUSTRY_PRESETS,
  PROFESSION_PRESETS,
  SITUATION_TAGS,
} from "@/lib/onboarding/topics";
import { Chip, Field, StepHeader, inputClass, labelClass, type StepProps } from "./fields";

type SituationTag = (typeof SITUATION_TAGS)[number];

export function StepAbout({ data, update }: StepProps) {
  const countryId = useId();
  const cityId = useId();
  const professionId = useId();
  const industryId = useId();

  const situations = new Set<string>(data.situation_tags);

  function toggleSituation(tag: SituationTag) {
    const next = new Set(situations);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    update({ situation_tags: SITUATION_TAGS.filter((item) => next.has(item)) });
  }

  return (
    <section>
      <StepHeader
        eyebrow="About you"
        title="Where do you read us from?"
        description={
          <>
            This lets us tell you how stories affect <em>you</em>: your commute, your city, your
            work. It stays on your account and you can change it anytime.
          </>
        }
      />

      <div className="space-y-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id={countryId} label="Country">
            <select
              id={countryId}
              value={data.country}
              onChange={(event) => {
                const next = COUNTRY_CODES.find((code) => code === event.target.value);
                if (next) update({ country: next });
              }}
              className={inputClass}
            >
              {COUNTRY_CODES.map((code) => (
                <option key={code} value={code}>
                  {COUNTRY_NAMES[code]}
                </option>
              ))}
            </select>
          </Field>

          <Field id={cityId} label="City">
            <input
              id={cityId}
              type="text"
              value={data.city}
              onChange={(event) => update({ city: event.target.value })}
              autoComplete="address-level2"
              maxLength={80}
              placeholder="e.g. Lahore"
              className={inputClass}
            />
          </Field>
        </div>

        <ul className="-mt-4 flex flex-wrap gap-2" aria-label="City suggestions">
          {CITY_SUGGESTIONS.map((city) => (
            <li key={city}>
              <Chip selected={data.city === city} onClick={() => update({ city })}>
                {city}
              </Chip>
            </li>
          ))}
        </ul>

        <div>
          <Field id={professionId} label="Profession">
            <input
              id={professionId}
              type="text"
              value={data.profession}
              onChange={(event) => update({ profession: event.target.value })}
              maxLength={80}
              placeholder="Pick one below or type your own"
              className={inputClass}
            />
          </Field>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Profession presets">
            {PROFESSION_PRESETS.map((profession) => (
              <li key={profession}>
                <Chip
                  selected={data.profession === profession}
                  onClick={() => update({ profession })}
                >
                  {profession}
                </Chip>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <Field id={industryId} label="Industry">
            <input
              id={industryId}
              type="text"
              value={data.industry}
              onChange={(event) => update({ industry: event.target.value })}
              maxLength={80}
              placeholder="Optional"
              className={inputClass}
            />
          </Field>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Industry presets">
            {INDUSTRY_PRESETS.map((industry) => (
              <li key={industry}>
                <Chip selected={data.industry === industry} onClick={() => update({ industry })}>
                  {industry}
                </Chip>
              </li>
            ))}
          </ul>
        </div>

        <fieldset className="border-t border-rule pt-8">
          <legend className={labelClass}>Which of these describe you?</legend>
          <p className="mt-1.5 font-sans text-[13px] text-ink-muted">Choose any that apply.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SITUATION_TAGS.map((tag) => (
              <Chip key={tag} selected={situations.has(tag)} onClick={() => toggleSituation(tag)}>
                {tag}
              </Chip>
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  );
}
