import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { mockArticles } from "./mock/articles";

const globalForDb = globalThis as unknown as { __orbitDb?: Database.Database };

function getStorageDirectory(): string {
  // If running in a serverless environment (e.g. Vercel, AWS Lambda),
  // process.cwd() is strictly read-only. We must write to os.tmpdir() (/tmp).
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpData = path.join(os.tmpdir(), "orbit-data");
    fs.mkdirSync(tmpData, { recursive: true });
    return tmpData;
  }

  // Local development: use data/ in project root, fallback to tmp if read-only
  try {
    const localData = path.join(process.cwd(), "data");
    fs.mkdirSync(localData, { recursive: true });
    return localData;
  } catch {
    const tmpData = path.join(os.tmpdir(), "orbit-data");
    fs.mkdirSync(tmpData, { recursive: true });
    return tmpData;
  }
}

function autoSeedIfEmpty(database: Database.Database) {
  try {
    // 1. Seed articles pool if empty
    const articleCount = (
      database.prepare("SELECT COUNT(*) as count FROM articles").get() as { count: number }
    )?.count ?? 0;

    if (articleCount === 0 && mockArticles && mockArticles.length > 0) {
      const insertArt = database.prepare(`
        INSERT OR IGNORE INTO articles (
          id, url, canonical_url, title, source_name, source_domain, published_at,
          summary, topics, entities, region_tags, importance, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const art of mockArticles) {
        insertArt.run(
          art.id,
          art.url,
          art.canonical_url,
          art.title,
          art.source_name,
          art.source_domain,
          art.published_at,
          art.summary,
          JSON.stringify(art.topics),
          JSON.stringify(art.entities),
          JSON.stringify(art.region_tags),
          art.importance,
          art.created_at
        );
      }
    }

    // 2. Seed default demo user if not exists
    const demoEmail = "demo@yourorbit.news";
    const user = database
      .prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE")
      .get(demoEmail) as { id: string } | undefined;

    if (!user) {
      const demoId = "demo-user-nascon26";
      const passwordHash = bcrypt.hashSync("demo123", 10);
      const now = new Date().toISOString();

      database.prepare(`
        INSERT OR IGNORE INTO users (id, email, password_hash, created_at)
        VALUES (?, ?, ?, ?)
      `).run(demoId, demoEmail, passwordHash, now);

      database.prepare(`
        INSERT OR IGNORE INTO profiles (
          id, name, country, city, timezone, profession, industry,
          situation_tags, languages, delivery_hour, reading_depth, created_at
        ) VALUES (
          ?, 'Adeen Malik', 'PK', 'Islamabad', 'Asia/Karachi',
          'Software Engineer', 'Technology & Clean Energy',
          '["commutes by car","small business owner","tech investor"]',
          '["en","ur"]', 6, 'standard', ?
        )
      `).run(demoId, now);

      // Seed calibrated interest weights
      const insertWeight = database.prepare(`
        INSERT OR IGNORE INTO interest_weights (user_id, key, kind, weight, source, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertWeight.run(demoId, "technology", "topic", 0.92, "learned", now);
      insertWeight.run(demoId, "energy", "topic", 0.85, "learned", now);
      insertWeight.run(demoId, "economy", "topic", 0.72, "onboarding", now);
      insertWeight.run(demoId, "business", "topic", 0.65, "onboarding", now);
      insertWeight.run(demoId, "world", "topic", 0.58, "onboarding", now);
      insertWeight.run(demoId, "environment", "topic", 0.52, "learned", now);
      insertWeight.run(demoId, "sports", "topic", 0.12, "learned", now);
      insertWeight.run(demoId, "State Bank of Pakistan", "entity", 0.68, "learned", now);
      insertWeight.run(demoId, "Artificial Intelligence", "keyword", 0.88, "learned", now);

      // Seed saved bookmark articles
      const articleSample = database
        .prepare("SELECT id FROM articles LIMIT 4")
        .all() as { id: string }[];

      const saveStmt = database.prepare(`
        INSERT OR IGNORE INTO saved_articles (user_id, article_id, created_at)
        VALUES (?, ?, ?)
      `);
      for (const a of articleSample) {
        saveStmt.run(demoId, a.id, now);
      }

      // Seed today's edition
      const todayStr = new Date().toISOString().slice(0, 10);
      const editionItems = articleSample.map((a, idx) => ({
        article_id: a.id,
        section: idx === 0 ? "Front Page" : "Your World",
        position: idx + 1,
        size: idx === 0 ? "lead" : "standard",
        score: 0.85 - idx * 0.05,
        why_shown: "Because you follow technology and live in Islamabad",
        impact_note:
          idx === 0
            ? "Because you commute by car in Islamabad, regional energy and infrastructure adjustments may influence your monthly transit expenditure."
            : undefined,
      }));

      database.prepare(`
        INSERT OR IGNORE INTO editions (id, user_id, edition_date, headline_of_the_day, items, connections, generated_at)
        VALUES (?, ?, ?, 'Clean Energy and Technological Transition Lead the Morning Agenda', ?, '[]', ?)
      `).run(
        "demo-edition-today",
        demoId,
        todayStr,
        JSON.stringify(editionItems),
        now
      );

      // Seed yesterday's edition for archive
      const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      database.prepare(`
        INSERT OR IGNORE INTO editions (id, user_id, edition_date, headline_of_the_day, items, connections, generated_at)
        VALUES (?, ?, ?, 'State Bank Holds Policy Rate as Regional Trade Expands', ?, '[]', ?)
      `).run(
        "demo-edition-yesterday",
        demoId,
        yesterdayStr,
        JSON.stringify(editionItems),
        now
      );
    }
  } catch (err) {
    console.error("[db] autoSeed error (non-fatal):", err);
  }
}

function openDatabase(): Database.Database {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const dataDir = getStorageDirectory();

  const database = new Database(path.join(dataDir, "orbit.db"));

  // Use DELETE journal mode in serverless (/tmp) to avoid POSIX shared memory deadlocks
  if (isServerless) {
    database.pragma("journal_mode = DELETE");
  } else {
    database.pragma("journal_mode = WAL");
  }
  database.pragma("foreign_keys = ON");

  // Apply schema
  const schemaPath = path.join(process.cwd(), "lib", "schema.sql");
  if (fs.existsSync(schemaPath)) {
    database.exec(fs.readFileSync(schemaPath, "utf8"));
  }

  // Ensure demo user & articles exist so instant demo login works seamlessly
  autoSeedIfEmpty(database);

  return database;
}

/** Opens orbit.db once per process and applies lib/schema.sql. */
export function getDb(): Database.Database {
  if (!globalForDb.__orbitDb) {
    globalForDb.__orbitDb = openDatabase();
  }
  return globalForDb.__orbitDb;
}
