import { and, eq, ilike, or, sql } from "drizzle-orm";
import { DEFAULT_SEARCH_TOP_K, isRagInfraReady } from "@/ai/config";
import { embedQueryDual } from "@/ai/embeddings";
import {
  escapeMilvusString,
  searchRagChunks,
} from "@/ai/milvus";
import { getDb } from "@/db";
import {
  RAG_CORPUS_PROJECT,
  RAG_CORPUS_USER,
  archiveItem,
  ragDocument,
} from "@/db/schema";

export type SemanticHit = {
  id: string;
  score: number;
  text: string;
  title: string;
  sourceId: string;
  archiveItemId: string | null;
  archiveType: string;
  chunkIndex: number;
  mode: "hybrid" | "ilike";
};

/** 用户库语义检索；关 AI（无 AI_ENABLED/密钥）时降级 ILIKE */
export async function semanticSearchUser(
  userId: string,
  query: string,
  topK = DEFAULT_SEARCH_TOP_K,
): Promise<SemanticHit[]> {
  const q = query.trim();
  if (!q) return [];

  if (isRagInfraReady()) {
    try {
      const dual = await embedQueryDual(q);
      const uid = escapeMilvusString(userId);
      const hits = await searchRagChunks({
        dense: dual.dense,
        sparse: dual.sparse,
        filter: `corpus == "${RAG_CORPUS_USER}" && user_id == "${uid}"`,
        topK,
      });
      return hits.map((h) => ({
        id: h.id,
        score: h.score,
        text: h.text,
        title: h.title,
        sourceId: h.source_id,
        archiveItemId: h.archive_item_id || null,
        archiveType: h.archive_type,
        chunkIndex: h.chunk_index,
        mode: "hybrid" as const,
      }));
    } catch {
      // fall through to ILIKE
    }
  }

  const pattern = `%${q.replace(/[%_]/g, "")}%`;
  const rows = await getDb()
    .select({
      id: archiveItem.id,
      title: archiveItem.title,
      body: archiveItem.body,
      type: archiveItem.type,
    })
    .from(archiveItem)
    .where(
      and(
        eq(archiveItem.userId, userId),
        eq(archiveItem.inKnowledge, true),
        or(ilike(archiveItem.title, pattern), ilike(archiveItem.body, pattern)),
      ),
    )
    .limit(topK);

  return rows.map((r, i) => ({
    id: `ilike:${r.id}`,
    score: 1 - i * 0.01,
    text: `${r.title}\n${r.body}`.slice(0, 800),
    title: r.title,
    sourceId: r.id,
    archiveItemId: r.id,
    archiveType: r.type,
    chunkIndex: 0,
    mode: "ilike" as const,
  }));
}

/** 项目手册语义检索 */
export async function semanticSearchProject(
  userId: string,
  query: string,
  topK = DEFAULT_SEARCH_TOP_K,
): Promise<SemanticHit[]> {
  const q = query.trim();
  if (!q) return [];

  if (!isRagInfraReady()) return [];

  try {
    const dual = await embedQueryDual(q);
    const hits = await searchRagChunks({
      dense: dual.dense,
      sparse: dual.sparse,
      filter: `corpus == "${RAG_CORPUS_PROJECT}"`,
      topK,
    });
    return hits.map((h) => ({
      id: h.id,
      score: h.score,
      text: h.text,
      title: h.title,
      sourceId: h.source_id,
      archiveItemId: null,
      archiveType: h.archive_type,
      chunkIndex: h.chunk_index,
      mode: "hybrid" as const,
    }));
  } catch {
    return [];
  }
}

export async function countSyncedDocs(corpus?: string) {
  const db = getDb();
  if (corpus) {
    const rows = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(ragDocument)
      .where(eq(ragDocument.corpus, corpus));
    return rows[0]?.n ?? 0;
  }
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(ragDocument);
  return rows[0]?.n ?? 0;
}
