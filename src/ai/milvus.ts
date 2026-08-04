import {
  DataType,
  MetricType,
  MilvusClient,
  WeightedRanker,
} from "@zilliz/milvus2-sdk-node";
import {
  getEmbeddingDim,
  getHybridWeights,
  getMilvusAddress,
  DEFAULT_SEARCH_TOP_K,
  RAG_COLLECTION,
} from "@/ai/config";
import type { SparseDict } from "@/ai/embeddings";

let client: MilvusClient | null = null;
let ensured = false;

export function getMilvusClient(): MilvusClient {
  if (!client) {
    client = new MilvusClient({ address: getMilvusAddress() });
  }
  return client;
}

export type RagChunkRow = {
  id: string;
  embedding: number[];
  sparse: SparseDict;
  user_id: string;
  corpus: string;
  source_id: string;
  archive_item_id: string;
  chunk_index: number;
  archive_type: string;
  title: string;
  text: string;
  mood: string;
  archived_at_ms: number;
  content_hash: string;
};

function emptySparse(): SparseDict {
  // Milvus 稀疏字段不能完全空；放一个极小占位
  return { "0": 1e-8 };
}

export async function ensureRagCollection(): Promise<void> {
  if (ensured) return;
  const milvus = getMilvusClient();
  const dim = getEmbeddingDim();
  const has = await milvus.hasCollection({
    collection_name: RAG_COLLECTION,
  });
  if (has.value) {
    // 校验是否含 sparse；旧库无稀疏则丢弃重建
    const desc = await milvus.describeCollection({
      collection_name: RAG_COLLECTION,
    });
    const fields = desc.schema?.fields ?? [];
    const hasSparse = fields.some((f) => f.name === "sparse");
    if (!hasSparse) {
      await milvus.dropCollection({ collection_name: RAG_COLLECTION });
    } else {
      await milvus.loadCollectionSync({ collection_name: RAG_COLLECTION });
      ensured = true;
      return;
    }
  }

  await milvus.createCollection({
    collection_name: RAG_COLLECTION,
    fields: [
      {
        name: "id",
        data_type: DataType.VarChar,
        is_primary_key: true,
        max_length: 128,
      },
      {
        name: "embedding",
        data_type: DataType.FloatVector,
        dim,
      },
      {
        name: "sparse",
        data_type: DataType.SparseFloatVector,
      },
      {
        name: "user_id",
        data_type: DataType.VarChar,
        max_length: 64,
      },
      {
        name: "corpus",
        data_type: DataType.VarChar,
        max_length: 16,
      },
      {
        name: "source_id",
        data_type: DataType.VarChar,
        max_length: 128,
      },
      {
        name: "archive_item_id",
        data_type: DataType.VarChar,
        max_length: 64,
      },
      {
        name: "chunk_index",
        data_type: DataType.Int64,
      },
      {
        name: "archive_type",
        data_type: DataType.VarChar,
        max_length: 64,
      },
      {
        name: "title",
        data_type: DataType.VarChar,
        max_length: 512,
      },
      {
        name: "text",
        data_type: DataType.VarChar,
        max_length: 8192,
      },
      {
        name: "mood",
        data_type: DataType.VarChar,
        max_length: 32,
      },
      {
        name: "archived_at_ms",
        data_type: DataType.Int64,
      },
      {
        name: "content_hash",
        data_type: DataType.VarChar,
        max_length: 64,
      },
    ],
  });

  await milvus.createIndex({
    collection_name: RAG_COLLECTION,
    field_name: "embedding",
    index_name: "embedding_hnsw",
    index_type: "HNSW",
    metric_type: MetricType.COSINE,
    params: { M: 16, efConstruction: 64 },
  });

  await milvus.createIndex({
    collection_name: RAG_COLLECTION,
    field_name: "sparse",
    index_name: "sparse_inverted",
    index_type: "SPARSE_INVERTED_INDEX",
    metric_type: MetricType.IP,
    params: { drop_ratio_build: 0.2 },
  });

  await milvus.loadCollectionSync({ collection_name: RAG_COLLECTION });
  ensured = true;
}

export async function upsertRagChunks(rows: RagChunkRow[]): Promise<void> {
  if (rows.length === 0) return;
  await ensureRagCollection();
  const milvus = getMilvusClient();
  const result = await milvus.insert({
    collection_name: RAG_COLLECTION,
    data: rows.map((r) => ({
      id: r.id,
      embedding: r.embedding,
      sparse:
        r.sparse && Object.keys(r.sparse).length > 0
          ? r.sparse
          : emptySparse(),
      user_id: r.user_id,
      corpus: r.corpus,
      source_id: r.source_id,
      archive_item_id: r.archive_item_id,
      chunk_index: r.chunk_index,
      archive_type: r.archive_type,
      title: r.title.slice(0, 500),
      text: r.text.slice(0, 8000),
      mood: r.mood.slice(0, 30),
      archived_at_ms: r.archived_at_ms,
      content_hash: r.content_hash,
    })),
  });
  const code = String(result.status.error_code);
  if (code !== "Success" && code !== "0") {
    throw new Error(result.status.reason || "Milvus insert failed");
  }
  await milvus.flushSync({ collection_names: [RAG_COLLECTION] });
}

/** 等值删除：按 user + archive_item（用户库）或 source_id（手册） */
export async function deleteRagByFilter(filter: string): Promise<void> {
  await ensureRagCollection();
  const milvus = getMilvusClient();
  const result = await milvus.delete({
    collection_name: RAG_COLLECTION,
    filter,
  });
  const code = String(result.status.error_code);
  if (code !== "Success" && code !== "0") {
    throw new Error(result.status.reason || "Milvus delete failed");
  }
}

export async function searchRagChunks(input: {
  dense: number[];
  sparse: SparseDict;
  filter: string;
  topK?: number;
}): Promise<
  {
    id: string;
    score: number;
    text: string;
    title: string;
    source_id: string;
    archive_item_id: string;
    archive_type: string;
    chunk_index: number;
  }[]
> {
  await ensureRagCollection();
  const milvus = getMilvusClient();
  const topK = input.topK ?? DEFAULT_SEARCH_TOP_K;
  const [denseW, sparseW] = getHybridWeights();
  const sparse =
    input.sparse && Object.keys(input.sparse).length > 0
      ? input.sparse
      : emptySparse();

  const result = await milvus.hybridSearch({
    collection_name: RAG_COLLECTION,
    data: [
      {
        data: input.dense,
        anns_field: "embedding",
        params: { ef: 64 },
      },
      {
        data: sparse,
        anns_field: "sparse",
        params: { drop_ratio_search: 0.2 },
      },
    ],
    limit: topK,
    filter: input.filter,
    output_fields: [
      "text",
      "title",
      "source_id",
      "archive_item_id",
      "archive_type",
      "chunk_index",
      "corpus",
      "user_id",
    ],
    rerank: WeightedRanker([denseW, sparseW]),
  });

  const hits = result.results ?? [];
  return hits.map((h) => ({
    id: String(h.id),
    score: Number(h.score),
    text: String(h.text ?? ""),
    title: String(h.title ?? ""),
    source_id: String(h.source_id ?? ""),
    archive_item_id: String(h.archive_item_id ?? ""),
    archive_type: String(h.archive_type ?? ""),
    chunk_index: Number(h.chunk_index ?? 0),
  }));
}

export function escapeMilvusString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
