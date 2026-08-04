import {
  getDashScopeApiKey,
  getEmbeddingDim,
  getEmbeddingModel,
} from "@/ai/config";

/** Milvus 稀疏向量：index → weight */
export type SparseDict = Record<string, number>;

export type DualEmbedding = {
  dense: number[];
  sparse: SparseDict;
};

type DashScopeSparseItem = {
  index: number;
  value: number;
  token?: string;
};

type DashScopeEmbItem = {
  text_index?: number;
  embedding?: number[];
  sparse_embedding?: DashScopeSparseItem[];
};

type DashScopeResponse = {
  status_code?: number;
  code?: string;
  message?: string;
  output?: { embeddings?: DashScopeEmbItem[] };
};

function toSparseDict(items: DashScopeSparseItem[] | undefined): SparseDict {
  const dict: SparseDict = {};
  if (!items?.length) return dict;
  for (const it of items) {
    if (it == null || !Number.isFinite(it.index) || !Number.isFinite(it.value)) {
      continue;
    }
    // 过滤过小权重，减小稀疏索引体积
    if (Math.abs(it.value) < 1e-6) continue;
    dict[String(it.index)] = it.value;
  }
  return dict;
}

/**
 * DashScope 原生接口（非 OpenAI 兼容），才能拿 dense&sparse。
 * textType: document=入库，query=检索问句
 */
export async function embedTextsDual(
  texts: string[],
  textType: "document" | "query" = "document",
): Promise<DualEmbedding[]> {
  if (texts.length === 0) return [];
  const apiKey = getDashScopeApiKey();
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY 未配置");

  const model = getEmbeddingModel();
  const dimension = getEmbeddingDim();
  const batchSize = 20;
  const out: DualEmbedding[] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await fetch(
      "https://dashscope.aliyuncs.com/api/v1/services/embeddings/text-embedding/text-embedding",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: { texts: batch },
          parameters: {
            dimension,
            output_type: "dense&sparse",
            text_type: textType,
          },
        }),
      },
    );
    const json = (await res.json()) as DashScopeResponse;
    if (!res.ok || (json.status_code != null && json.status_code !== 200)) {
      throw new Error(
        json.message || json.code || `embedding HTTP ${res.status}`,
      );
    }
    const rows = json.output?.embeddings ?? [];
    if (rows.length !== batch.length) {
      throw new Error("embedding 返回条数与输入不一致");
    }
    for (const row of rows) {
      const idx = row.text_index ?? 0;
      const dense = row.embedding;
      if (!dense?.length) {
        throw new Error("embedding 缺少 dense 向量");
      }
      out[i + idx] = {
        dense,
        sparse: toSparseDict(row.sparse_embedding),
      };
    }
  }

  for (let j = 0; j < out.length; j++) {
    if (!out[j]) throw new Error(`embedding 缺失 index=${j}`);
  }
  return out;
}

export async function embedQueryDual(text: string): Promise<DualEmbedding> {
  const [vec] = await embedTextsDual([text], "query");
  if (!vec) throw new Error("embedding 空结果");
  return vec;
}

/** @deprecated 仅稠密；新代码用 embedTextsDual */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const dual = await embedTextsDual(texts, "document");
  return dual.map((d) => d.dense);
}

export async function embedQuery(text: string): Promise<number[]> {
  return (await embedQueryDual(text)).dense;
}
