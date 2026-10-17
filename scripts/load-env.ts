// Loads .env.local / .env the same way Next.js does. Import this FIRST in every script,
// before anything that reads process.env.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
