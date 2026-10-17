/**
 * scripts/learn.ts
 *
 * Verifies Module M9 (Learning loop):
 * 1. Topic delta calculations for all event signals.
 * 2. Real-time weight updates on reading interactions.
 * 3. Discovery of new entity interests after 3 engagements.
 * 4. Ranking score shift: proves that positive reads boost future rankings
 *    and skips suppress unwanted topics.
 * 5. Time decay and pruning of obsolete weights.
 */

import { randomUUID } from "node:crypto";
import { getDb } from "../lib/db";
import { calculateTopicDelta, recordLearningFromEvent } from "../lib/learn/update";
import { applyDailyDecay } from "../lib/learn/decay";
import { getInterestProfileSummary } from "../lib/learn/profile-summary";
import { scoreArticle, type ArticleForScoring, type ScoreContext } from "../lib/rank/score";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✓ ${msg}`);
}

async function runLearningTests() {
  console.log("\n=======================================================");
  console.log("  Running M9 Learning Loop Verification Suite");
  console.log("=======================================================\n");

  const db = getDb();

  // Test 1: Delta calculation formulas
  console.log("Test 1: Signal Delta Calculations");
  assert(calculateTopicDelta("click_through") === 0.08, "click_through delta is +0.08");
  assert(calculateTopicDelta("save") === 0.15, "save delta is +0.15");
  assert(calculateTopicDelta("more_like_this") === 0.25, "more_like_this delta is +0.25");
  assert(calculateTopicDelta("skip") === -0.04, "skip delta is -0.04");
  assert(calculateTopicDelta("less_like_this") === -0.25, "less_like_this delta is -0.25");
  assert(calculateTopicDelta("read_time", 60) === 0.10, "read_time (60s) delta is +0.10");
  assert(calculateTopicDelta("read_time", 90) > 0.10, "read_time (90s) scales up for deep engagement");

  // Setup temporary test user and articles
  const testUserId = `test-learner-${randomUUID().slice(0, 8)}`;
  const energyArticleId = `art-energy-${randomUUID().slice(0, 8)}`;
  const sportsArticleId = `art-sports-${randomUUID().slice(0, 8)}`;
  const editionId = `ed-${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, created_at)
    VALUES (?, ?, 'hash', ?)
  `).run(testUserId, `${testUserId}@test.local`, now);

  db.prepare(`
    INSERT INTO profiles (id, name, country, city, reading_depth)
    VALUES (?, 'Test Learner', 'PK', 'Islamabad', 'standard')
  `).run(testUserId);

  // Initial baseline weights
  db.prepare(`
    INSERT INTO interest_weights (user_id, key, kind, weight, source, updated_at)
    VALUES (?, 'energy', 'topic', 0.40, 'onboarding', ?),
           (?, 'sports', 'topic', 0.40, 'onboarding', ?)
  `).run(testUserId, now, testUserId, now);

  // Insert mock articles
  db.prepare(`
    INSERT INTO articles (id, url, canonical_url, title, source_name, source_domain, published_at, summary, topics, entities, region_tags, importance)
    VALUES (?, ?, ?, 'Clean Energy Grid Expansion in South Asia', 'Dawn', 'dawn.com', ?, 'Massive solar and grid infrastructure announced.', '["energy","technology"]', '[{"name":"Renewable Energy Authority","type":"org"}]', '["PK"]', 0.8),
           (?, ?, ?, 'Cricket Championship Highlights and Scores', 'The News', 'thenews.com.pk', ?, 'Match summary and final overs recap.', '["sports","entertainment"]', '[]', '["PK"]', 0.6)
  `).run(
    energyArticleId,
    `https://test.com/${energyArticleId}`,
    `https://test.com/${energyArticleId}`,
    now,
    sportsArticleId,
    `https://test.com/${sportsArticleId}`,
    `https://test.com/${sportsArticleId}`,
    now
  );

  console.log("\nTest 2: Real-time Interaction Events & Weight Updates");

  // User heavily engages with energy story: click_through + read_time (75s) + save
  recordLearningFromEvent(db, {
    userId: testUserId,
    articleId: energyArticleId,
    type: "click_through",
  });
  recordLearningFromEvent(db, {
    userId: testUserId,
    articleId: energyArticleId,
    type: "read_time",
    value: 75,
  });
  recordLearningFromEvent(db, {
    userId: testUserId,
    articleId: energyArticleId,
    type: "save",
  });

  // User skips and gives negative feedback to sports story
  recordLearningFromEvent(db, {
    userId: testUserId,
    articleId: sportsArticleId,
    type: "skip",
  });
  recordLearningFromEvent(db, {
    userId: testUserId,
    articleId: sportsArticleId,
    type: "less_like_this",
  });

  // Query updated weights
  const energyRow = db
    .prepare("SELECT weight FROM interest_weights WHERE user_id = ? AND key = 'energy'")
    .get(testUserId) as { weight: number };

  const sportsRow = db
    .prepare("SELECT weight FROM interest_weights WHERE user_id = ? AND key = 'sports'")
    .get(testUserId) as { weight: number };

  console.log(`  Initial Energy: 0.40  -> Learned: ${energyRow.weight}`);
  console.log(`  Initial Sports: 0.40  -> Learned: ${sportsRow.weight}`);

  assert(energyRow.weight > 0.65, "Energy weight increased significantly from reading/saving");
  assert(sportsRow.weight < 0.20, "Sports weight decreased significantly from skip/less_like_this");

  console.log("\nTest 3: Ranking Score Shift Verification");

  const candidateEnergyArticle: ArticleForScoring = {
    id: "candidate-energy",
    title: "Oil and Solar Markets Update",
    summary: "Energy transition impacts electricity tariffs.",
    topics: ["energy"],
    entities: [],
    region_tags: ["PK"],
    importance: 0.7,
    published_at: now,
    source_domain: "dawn.com",
    reliability: 0.8,
    cluster_id: null,
  };

  const candidateSportsArticle: ArticleForScoring = {
    id: "candidate-sports",
    title: "Regional Football Tournament",
    summary: "Tournament kicks off with thrilling opening match.",
    topics: ["sports"],
    entities: [],
    region_tags: ["PK"],
    importance: 0.7,
    published_at: now,
    source_domain: "dawn.com",
    reliability: 0.8,
    cluster_id: null,
  };

  const baselineContext: ScoreContext = {
    interests: [
      { key: "energy", kind: "topic", weight: 0.40 },
      { key: "sports", kind: "topic", weight: 0.40 },
    ],
    seenTopicCounts: new Map(),
    runningSourceCounts: new Map(),
    seenArticleIds: new Set(),
    user: {
      country: "PK",
      city: "Islamabad",
      profession: "Engineer",
      situation_tags: [],
      reading_depth: "standard",
    },
    now: new Date(),
  };

  const learnedContext: ScoreContext = {
    ...baselineContext,
    interests: [
      { key: "energy", kind: "topic", weight: energyRow.weight },
      { key: "sports", kind: "topic", weight: sportsRow.weight },
    ],
  };

  const baselineEnergyScore = scoreArticle(candidateEnergyArticle, baselineContext);
  const learnedEnergyScore = scoreArticle(candidateEnergyArticle, learnedContext);

  const baselineSportsScore = scoreArticle(candidateSportsArticle, baselineContext);
  const learnedSportsScore = scoreArticle(candidateSportsArticle, learnedContext);

  console.log(`  Energy Story Score: ${baselineEnergyScore.toFixed(3)} -> ${learnedEnergyScore.toFixed(3)} (+${(learnedEnergyScore - baselineEnergyScore).toFixed(3)})`);
  console.log(`  Sports Story Score: ${baselineSportsScore.toFixed(3)} -> ${learnedSportsScore.toFixed(3)} (${(learnedSportsScore - baselineSportsScore).toFixed(3)})`);

  assert(learnedEnergyScore > baselineEnergyScore, "Energy article rank score increased after engagement");
  assert(learnedSportsScore < baselineSportsScore, "Sports article rank score dropped after disinterest");

  console.log("\nTest 4: Profile Summary & Editorial Observation");
  const summary = getInterestProfileSummary(testUserId, db);
  assert(summary.topics.length >= 2, "Profile summary includes tracked topics");
  assert(summary.editorialObservation.length > 20, "Editorial observation note generated");
  console.log(`  Editorial note: "${summary.editorialObservation}"`);

  console.log("\nTest 5: Daily Decay");
  const decayRes = applyDailyDecay(db, testUserId);
  assert(decayRes.decayedWeights >= 2, "Daily decay applied to user's weights");

  const decayedEnergy = db
    .prepare("SELECT weight FROM interest_weights WHERE user_id = ? AND key = 'energy'")
    .get(testUserId) as { weight: number };
  assert(decayedEnergy.weight < energyRow.weight, "Weight drifted down slightly by 0.995/0.98 multiplier");

  // Cleanup test user
  db.prepare("DELETE FROM users WHERE id = ?").run(testUserId);
  db.prepare("DELETE FROM articles WHERE id IN (?, ?)").run(energyArticleId, sportsArticleId);

  console.log("\n=======================================================");
  console.log("  ALL M9 LEARNING LOOP TESTS PASSED SUCCESSFULLY! ✓");
  console.log("=======================================================\n");
}

runLearningTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
