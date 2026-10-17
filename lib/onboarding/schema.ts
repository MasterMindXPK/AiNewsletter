import { z } from "zod";
import {
  COUNTRY_CODES,
  LANGUAGE_CODES,
  MAX_KEYWORDS,
  MIN_TOPICS,
  READING_DEPTHS,
  SITUATION_TAGS,
  TOPIC_KEYS,
} from "./topics";

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const onboardingSchema = z.object({
  name: z.string().trim().max(60, "Use 60 characters or fewer."),
  topics: z
    .array(z.enum(TOPIC_KEYS))
    .min(MIN_TOPICS, `Pick at least ${MIN_TOPICS} topics.`)
    .max(TOPIC_KEYS.length),
  keywords: z
    .array(z.string().trim().min(1).max(40, "Keep each keyword under 40 characters."))
    .max(MAX_KEYWORDS, `Add up to ${MAX_KEYWORDS} keywords.`),
  country: z.enum(COUNTRY_CODES),
  city: z.string().trim().max(80, "Use 80 characters or fewer."),
  timezone: z.string().refine(isValidTimeZone, "Unknown timezone."),
  profession: z.string().trim().max(80, "Use 80 characters or fewer."),
  industry: z.string().trim().max(80, "Use 80 characters or fewer."),
  situation_tags: z.array(z.enum(SITUATION_TAGS)).max(SITUATION_TAGS.length),
  reading_depth: z.enum(READING_DEPTHS),
  delivery_hour: z.number().int().min(0).max(23),
  languages: z.array(z.enum(LANGUAGE_CODES)).min(1, "Choose at least one language."),
});

export type OnboardingPayload = z.infer<typeof onboardingSchema>;

export function toFormErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
