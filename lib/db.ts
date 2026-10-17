import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const globalForDb = globalThis as unknown as { __orbitDb?: Database.Database };

function openDatabase(): Database.Database {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const database = new Database(path.join(dataDir, "orbit.db"));
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec(
    fs.readFileSync(path.join(process.cwd(), "lib", "schema.sql"), "utf8"),
  );
  return database;
}

/** Opens data/orbit.db once per process and applies lib/schema.sql. */
export function getDb(): Database.Database {
  if (!globalForDb.__orbitDb) {
    globalForDb.__orbitDb = openDatabase();
  }
  return globalForDb.__orbitDb;
}
