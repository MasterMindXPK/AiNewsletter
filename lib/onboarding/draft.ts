import { z } from "zod";
import { onboardingSchema, type OnboardingPayload } from "./schema";
import { CITY_SUGGESTIONS, MAX_KEYWORDS, TOPIC_KEYS, isCountryCode } from "./topics";

export type OnboardingDraftData = OnboardingPayload;

export const STEP_LABELS = [
  "Welcome",
  "Topics",
  "Go deeper",
  "About you",
  "Reading style",
  "Preview",
] as const;

export const LAST_STEP = STEP_LABELS.length - 1;
export const DRAFT_STORAGE_KEY = "orbit:onboarding-draft:v1";

export const DEFAULT_DRAFT_DATA: OnboardingDraftData = {
  name: "",
  topics: [],
  keywords: [],
  country: "PK",
  city: "",
  timezone: "Asia/Karachi",
  profession: "",
  industry: "",
  situation_tags: [],
  reading_depth: "standard",
  delivery_hour: 6,
  languages: ["en"],
};

const shape = onboardingSchema.shape;
const defaults = DEFAULT_DRAFT_DATA;

// Every field falls back to its default so a stale or hand-edited draft can never break the flow.
const storedDraftSchema = z.object({
  step: z.number().int().min(0).max(LAST_STEP).catch(0),
  data: z
    .object({
      name: shape.name.catch(defaults.name),
      topics: z.array(z.enum(TOPIC_KEYS)).catch(defaults.topics),
      keywords: shape.keywords.catch(defaults.keywords),
      country: shape.country.catch(defaults.country),
      city: shape.city.catch(defaults.city),
      timezone: shape.timezone.catch(defaults.timezone),
      profession: shape.profession.catch(defaults.profession),
      industry: shape.industry.catch(defaults.industry),
      situation_tags: shape.situation_tags.catch(defaults.situation_tags),
      reading_depth: shape.reading_depth.catch(defaults.reading_depth),
      delivery_hour: shape.delivery_hour.catch(defaults.delivery_hour),
      languages: shape.languages.catch(defaults.languages),
    })
    .catch(defaults),
});

export interface StoredDraft {
  step: number;
  data: OnboardingDraftData;
}

export function parseStoredDraft(raw: string): StoredDraft | null {
  try {
    const parsed = storedDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Best-effort defaults from the browser: country from locale, timezone and city from Intl. */
export function guessLocaleDefaults(): Partial<OnboardingDraftData> {
  const guess: Partial<OnboardingDraftData> = {};

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone && onboardingSchema.shape.timezone.safeParse(timezone).success) {
      guess.timezone = timezone;
      const place = timezone.split("/").pop()?.replace(/_/g, " ").toLowerCase();
      const city = CITY_SUGGESTIONS.find((candidate) => candidate.toLowerCase() === place);
      if (city) guess.city = city;
    }
  } catch {
    // Keep the defaults when Intl is unavailable.
  }

  try {
    const region = new Intl.Locale(navigator.language).region;
    if (isCountryCode(region)) guess.country = region;
  } catch {
    // Keep the default country.
  }

  return guess;
}

/** Adds comma-separated keywords, ignoring blanks and case-insensitive duplicates, up to the limit. */
export function mergeKeywords(existing: string[], raw: string): string[] {
  const seen = new Set(existing.map((keyword) => keyword.toLowerCase()));
  const merged = [...existing];
  for (const part of raw.split(",")) {
    const keyword = part.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!keyword || seen.has(keyword.toLowerCase()) || merged.length >= MAX_KEYWORDS) continue;
    seen.add(keyword.toLowerCase());
    merged.push(keyword);
  }
  return merged;
}

export function formatHour(hour: number): string {
  const suffix = hour < 12 ? "AM" : "PM";
  return `${((hour + 11) % 12) + 1}:00 ${suffix}`;
}
