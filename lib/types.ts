export type Topic =
  | "world" | "politics" | "business" | "economy" | "energy" | "technology"
  | "science" | "health" | "sports" | "entertainment" | "culture"
  | "education" | "environment" | "crime" | "lifestyle" | "travel" | "opinion";

export interface UserProfile {
  id: string;
  name: string;
  country: string;           // ISO code, e.g. "PK"
  city: string;              // e.g. "Islamabad"
  timezone: string;          // IANA, e.g. "Asia/Karachi"
  profession: string;        // free text or preset
  industry?: string;
  situation_tags: string[];  // e.g. ["commutes by car","small business owner","student","renter"]
  languages: string[];
  delivery_hour: number;     // 0-23 local time, default 6
  reading_depth: "brief" | "standard" | "deep";
  created_at: string;
}

export interface InterestWeight {
  user_id: string;
  key: string;               // topic or custom keyword/entity, e.g. "energy", "Tesla"
  kind: "topic" | "keyword" | "entity";
  weight: number;            // 0..1
  source: "onboarding" | "learned";
  updated_at: string;
}

export interface Article {
  id: string;
  url: string;
  canonical_url: string;
  title: string;
  source_name: string;
  source_domain: string;
  author?: string;
  published_at: string;
  image_url?: string;
  raw_text?: string;
  summary: string;           // LLM, 2-3 sentences
  topics: Topic[];
  entities: { name: string; type: "org" | "person" | "place" | "commodity" | "currency" | "event" }[];
  region_tags: string[];     // e.g. ["PK","global"]
  importance: number;        // 0..1, global importance estimate
  cluster_id?: string;       // same-story dedupe cluster
  created_at: string;
}

export interface EditionItem {
  article_id: string;
  section: string;           // "Front Page","Your World","Business", etc.
  position: number;
  size: "lead" | "major" | "standard" | "brief";
  score: number;
  why_shown: string;         // one line: "Because you follow energy"
  impact_note?: string;      // M11
}

export interface StoryConnection {
  id: string;
  title: string;             // "Why oil prices matter at your pump"
  article_ids: string[];
  chain: { step: string; article_id?: string }[];  // ordered causal chain
  explanation: string;
}

export interface Edition {
  id: string;
  user_id: string;
  edition_date: string;      // YYYY-MM-DD in user's timezone
  headline_of_the_day: string;
  items: EditionItem[];
  connections: StoryConnection[];
  pdf_url?: string;
  generated_at: string;
}

export type EventType =
  | "open" | "click_through" | "read_time" | "skip" | "save"
  | "more_like_this" | "less_like_this" | "hide_topic" | "hide_source";

export interface InteractionEvent {
  id: string;
  user_id: string;
  article_id: string;
  edition_id: string;
  type: EventType;
  value?: number;            // e.g. seconds for read_time
  created_at: string;
}
