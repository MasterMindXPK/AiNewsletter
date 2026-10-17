import "./load-env";
import { buildAllEditions } from "../lib/edition/build";

/**
 * npm run build-editions
 *
 * Build (or refresh) today's edition for every user that has a profile.
 * Run this manually or wire it into a cron job / npm run daily.
 */
async function main(): Promise<void> {
  await buildAllEditions({ log: (msg) => console.log(msg) });
}

main().catch((err: unknown) => {
  console.error("[build-editions] failed:", err);
  process.exitCode = 1;
});
