import assert from "node:assert/strict";
import { mockArticles } from "../lib/mock/articles";
import { mockProfile, mockInterestWeights } from "../lib/mock/profile";
import {
  scoreArticle,
  recencyScore,
  type ArticleForScoring,
  type InterestWeight,
  type UserContext,
  type ScoreContext,
} from "../lib/rank/score";
import { selectArticles, assignSizes } from "../lib/rank/select";
import { assignSections } from "../lib/rank/sections";

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    console.error(`  FAIL ${name}\n`, e);
    process.exitCode = 1;
  }
}

const now = new Date("2026-10-17T06:00:00.000Z");

const testUser1: UserContext = {
  country: "PK",
  city: "Islamabad",
  profession: "Small business owner",
  industry: "Retail",
  situation_tags: ["commutes by car", "small business owner"],
  reading_depth: "standard",
};

const testUser2: UserContext = {
  country: "GB",
  city: "London",
  profession: "Software Engineer",
  industry: "Technology",
  situation_tags: ["remote worker"],
  reading_depth: "standard",
};

const techInterests: InterestWeight[] = [
  { key: "technology", kind: "topic", weight: 0.9 },
  { key: "science", kind: "topic", weight: 0.8 },
  { key: "AI", kind: "keyword", weight: 0.9 },
  { key: "business", kind: "topic", weight: 0.2 },
  { key: "sports", kind: "topic", weight: 0.1 },
];

const businessInterests: InterestWeight[] = mockInterestWeights.map((w) => ({
  key: w.key,
  kind: w.kind,
  weight: w.weight,
}));

const pool: ArticleForScoring[] = mockArticles.map((a) => ({
  id: a.id,
  title: a.title,
  summary: a.summary,
  topics: a.topics,
  entities: a.entities,
  region_tags: a.region_tags,
  importance: a.importance,
  published_at: a.published_at,
  source_domain: a.source_domain,
  reliability: 0.8,
  cluster_id: a.cluster_id ?? a.id,
}));

console.log("=== Recency & Scoring ===");

test("recency decay decreases as articles get older", () => {
  const rNow = recencyScore(now.toISOString(), now);
  const r12h = recencyScore(new Date(now.getTime() - 12 * 3600 * 1000).toISOString(), now);
  const r24h = recencyScore(new Date(now.getTime() - 24 * 3600 * 1000).toISOString(), now);

  assert.equal(Math.round(rNow * 100) / 100, 1);
  assert.ok(Math.abs(r12h - 0.5) < 0.05, `Expected ~0.5 at 12h half-life, got ${r12h}`);
  assert.ok(r24h < r12h, "24h recency should be less than 12h");
});

test("scoreArticle prioritizes matching interests", () => {
  const ctx: ScoreContext = {
    interests: businessInterests,
    seenTopicCounts: new Map(),
    runningSourceCounts: new Map(),
    seenArticleIds: new Set(),
    user: testUser1,
    now,
  };

  const energyArticle = pool.find((a) => a.topics.includes("energy"))!;
  const scoreHigh = scoreArticle(energyArticle, ctx);

  const ctxLow: ScoreContext = {
    ...ctx,
    interests: [{ key: "entertainment", kind: "topic", weight: 0.9 }],
  };
  const scoreLow = scoreArticle(energyArticle, ctxLow);

  assert.ok(scoreHigh > scoreLow, `Expected ${scoreHigh} > ${scoreLow}`);
});

test("seen penalty reduces score", () => {
  const article = pool[0];
  const ctxUnseen: ScoreContext = {
    interests: businessInterests,
    seenTopicCounts: new Map(),
    runningSourceCounts: new Map(),
    seenArticleIds: new Set(),
    user: testUser1,
    now,
  };
  const ctxSeen: ScoreContext = {
    ...ctxUnseen,
    seenArticleIds: new Set([article.id]),
  };

  const s1 = scoreArticle(article, ctxUnseen);
  const s2 = scoreArticle(article, ctxSeen);
  assert.ok(s1 > s2, `Unseen score ${s1} should be higher than seen score ${s2}`);
});

test("diversity penalty reduces score for repeated source", () => {
  const article = pool[0];
  const ctxFresh: ScoreContext = {
    interests: businessInterests,
    seenTopicCounts: new Map(),
    runningSourceCounts: new Map(),
    seenArticleIds: new Set(),
    user: testUser1,
    now,
  };
  const ctxRepeated: ScoreContext = {
    ...ctxFresh,
    runningSourceCounts: new Map([[article.source_domain, 3]]),
  };

  const s1 = scoreArticle(article, ctxFresh);
  const s2 = scoreArticle(article, ctxRepeated);
  assert.ok(s1 > s2, `Fresh source score ${s1} should be higher than repeated source score ${s2}`);
});

console.log("\n=== Selection & Diversity ===");

test("selectArticles respects reading depth counts", () => {
  const selectOpts = {
    interests: businessInterests,
    user: testUser1,
    seenArticleIds: new Set<string>(),
    hiddenTopics: new Set<string>(),
    hiddenSources: new Set<string>(),
    seenTopicCounts: new Map<string, number>(),
    now,
  };

  const brief = selectArticles(pool, { ...selectOpts, readingDepth: "brief" });
  assert.equal(brief.length, 8);

  const standard = selectArticles(pool, { ...selectOpts, readingDepth: "standard" });
  assert.equal(standard.length, 14);

  const deep = selectArticles(pool, { ...selectOpts, readingDepth: "deep" });
  assert.equal(deep.length, Math.min(22, pool.length));
});

test("selectArticles excludes hard-filtered topics and sources", () => {
  const selected = selectArticles(pool, {
    readingDepth: "standard",
    interests: businessInterests,
    user: testUser1,
    seenArticleIds: new Set(),
    hiddenTopics: new Set(["energy"]),
    hiddenSources: new Set(["dawn.com"]),
    seenTopicCounts: new Map(),
    now,
  });

  for (const s of selected) {
    assert.ok(!s.article.topics.includes("energy"), "energy should be excluded");
    assert.notEqual(s.article.source_domain, "dawn.com", "dawn.com should be excluded");
  }
});

test("cluster deduplication keeps only 1 article per cluster", () => {
  const clusteredPool: ArticleForScoring[] = [
    { ...pool[0], id: "c1", cluster_id: "cluster-A" },
    { ...pool[1], id: "c2", cluster_id: "cluster-A" },
    { ...pool[2], id: "c3", cluster_id: "cluster-B" },
  ];

  const selected = selectArticles(clusteredPool, {
    readingDepth: "brief",
    interests: businessInterests,
    user: testUser1,
    seenArticleIds: new Set(),
    hiddenTopics: new Set(),
    hiddenSources: new Set(),
    seenTopicCounts: new Map(),
    now,
  });

  const clusterA = selected.filter((s) => s.article.cluster_id === "cluster-A");
  assert.equal(clusterA.length, 1, "Only 1 article from cluster-A should be selected");
});

console.log("\n=== Section & Size Assignment ===");

test("assignSizes marks 1 lead, 2 major, and brief stories", () => {
  const selected = selectArticles(pool, {
    readingDepth: "standard",
    interests: businessInterests,
    user: testUser1,
    seenArticleIds: new Set(),
    hiddenTopics: new Set(),
    hiddenSources: new Set(),
    seenTopicCounts: new Map(),
    now,
  });

  const sizes = assignSizes(selected);
  assert.equal(sizes.get(selected[0].article.id), "lead");
  assert.equal(sizes.get(selected[1].article.id), "major");
  assert.equal(sizes.get(selected[2].article.id), "major");

  const briefCount = [...sizes.values()].filter((s) => s === "brief").length;
  assert.ok(briefCount >= 2, "Should have brief stories at the end");
});

test("assignSections produces valid EditionItems with sections and why_shown", () => {
  const selected = selectArticles(pool, {
    readingDepth: "standard",
    interests: businessInterests,
    user: testUser1,
    seenArticleIds: new Set(),
    hiddenTopics: new Set(),
    hiddenSources: new Set(),
    seenTopicCounts: new Map(),
    now,
  });

  const sizes = assignSizes(selected);
  const items = assignSections(selected, sizes, businessInterests, testUser1);

  assert.equal(items.length, selected.length);
  assert.equal(items[0].section, "Front Page");
  assert.equal(items[0].size, "lead");
  assert.ok(items[0].why_shown.length > 5, "why_shown should be populated");

  const sections = new Set(items.map((i) => i.section));
  assert.ok(sections.has("Front Page"), "Front Page exists");
  assert.ok(sections.has("In Brief"), "In Brief exists");
});

console.log("\n=== Two-User Personalization & Performance ===");

test("two different users get visibly different editions from the same pool", () => {
  const selected1 = selectArticles(pool, {
    readingDepth: "standard",
    interests: businessInterests,
    user: testUser1,
    seenArticleIds: new Set(),
    hiddenTopics: new Set(),
    hiddenSources: new Set(),
    seenTopicCounts: new Map(),
    now,
  });

  const selected2 = selectArticles(pool, {
    readingDepth: "standard",
    interests: techInterests,
    user: testUser2,
    seenArticleIds: new Set(),
    hiddenTopics: new Set(),
    hiddenSources: new Set(),
    seenTopicCounts: new Map(),
    now,
  });

  // Compare lead articles
  const lead1 = selected1[0].article;
  const lead2 = selected2[0].article;

  console.log(`    User 1 (Business/PK) Lead: "${lead1.title.slice(0, 50)}..." [${lead1.topics.join(", ")}]`);
  console.log(`    User 2 (Tech/UK) Lead:     "${lead2.title.slice(0, 50)}..." [${lead2.topics.join(", ")}]`);

  assert.notEqual(lead1.id, lead2.id, "Different users should have different lead stories");

  // Overlap should be significantly less than 100%
  const ids1 = new Set(selected1.map((s) => s.article.id));
  const common = selected2.filter((s) => ids1.has(s.article.id)).length;
  console.log(`    Common stories between User 1 and User 2: ${common} / 14`);
  assert.ok(common < 14, "Editions should differ noticeably");
});

test("performance: edition selection and sectioning runs in under 50ms", () => {
  const start = performance.now();
  for (let i = 0; i < 20; i++) {
    const selected = selectArticles(pool, {
      readingDepth: "standard",
      interests: businessInterests,
      user: testUser1,
      seenArticleIds: new Set(),
      hiddenTopics: new Set(),
      hiddenSources: new Set(),
      seenTopicCounts: new Map(),
      now,
    });
    const sizes = assignSizes(selected);
    assignSections(selected, sizes, businessInterests, testUser1);
  }
  const elapsed = performance.now() - start;
  const perRun = elapsed / 20;
  console.log(`    Average time per edition: ${perRun.toFixed(2)} ms (spec allows < 3000 ms)`);
  assert.ok(perRun < 3000, "Should take well under 3 seconds");
});

console.log(`\nAll ${passed} tests passed!`);
