import "./load-env";
import { existsSync } from "node:fs";
import path from "node:path";
import { formatStats, runIngest } from "@/lib/ingest/run";

/**
 * The daily job: ingest, then enrich (M4), then build every user's edition (M5).
 *
 * Later modules plug in by exporting these functions; until the file exists the step is skipped:
 *   lib/enrich/enrich.ts   -> export async function enrichPendingArticles(): Promise<unknown>
 *   lib/edition/build.ts   -> export async function buildAllEditions(): Promise<unknown>
 */

interface EnrichModule {
  enrichPendingArticles?: () => Promise<unknown>;
}
interface BuildModule {
  buildAllEditions?: () => Promise<unknown>;
}

/**
 * Loads a project module (path relative to the project root, no extension) that may not be
 * built yet. Returns null only when the file does not exist; errors inside an existing module
 * still surface so real bugs are never hidden.
 */
async function optionalModule<T extends object>(relativePath: string): Promise<T | null> {
  const candidates = [".ts", ".tsx", ".js", "/index.ts"].map((suffix) =>
    path.join(process.cwd(), relativePath + suffix),
  );
  if (!candidates.some((file) => existsSync(file))) return null;
  const specifier = `@/${relativePath}`;
  return (await import(specifier)) as T;
}

function seconds(startedAt: number): string {
  return `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
}

async function main(): Promise<number> {
  const startedAt = Date.now();
  let failures = 0;

  // 1. Ingest (required: nothing downstream works without articles)
  let t = Date.now();
  console.log("[daily] 1/3 ingest");
  const stats = await runIngest({ log: (message) => console.log(`[ingest] ${message}`) });
  console.log(`${formatStats(stats)}\n[daily] ingest done in ${seconds(t)}\n`);

  // 2. Enrich with the LLM (M4)
  t = Date.now();
  console.log("[daily] 2/3 enrich");
  try {
    const mod = await optionalModule<EnrichModule>("lib/enrich/enrich");
    if (mod?.enrichPendingArticles) {
      await mod.enrichPendingArticles();
      console.log(`[daily] enrich done in ${seconds(t)}\n`);
    } else {
      console.log("[daily] enrich skipped (M4 not built yet)\n");
    }
  } catch (error) {
    failures++;
    console.error("[daily] enrich failed, continuing:", error);
  }

  // 3. Build editions (M5)
  t = Date.now();
  console.log("[daily] 3/3 build editions");
  try {
    const mod = await optionalModule<BuildModule>("lib/edition/build");
    if (mod?.buildAllEditions) {
      await mod.buildAllEditions();
      console.log(`[daily] editions done in ${seconds(t)}\n`);
    } else {
      console.log("[daily] edition build skipped (M5 not built yet)\n");
    }
  } catch (error) {
    failures++;
    console.error("[daily] edition build failed:", error);
  }

  console.log(`[daily] finished in ${seconds(startedAt)} with ${failures} failed step(s)`);
  return failures === 0 ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error("[daily] failed:", error);
    process.exit(1);
  });
