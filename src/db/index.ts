import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Lazy DB client. Requires DATABASE_URL.
 * Phase 0 only verifies wiring; queries start with Phase 1+.
 */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  }
  const client = postgres(url, { prepare: false });
  return drizzle(client, { schema });
}
