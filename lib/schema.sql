-- Your Orbit local schema. Applied on startup by lib/db.ts (idempotent).
-- Arrays and objects are stored as JSON text.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  id             TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  country        TEXT NOT NULL,
  city           TEXT NOT NULL,
  timezone       TEXT NOT NULL DEFAULT 'Asia/Karachi',
  profession     TEXT NOT NULL DEFAULT '',
  industry       TEXT,
  situation_tags TEXT NOT NULL DEFAULT '[]',
  languages      TEXT NOT NULL DEFAULT '["en"]',
  delivery_hour  INTEGER NOT NULL DEFAULT 6 CHECK (delivery_hour BETWEEN 0 AND 23),
  reading_depth  TEXT NOT NULL DEFAULT 'standard' CHECK (reading_depth IN ('brief', 'standard', 'deep')),
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS interest_weights (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('topic', 'keyword', 'entity')),
  weight     REAL NOT NULL CHECK (weight BETWEEN 0 AND 1),
  source     TEXT NOT NULL CHECK (source IN ('onboarding', 'learned')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS sources (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  domain      TEXT NOT NULL,
  feed_url    TEXT NOT NULL UNIQUE,
  region      TEXT NOT NULL DEFAULT 'global',
  topics      TEXT NOT NULL DEFAULT '[]',
  reliability REAL NOT NULL DEFAULT 0.7 CHECK (reliability BETWEEN 0 AND 1),
  active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS articles (
  id            TEXT PRIMARY KEY,
  url           TEXT NOT NULL,
  canonical_url TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  source_name   TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  author        TEXT,
  published_at  TEXT NOT NULL,
  image_url     TEXT,
  raw_text      TEXT,
  summary       TEXT NOT NULL DEFAULT '',
  topics        TEXT NOT NULL DEFAULT '[]',
  entities      TEXT NOT NULL DEFAULT '[]',
  region_tags   TEXT NOT NULL DEFAULT '[]',
  importance    REAL NOT NULL DEFAULT 0.5 CHECK (importance BETWEEN 0 AND 1),
  cluster_id    TEXT,
  enrich_source TEXT,                              -- 'llm' | 'fallback' | NULL (pending)
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_cluster_id ON articles(cluster_id);

CREATE TABLE IF NOT EXISTS editions (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  edition_date        TEXT NOT NULL,
  headline_of_the_day TEXT NOT NULL DEFAULT '',
  items               TEXT NOT NULL DEFAULT '[]',
  connections         TEXT NOT NULL DEFAULT '[]',
  pdf_path            TEXT,
  generated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, edition_date)
);
CREATE INDEX IF NOT EXISTS idx_editions_user_date ON editions(user_id, edition_date DESC);

CREATE TABLE IF NOT EXISTS interaction_events (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  edition_id TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN (
    'open', 'click_through', 'read_time', 'skip', 'save',
    'more_like_this', 'less_like_this', 'hide_topic', 'hide_source'
  )),
  value      REAL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_events_user_created ON interaction_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_article ON interaction_events(article_id);

CREATE TABLE IF NOT EXISTS saved_articles (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, article_id)
);

CREATE TABLE IF NOT EXISTS impact_cache (
  article_id        TEXT NOT NULL,
  profile_signature TEXT NOT NULL,
  note_json         TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (article_id, profile_signature)
);
