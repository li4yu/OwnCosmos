/**
 * Create or update a local Better Auth test user.
 *
 * Usage:
 *   pnpm exec tsx scripts/create-test-user.ts
 *
 * Reads DATABASE_URL from .env.local.
 * Default account can be overridden via env:
 *   TEST_USER_EMAIL / TEST_USER_PASSWORD / TEST_USER_NAME
 */
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";
import { account, user } from "../src/db/schema";

config({ path: ".env.local" });
config();

const email = (process.env.TEST_USER_EMAIL ?? "l6uxingyu811@163.com").trim().toLowerCase();
const password = process.env.TEST_USER_PASSWORD ?? "12345678";
const name =
  process.env.TEST_USER_NAME?.trim() ||
  email.split("@")[0] ||
  "测试用户";

function newId() {
  return randomBytes(16).toString("hex");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL missing. Configure .env.local first.");
  }

  const client = postgres(url, { prepare: false });
  const db = drizzle(client);
  const passwordHash = await hashPassword(password);
  const now = new Date();

  const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);

  if (existing[0]) {
    const userId = existing[0].id;
    await db
      .update(user)
      .set({ name, emailVerified: true, updatedAt: now })
      .where(eq(user.id, userId));

    const accounts = await db.select().from(account).where(eq(account.userId, userId));
    const credential = accounts.find((a) => a.providerId === "credential");

    if (credential) {
      await db
        .update(account)
        .set({ password: passwordHash, updatedAt: now })
        .where(eq(account.id, credential.id));
    } else {
      await db.insert(account).values({
        id: newId(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log(`Updated test user: ${email} (id=${userId})`);
  } else {
    const userId = newId();
    await db.insert(user).values({
      id: userId,
      name,
      email,
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(account).values({
      id: newId(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    console.log(`Created test user: ${email} (id=${userId})`);
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
