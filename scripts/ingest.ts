import "./load-env";
import { formatStats, runIngest } from "@/lib/ingest/run";

async function main(): Promise<void> {
  const stats = await runIngest({ log: (message) => console.log(`[ingest] ${message}`) });
  console.log(`\n${formatStats(stats)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("[ingest] failed:", error);
    process.exit(1);
  });
