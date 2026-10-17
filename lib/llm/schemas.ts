import { z } from "zod";
import type { Topic } from "../types";

export const TOPIC_VALUES = [
  "world",
  "politics",
  "business",
  "economy",
  "energy",
  "technology",
  "science",
  "health",
  "sports",
  "entertainment",
  "culture",
  "education",
  "environment",
  "crime",
  "lifestyle",
  "travel",
  "opinion",
] as const satisfies readonly Topic[];

// Compile-time check: fails to build if a Topic is added to lib/types.ts but not here.
type MissingTopics = Exclude<Topic, (typeof TOPIC_VALUES)[number]>;
const _topicsExhaustive: [MissingTopics] extends [never] ? true : never = true;
void _topicsExhaustive;

export const ENTITY_TYPES = [
  "org",
  "person",
  "place",
  "commodity",
  "currency",
  "event",
] as const;

const entitySchema = z.object({
  name: z.string().min(2).max(80),
  type: z.enum(ENTITY_TYPES),
});

/** Strict shape that is allowed to reach the database. */
export const enrichmentSchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(20).max(900),
  topics: z.array(z.enum(TOPIC_VALUES)).max(3),
  entities: z.array(entitySchema).max(8),
  region_tags: z.array(z.string()).max(6),
  importance: z.number().min(0).max(1),
});

export type Enrichment = z.infer<typeof enrichmentSchema>;

// ---------------------------------------------------------------------------
// Lenient front door: models drift (synonyms, 0-100 scales, wrapper objects).
// We repair what is safely repairable, then validate strictly. One bad item
// never poisons the rest of the batch.
// ---------------------------------------------------------------------------

const looseItemSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  summary: z.unknown().optional(),
  topics: z.unknown().optional(),
  entities: z.unknown().optional(),
  region_tags: z.unknown().optional(),
  importance: z.unknown().optional(),
});

const TOPIC_ALIASES: Record<string, Topic> = {
  tech: "technology",
  sport: "sports",
  finance: "economy",
  markets: "business",
  "world news": "world",
  international: "world",
  climate: "environment",
};

const ENTITY_TYPE_ALIASES: Record<string, (typeof ENTITY_TYPES)[number]> = {
  organization: "org",
  organisation: "org",
  company: "org",
  institution: "org",
  location: "place",
  country: "place",
  city: "place",
  region: "place",
  people: "person",
  individual: "person",
  currency_pair: "currency",
};

const REGION_ALIASES: Record<string, string> = { UK: "GB" };

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function cleanTopics(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<string>();
  for (const t of raw) {
    if (typeof t !== "string") continue;
    const key = t.trim().toLowerCase();
    out.add(TOPIC_ALIASES[key] ?? key);
  }
  return [...out].filter((t): t is Topic =>
    (TOPIC_VALUES as readonly string[]).includes(t),
  );
}

function cleanEntities(raw: unknown): { name: string; type: string }[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: { name: string; type: string }[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const rec = e as Record<string, unknown>;
    if (typeof rec.name !== "string" || typeof rec.type !== "string") continue;
    const name = collapse(rec.name);
    const typeKey = rec.type.trim().toLowerCase();
    const type = ENTITY_TYPE_ALIASES[typeKey] ?? typeKey;
    if (name.length < 2 || name.length > 80) continue;
    if (!(ENTITY_TYPES as readonly string[]).includes(type)) continue;
    const dedupeKey = name.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push({ name, type });
  }
  return out.slice(0, 8);
}

function cleanRegions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<string>();
  for (const r of raw) {
    if (typeof r !== "string") continue;
    const v = r.trim();
    if (v.toLowerCase() === "global") {
      out.add("global");
      continue;
    }
    const upper = v.toUpperCase();
    const code = REGION_ALIASES[upper] ?? upper;
    if (/^[A-Z]{2}$/.test(code)) out.add(code);
  }
  return [...out].slice(0, 6);
}

function cleanImportance(raw: unknown): number | undefined {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return undefined;
  // Some models answer on a 0-100 scale despite the prompt.
  const scaled = n > 1 && n <= 100 ? n / 100 : n;
  if (scaled > 1) return undefined;
  return Math.round(scaled * 100) / 100;
}

function unwrapList(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object") {
    for (const v of Object.values(json)) {
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

export interface ParsedBatch {
  items: Enrichment[];
  rejected: number;
}

/** Turn arbitrary parsed JSON from the model into validated enrichments. */
export function parseEnrichmentBatch(json: unknown): ParsedBatch {
  const list = unwrapList(json);
  const items: Enrichment[] = [];
  const seenIds = new Set<string>();
  let rejected = 0;

  for (const raw of list) {
    const loose = looseItemSchema.safeParse(raw);
    if (!loose.success) {
      rejected++;
      continue;
    }
    const l = loose.data;
    const candidate = {
      id: l.id,
      summary: typeof l.summary === "string" ? collapse(l.summary) : "",
      topics: cleanTopics(l.topics).slice(0, 3),
      entities: cleanEntities(l.entities),
      region_tags: cleanRegions(l.region_tags),
      importance: cleanImportance(l.importance),
    };
    const strict = enrichmentSchema.safeParse(candidate);
    if (!strict.success || seenIds.has(strict.data.id)) {
      rejected++;
      continue;
    }
    seenIds.add(strict.data.id);
    items.push(strict.data);
  }
  return { items, rejected };
}
