/**
 * scripts/seed-demo.ts
 *
 * Seeds a rich demo user for hackathon presentations:
 * - Email: demo@yourorbit.news / Password: demo123
 * - Profile: Adeen Malik, Software Engineer, Islamabad, PK
 * - Full interest profile with learned weights, discoveries, and fading trends
 * - Simulated reading interaction history
 * - Saved articles
 * - 3 historical broadsheet editions with impact notes and headline of the day
 */

import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb } from "../lib/db";
import { buildEditionForUser } from "../lib/edition/build";

async function seedDemoUser() {
  console.log("\n=======================================================");
  console.log("  Seeding Rich Demo Account for NaSCon'26 Presentation");
  console.log("=======================================================\n");

  const db = getDb();
  const demoEmail = "demo@yourorbit.news";
  const demoPassword = "demo123";

  // 1. Check or create demo user
  let userRow = db
    .prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE")
    .get(demoEmail) as { id: string } | undefined;

  let userId: string;

  if (userRow) {
    userId = userRow.id;
    console.log(`  ✓ Existing demo user found (ID: ${userId})`);
  } else {
    userId = `demo-${randomUUID().slice(0, 8)}`;
    const passwordHash = bcrypt.hashSync(demoPassword, 10);
    db.prepare(`
      INSERT INTO users (id, email, password_hash, created_at)
      VALUES (?, ?, ?, datetime('now', '-14 days'))
    `).run(userId, demoEmail, passwordHash);
    console.log(`  ✓ Created user ${demoEmail}`);
  }

  // 2. Upsert profile
  db.prepare(`
    INSERT INTO profiles (
      id, name, country, city, timezone, profession, industry,
      situation_tags, languages, delivery_hour, reading_depth, created_at
    ) VALUES (
      ?, 'Adeen Malik', 'PK', 'Islamabad', 'Asia/Karachi',
      'Software Engineer', 'Technology & Clean Energy',
      '["commutes by car","small business owner","tech investor"]',
      '["en","ur"]', 6, 'standard', datetime('now', '-14 days')
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      country = excluded.country,
      city = excluded.city,
      profession = excluded.profession,
      industry = excluded.industry,
      situation_tags = excluded.situation_tags
  `).run(userId);
  console.log("  ✓ Profile configured (Software Engineer, Islamabad, commutes by car)");

  // 3. Clear and seed realistic interest weights
  db.prepare("DELETE FROM interest_weights WHERE user_id = ?").run(userId);

  const insertWeight = db.prepare(`
    INSERT INTO interest_weights (user_id, key, kind, weight, source, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?))
  `);

  // Active topics
  insertWeight.run(userId, "technology", "topic", 0.92, "learned", "-1 hours");
  insertWeight.run(userId, "energy", "topic", 0.85, "learned", "-3 hours");
  insertWeight.run(userId, "economy", "topic", 0.72, "onboarding", "-2 days");
  insertWeight.run(userId, "business", "topic", 0.65, "onboarding", "-4 days");
  insertWeight.run(userId, "world", "topic", 0.58, "onboarding", "-7 days");
  insertWeight.run(userId, "environment", "topic", 0.52, "learned", "-2 days");
  insertWeight.run(userId, "sports", "topic", 0.12, "learned", "-1 days");
  insertWeight.run(userId, "entertainment", "topic", 0.08, "learned", "-3 days");

  // Discovered entities & keywords
  insertWeight.run(userId, "State Bank of Pakistan", "entity", 0.68, "learned", "-1 days");
  insertWeight.run(userId, "Artificial Intelligence", "keyword", 0.88, "learned", "-2 hours");
  insertWeight.run(userId, "Solar Tariff", "keyword", 0.60, "learned", "-2 days");

  console.log("  ✓ Interest weights calibrated (Tech: 92%, Energy: 85%, Sports: 12% fading)");

  // 4. Fetch available articles to seed read events & saved bookmarks
  const articles = db
    .prepare("SELECT id, title, topics FROM articles ORDER BY published_at DESC LIMIT 20")
    .all() as { id: string; title: string; topics: string }[];

  if (articles.length > 0) {
    // 5. Seed saved bookmarks
    db.prepare("DELETE FROM saved_articles WHERE user_id = ?").run(userId);
    const saveArticle = db.prepare(`
      INSERT INTO saved_articles (user_id, article_id, created_at)
      VALUES (?, ?, datetime('now', ?))
    `);

    for (let i = 0; i < Math.min(4, articles.length); i++) {
      saveArticle.run(userId, articles[i].id, `-${i * 2 + 1} days`);
    }
    console.log(`  ✓ Seeded ${Math.min(4, articles.length)} saved bookmark stories`);

    // 6. Seed interaction events
    db.prepare("DELETE FROM interaction_events WHERE user_id = ?").run(userId);
    const insertEvent = db.prepare(`
      INSERT INTO interaction_events (id, user_id, article_id, edition_id, type, value, created_at)
      VALUES (?, ?, ?, 'demo-ed', ?, ?, datetime('now', ?))
    `);

    for (let i = 0; i < Math.min(10, articles.length); i++) {
      const art = articles[i];
      insertEvent.run(randomUUID(), userId, art.id, "click_through", null, `-${i} hours`);
      insertEvent.run(randomUUID(), userId, art.id, "read_time", 75, `-${i} hours`);
      if (i % 3 === 0) {
        insertEvent.run(randomUUID(), userId, art.id, "more_like_this", null, `-${i} hours`);
      }
    }
    console.log("  ✓ Seeded realistic reading interaction events");
  }

  // 7. Generate today's edition
  console.log("  Building current broadsheet edition...");
  const todayResult = await buildEditionForUser(db, userId, {
    log: (msg) => console.log(`    ${msg}`),
  });

  if (todayResult) {
    console.log(`  ✓ Today's edition ready (${todayResult.itemCount} stories, ID: ${todayResult.editionId})`);
  }

  // 8. Create historical editions for past 2 days in archive
  const existingToday = db
    .prepare("SELECT items, headline_of_the_day FROM editions WHERE user_id = ? ORDER BY edition_date DESC LIMIT 1")
    .get(userId) as { items: string; headline_of_the_day: string } | undefined;

  if (existingToday && articles.length >= 8) {
    const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const twoDaysAgoDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const insertPastEdition = db.prepare(`
      INSERT INTO editions (id, user_id, edition_date, headline_of_the_day, items, connections, generated_at)
      VALUES (?, ?, ?, ?, ?, '[]', datetime('now', ?))
      ON CONFLICT(user_id, edition_date) DO UPDATE SET
        headline_of_the_day = excluded.headline_of_the_day
    `);

    insertPastEdition.run(
      `demo-ed-yesterday`,
      userId,
      yesterdayDate,
      "Grid Modernization and Fiscal Policy Take Center Stage Across the Region",
      existingToday.items,
      "-1 days"
    );

    insertPastEdition.run(
      `demo-ed-2daysago`,
      userId,
      twoDaysAgoDate,
      "Global Renewable Commitments Reshape Capital Flows in Emerging Markets",
      existingToday.items,
      "-2 days"
    );

    console.log(`  ✓ Historical archive populated (${yesterdayDate}, ${twoDaysAgoDate})`);
  }

  console.log("\n=======================================================");
  console.log("  DEMO ACCOUNT READY FOR DEMO / JUDGING:");
  console.log(`  Email:    ${demoEmail}`);
  console.log(`  Password: ${demoPassword}`);
  console.log("=======================================================\n");
}

seedDemoUser().catch((err) => {
  console.error("Demo seed failed:", err);
  process.exit(1);
});
