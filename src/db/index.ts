import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type PostgresClient = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as {
  ownCosmosPg?: PostgresClient;
};

function getClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  }
  if (!globalForDb.ownCosmosPg) {
    globalForDb.ownCosmosPg = postgres(url, { prepare: false });
  }
  return globalForDb.ownCosmosPg;
}

export function getDb() {
  return drizzle(getClient(), { schema });
}
