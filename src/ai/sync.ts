import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  chunkPlainText,
  hashContent,
  normalizeArchivePlainText,
  withMetaPrefix,
} from "@/ai/chunking";
import { getEmbeddingModel, isRagInfraReady } from "@/ai/config";
import { embedTextsDual } from "@/ai/embeddings";
import {
  deleteRagByFilter,
  escapeMilvusString,
  upsertRagChunks,
} from "@/ai/milvus";
import { getDb } from "@/db";
import {
  RAG_CORPUS_PROJECT,
  RAG_CORPUS_USER,
  RAG_SOURCE_ARCHIVE,
  RAG_SOURCE_HANDBOOK,
  RAG_STATUS_DELETED,
  RAG_STATUS_ERROR,
  RAG_STATUS_SYNCED,
  archiveItem,
  ragDocument,
} from "@/db/schema";

function newId() {
  return randomBytes(16).toString("hex");
}

function chunkPk(corpus: string, sourceId: string, index: number) {
  // Milvus VARCHAR PK；保持稳定便于覆盖写前先删
  return `${corpus}:${sourceId}:${index}`.slice(0, 128);
}

async function upsertReconcile(row: {
  userId: string | null;
  corpus: string;
  sourceKind: string;
  sourceId: string;
  archiveType: string | null;
  contentHash: string;
  chunkCount: number;
  status: string;
  lastError?: string | null;
}) {
  const db = getDb();
  const existing = await db
    .select()
    .from(ragDocument)
    .where(
      and(
        eq(ragDocument.corpus, row.corpus),
        eq(ragDocument.sourceId, row.sourceId),
      ),
    )
    .limit(1);
  const now = new Date();
  if (existing[0]) {
    await db
      .update(ragDocument)
      .set({
        userId: row.userId,
        sourceKind: row.sourceKind,
        archiveType: row.archiveType,
        contentHash: row.contentHash,
        chunkCount: row.chunkCount,
        embeddingModel: getEmbeddingModel(),
        status: row.status,
        lastSyncedAt: row.status === RAG_STATUS_SYNCED ? now : existing[0].lastSyncedAt,
        lastError: row.lastError ?? null,
        updatedAt: now,
      })
      .where(eq(ragDocument.id, existing[0].id));
    return existing[0].id;
  }
  const id = newId();
  await db.insert(ragDocument).values({
    id,
    userId: row.userId,
    corpus: row.corpus,
    sourceKind: row.sourceKind,
    sourceId: row.sourceId,
    archiveType: row.archiveType,
    contentHash: row.contentHash,
    chunkCount: row.chunkCount,
    embeddingModel: getEmbeddingModel(),
    status: row.status,
    lastSyncedAt: row.status === RAG_STATUS_SYNCED ? now : null,
    lastError: row.lastError ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/** 馆藏进向量；取消藏忆/无文本时请走 delete */
export async function upsertArchiveItemRag(
  userId: string,
  archiveItemId: string,
): Promise<{ ok: true } | { ok: false; skipped?: boolean; error: string }> {
  if (!isRagInfraReady()) {
    return { ok: false, skipped: true, error: "AI/RAG 未启用或未配置密钥" };
  }

  const rows = await getDb()
    .select()
    .from(archiveItem)
    .where(
      and(eq(archiveItem.id, archiveItemId), eq(archiveItem.userId, userId)),
    )
    .limit(1);
  const item = rows[0];
  if (!item) return { ok: false, error: "条目不存在" };
  if (!item.inKnowledge) {
    await deleteArchiveItemRag(userId, archiveItemId);
    return { ok: true };
  }

  const plain = normalizeArchivePlainText({
    title: item.title,
    body: item.body,
    bodyFormat: item.bodyFormat,
  });
  if (!plain.trim()) {
    await deleteArchiveItemRag(userId, archiveItemId);
    return { ok: true };
  }

  const contentHash = hashContent(plain);
  try {
    const uid = escapeMilvusString(userId);
    const aid = escapeMilvusString(archiveItemId);
    await deleteRagByFilter(
      `corpus == "${RAG_CORPUS_USER}" && user_id == "${uid}" && archive_item_id == "${aid}"`,
    );

    const pieces = chunkPlainText(plain);
    const dated = item.archivedAt?.toISOString?.() ?? "";
    const texts = pieces.map((p) =>
      withMetaPrefix(
        {
          type: item.type,
          date: dated.slice(0, 10),
          mood: item.mood,
          title: item.title,
        },
        p.text,
      ),
    );
    const vectors = await embedTextsDual(texts, "document");
    const milvusRows = pieces.map((p, i) => ({
      id: chunkPk(RAG_CORPUS_USER, archiveItemId, p.index),
      embedding: vectors[i]!.dense,
      sparse: vectors[i]!.sparse,
      user_id: userId,
      corpus: RAG_CORPUS_USER,
      source_id: archiveItemId,
      archive_item_id: archiveItemId,
      chunk_index: p.index,
      archive_type: item.type,
      title: item.title,
      text: texts[i]!,
      mood: item.mood ?? "",
      archived_at_ms: item.archivedAt?.getTime?.() ?? 0,
      content_hash: contentHash,
    }));
    await upsertRagChunks(milvusRows);
    await upsertReconcile({
      userId,
      corpus: RAG_CORPUS_USER,
      sourceKind: RAG_SOURCE_ARCHIVE,
      sourceId: archiveItemId,
      archiveType: item.type,
      contentHash,
      chunkCount: milvusRows.length,
      status: RAG_STATUS_SYNCED,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "同步失败";
    await upsertReconcile({
      userId,
      corpus: RAG_CORPUS_USER,
      sourceKind: RAG_SOURCE_ARCHIVE,
      sourceId: archiveItemId,
      archiveType: item.type,
      contentHash,
      chunkCount: 0,
      status: RAG_STATUS_ERROR,
      lastError: msg.slice(0, 500),
    });
    return { ok: false, error: msg };
  }
}

export async function deleteArchiveItemRag(
  userId: string,
  archiveItemId: string,
): Promise<void> {
  if (!isRagInfraReady()) return;
  try {
    const uid = escapeMilvusString(userId);
    const aid = escapeMilvusString(archiveItemId);
    await deleteRagByFilter(
      `corpus == "${RAG_CORPUS_USER}" && user_id == "${uid}" && archive_item_id == "${aid}"`,
    );
    await upsertReconcile({
      userId,
      corpus: RAG_CORPUS_USER,
      sourceKind: RAG_SOURCE_ARCHIVE,
      sourceId: archiveItemId,
      archiveType: null,
      contentHash: "",
      chunkCount: 0,
      status: RAG_STATUS_DELETED,
    });
  } catch {
    // 抹忆主路径不应因向量失败而中断
  }
}

export async function deleteArchiveItemsRag(
  userId: string,
  archiveItemIds: string[],
): Promise<void> {
  for (const id of archiveItemIds) {
    await deleteArchiveItemRag(userId, id);
  }
}

/** 手册一节入库（project corpus） */
export async function upsertHandbookSectionRag(input: {
  sourceId: string;
  title: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isRagInfraReady()) {
    return { ok: false, error: "AI/RAG 未启用或未配置密钥" };
  }
  const plain = `${input.title.trim()}\n${input.body.trim()}`.trim();
  if (!plain) return { ok: false, error: "空节" };
  const contentHash = hashContent(plain);
  try {
    const sid = escapeMilvusString(input.sourceId);
    await deleteRagByFilter(
      `corpus == "${RAG_CORPUS_PROJECT}" && source_id == "${sid}"`,
    );
    const pieces = chunkPlainText(plain);
    const texts = pieces.map((p) =>
      withMetaPrefix({ type: "handbook", title: input.title }, p.text),
    );
    const vectors = await embedTextsDual(texts, "document");
    await upsertRagChunks(
      pieces.map((p, i) => ({
        id: chunkPk(RAG_CORPUS_PROJECT, input.sourceId, p.index),
        embedding: vectors[i]!.dense,
        sparse: vectors[i]!.sparse,
        user_id: "",
        corpus: RAG_CORPUS_PROJECT,
        source_id: input.sourceId,
        archive_item_id: "",
        chunk_index: p.index,
        archive_type: "handbook",
        title: input.title,
        text: texts[i]!,
        mood: "",
        archived_at_ms: 0,
        content_hash: contentHash,
      })),
    );
    await upsertReconcile({
      userId: null,
      corpus: RAG_CORPUS_PROJECT,
      sourceKind: RAG_SOURCE_HANDBOOK,
      sourceId: input.sourceId,
      archiveType: "handbook",
      contentHash,
      chunkCount: pieces.length,
      status: RAG_STATUS_SYNCED,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "手册同步失败";
    await upsertReconcile({
      userId: null,
      corpus: RAG_CORPUS_PROJECT,
      sourceKind: RAG_SOURCE_HANDBOOK,
      sourceId: input.sourceId,
      archiveType: "handbook",
      contentHash,
      chunkCount: 0,
      status: RAG_STATUS_ERROR,
      lastError: msg.slice(0, 500),
    });
    return { ok: false, error: msg };
  }
}

/** 不阻塞主流程的 fire-and-forget */
export function scheduleArchiveRagUpsert(userId: string, archiveItemId: string) {
  void upsertArchiveItemRag(userId, archiveItemId).catch(() => {});
}

export function scheduleArchiveRagDelete(userId: string, archiveItemId: string) {
  void deleteArchiveItemRag(userId, archiveItemId).catch(() => {});
}
