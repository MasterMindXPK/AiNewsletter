import "./load-env";
import { enrichPendingArticles } from "../lib/enrich/enrich";

// Usage: npm run enrich -- [--limit 200] [--batch 15] [--no-llm]
function numArg(flag: string): number | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  const n = Number(process.argv[i + 1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

async function main(): Promise<void> {
  await enrichPendingArticles({
    limit: numArg("--limit"),
    batchSize: numArg("--batch"),
    useLlm: !process.argv.includes("--no-llm"),
  });
}

main().catch((err: unknown) => {
  console.error("[enrich] failed:", err);
  process.exitCode = 1;
});
