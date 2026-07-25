import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { essay } from "@/db/schema";

function newId() {
  return randomBytes(16).toString("hex");
}

export type EssayRecord = typeof essay.$inferSelect;

export async function listActiveEssays(userId: string) {
  return getDb()
    .select()
    .from(essay)
    .where(and(eq(essay.userId, userId), isNull(essay.archivedAt)))
    .orderBy(desc(essay.updatedAt));
}

export async function getActiveEssay(userId: string, essayId: string) {
  const rows = await getDb()
    .select()
    .from(essay)
    .where(
      and(
        eq(essay.id, essayId),
        eq(essay.userId, userId),
        isNull(essay.archivedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function createEssay(
  userId: string,
  input: { title: string; body: string },
) {
  const now = new Date();
  const id = newId();
  const title = input.title.trim() || "无标题";
  const body = input.body;
  await getDb().insert(essay).values({
    id,
    userId,
    title,
    body,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  });
  return id;
}

export async function updateEssay(
  userId: string,
  essayId: string,
  input: { title: string; body: string },
) {
  const existing = await getActiveEssay(userId, essayId);
  if (!existing) return null;
  const now = new Date();
  const title = input.title.trim() || "无标题";
  await getDb()
    .update(essay)
    .set({
      title,
      body: input.body,
      updatedAt: now,
    })
    .where(and(eq(essay.id, essayId), eq(essay.userId, userId)));
  return essayId;
}

/** 仅删除流动中（未归档）随笔 */
export async function deleteActiveEssay(userId: string, essayId: string) {
  const existing = await getActiveEssay(userId, essayId);
  if (!existing) return false;
  await getDb()
    .delete(essay)
    .where(
      and(
        eq(essay.id, essayId),
        eq(essay.userId, userId),
        isNull(essay.archivedAt),
      ),
    );
  return true;
}
