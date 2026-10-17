import assert from "node:assert/strict";
import { parseEnrichmentBatch } from "../lib/llm/schemas";
import { firstSentences, ruleBasedEnrichment, stripHtml, type PendingArticle } from "../lib/enrich/fallback";

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

const good = {
  id: "a1",
  summary: "The State Bank of Pakistan held its policy rate steady. Analysts had expected a cut.",
  topics: ["economy", "business"],
  entities: [{ name: "State Bank of Pakistan", type: "org" }],
  region_tags: ["PK"],
  importance: 0.7,
};

console.log("parseEnrichmentBatch");
test("accepts a valid array", () => {
  const { items, rejected } = parseEnrichmentBatch([good]);
  assert.equal(items.length, 1);
  assert.equal(rejected, 0);
});
test("accepts a wrapper object", () => {
  assert.equal(parseEnrichmentBatch({ articles: [good] }).items.length, 1);
});
test("garbage never produces items", () => {
  for (const junk of [null, "text", 42, {}, [null, 1, "x"], [{}]]) {
    assert.equal(parseEnrichmentBatch(junk).items.length, 0);
  }
});
test("drops invalid topics, keeps valid, caps at 3", () => {
  const { items } = parseEnrichmentBatch([
    { ...good, topics: ["economy", "finance-gossip", "tech", "world", "health"] },
  ]);
  assert.deepEqual(items[0].topics, ["economy", "technology", "world"]);
});
test("maps entity type aliases and drops unknown types", () => {
  const { items } = parseEnrichmentBatch([
    { ...good, entities: [
      { name: "Dawn", type: "Company" },
      { name: "Karachi", type: "city" },
      { name: "Thing", type: "banana" },
      { name: "dawn", type: "org" },
    ] },
  ]);
  assert.deepEqual(items[0].entities, [
    { name: "Dawn", type: "org" },
    { name: "Karachi", type: "place" },
  ]);
});
test("caps entities at 8", () => {
  const entities = Array.from({ length: 12 }, (_, i) => ({ name: `Entity ${i}`, type: "org" }));
  assert.equal(parseEnrichmentBatch([{ ...good, entities }]).items[0].entities.length, 8);
});
test("rescales 0-100 importance, rejects nonsense", () => {
  assert.equal(parseEnrichmentBatch([{ ...good, importance: 85 }]).items[0].importance, 0.85);
  assert.equal(parseEnrichmentBatch([{ ...good, importance: 500 }]).items.length, 0);
  assert.equal(parseEnrichmentBatch([{ ...good, importance: "high" }]).items.length, 0);
});
test("normalises region tags", () => {
  const { items } = parseEnrichmentBatch([{ ...good, region_tags: ["pk", "UK", "Global", "Pakistan", "123"] }]);
  assert.deepEqual(items[0].region_tags, ["PK", "GB", "global"]);
});
test("rejects missing/short summary and duplicate ids; numeric ids coerced", () => {
  const r = parseEnrichmentBatch([{ ...good, summary: "" }, { ...good, summary: "too short" }, good, good, { ...good, id: 7 }]);
  assert.equal(r.items.length, 2);
  assert.equal(r.rejected, 3);
  assert.equal(r.items[1].id, "7");
});

console.log("fallback");
const base: PendingArticle = {
  id: "f1", title: "Fuel prices rise again across Pakistan", source_name: "Dawn", source_domain: "dawn.com",
  published_at: new Date().toISOString(),
  text: "<p>Petrol prices rose by Rs5 per litre on Friday. The government cited global crude trends. Officials said a review is due.</p>",
  topics: ["energy", "economy"], region_tags: ["PK"], reliability: 0.9, cluster_size: 1,
};
test("summary is the first two sentences, HTML stripped", () => {
  assert.equal(
    ruleBasedEnrichment(base).summary,
    "Petrol prices rose by Rs5 per litre on Friday. The government cited global crude trends.",
  );
});
test("keeps rule-based topics/regions, no entities", () => {
  const e = ruleBasedEnrichment(base);
  assert.deepEqual(e.topics, ["energy", "economy"]);
  assert.deepEqual(e.region_tags, ["PK"]);
  assert.deepEqual(e.entities, []);
});
test("empty text falls back to headline; empty tags get defaults", () => {
  const e = ruleBasedEnrichment({ ...base, text: "", topics: [], region_tags: [] });
  assert.equal(e.summary, base.title);
  assert.deepEqual(e.topics, ["world"]);
  assert.deepEqual(e.region_tags, ["global"]);
});
test("importance rises with reliability and coverage, capped at 0.7", () => {
  const low = ruleBasedEnrichment({ ...base, reliability: 0.2 }).importance;
  const high = ruleBasedEnrichment({ ...base, reliability: 0.9 }).importance;
  const covered = ruleBasedEnrichment({ ...base, reliability: 0.9, cluster_size: 6 }).importance;
  assert.ok(low < high && high < covered);
  assert.ok(covered <= 0.7);
});
test("fallback output always satisfies the strict schema", () => {
  const { items } = parseEnrichmentBatch([ruleBasedEnrichment(base), ruleBasedEnrichment({ ...base, id: "f2", text: "", title: "Short headline here" })]);
  assert.equal(items.length, 2);
});
test("helpers", () => {
  assert.equal(stripHtml("<b>Hi</b>&nbsp;&amp; bye"), "Hi & bye");
  assert.ok(firstSentences("A".repeat(500)).length <= 321);
});

console.log(`\n${passed} passed${process.exitCode ? ", with failures" : ""}`);
