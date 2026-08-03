import { randomBytes } from "node:crypto";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { essay, essayFolder } from "@/db/schema";

function newId() {
  return randomBytes(16).toString("hex");
}

export type EssayFolderRecord = typeof essayFolder.$inferSelect;

export async function listEssayFolders(userId: string) {
  const folders = await getDb()
    .select()
    .from(essayFolder)
    .where(eq(essayFolder.userId, userId))
    .orderBy(asc(essayFolder.name));

  if (folders.length === 0) return [];

  const counts = await getDb()
    .select({
      folderId: essay.folderId,
      n: count(),
    })
    .from(essay)
    .where(
      and(
        eq(essay.userId, userId),
        isNull(essay.archivedAt),
      ),
    )
    .groupBy(essay.folderId);

  const countMap = new Map<string, number>();
  for (const row of counts) {
    if (row.folderId) countMap.set(row.folderId, row.n);
  }

  return folders.map((f) => ({
    ...f,
    activeCount: countMap.get(f.id) ?? 0,
  }));
}

export async function getEssayFolder(userId: string, folderId: string) {
  const rows = await getDb()
    .select()
    .from(essayFolder)
    .where(and(eq(essayFolder.id, folderId), eq(essayFolder.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createEssayFolder(
  userId: string,
  input: { name: string; body?: string },
) {
  const name = input.name.trim();
  if (!name) return { error: "请填写专题名称" as const };
  const now = new Date();
  const id = newId();
  await getDb().insert(essayFolder).values({
    id,
    userId,
    name,
    body: (input.body ?? "").trim(),
    createdAt: now,
    updatedAt: now,
  });
  return { id };
}

export async function updateEssayFolder(
  userId: string,
  folderId: string,
  input: { name: string; body?: string },
) {
  const existing = await getEssayFolder(userId, folderId);
  if (!existing) return { error: "专题不存在" as const };
  const name = input.name.trim();
  if (!name) return { error: "请填写专题名称" as const };
  const now = new Date();
  await getDb()
    .update(essayFolder)
    .set({
      name,
      body: (input.body ?? "").trim(),
      updatedAt: now,
    })
    .where(and(eq(essayFolder.id, folderId), eq(essayFolder.userId, userId)));
  return { id: folderId };
}

/**
 * 删除专题：硬删其中未归档随笔；已归档篇 folder_id 置空（FK set null）。
 */
export async function deleteEssayFolder(userId: string, folderId: string) {
  const existing = await getEssayFolder(userId, folderId);
  if (!existing) return { error: "专题不存在" as const };

  await getDb()
    .delete(essay)
    .where(
      and(
        eq(essay.userId, userId),
        eq(essay.folderId, folderId),
        isNull(essay.archivedAt),
      ),
    );

  await getDb()
    .delete(essayFolder)
    .where(and(eq(essayFolder.id, folderId), eq(essayFolder.userId, userId)));

  return { ok: true as const, name: existing.name };
}

export async function countActiveEssaysInFolder(
  userId: string,
  folderId: string,
) {
  const [row] = await getDb()
    .select({ n: count() })
    .from(essay)
    .where(
      and(
        eq(essay.userId, userId),
        eq(essay.folderId, folderId),
        isNull(essay.archivedAt),
      ),
    );
  return row?.n ?? 0;
}
