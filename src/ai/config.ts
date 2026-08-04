/** Phase 19: AI / RAG 运行时配置（仅服务端） */

export const RAG_COLLECTION = "own_cosmos_rag_hybrid";
export const DEFAULT_EMBEDDING_MODEL = "qwen3.7-text-embedding";
export const DEFAULT_EMBEDDING_DIM = 1024;
export const DEFAULT_LLM_MODEL = "qwen3.8-max";
/** 混合检索默认返回条数 */
export const DEFAULT_SEARCH_TOP_K = 5;
/** WeightedRanker：稠密权重更大 */
export const HYBRID_DENSE_WEIGHT = 0.75;
export const HYBRID_SPARSE_WEIGHT = 0.25;

export const CHUNK_SHORT_MAX = 800;
export const CHUNK_SIZE_MIN = 500;
export const CHUNK_SIZE_MAX = 700;
export const CHUNK_OVERLAP = 80;

/** 全局总闸：未显式 true 则视为关闭（安全默认） */
export function isAiEnvEnabled(): boolean {
  return process.env.AI_ENABLED === "true";
}

export function getDashScopeApiKey(): string | undefined {
  const key = process.env.DASHSCOPE_API_KEY?.trim();
  return key || undefined;
}

export function getMilvusAddress(): string {
  return process.env.MILVUS_ADDRESS?.trim() || "localhost:19530";
}

export function getEmbeddingModel(): string {
  return process.env.EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;
}

export function getEmbeddingDim(): number {
  const n = Number(process.env.EMBEDDING_DIM);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_EMBEDDING_DIM;
}

export function getLlmModel(): string {
  return process.env.LLM_MODEL?.trim() || DEFAULT_LLM_MODEL;
}

export function getHybridWeights(): [number, number] {
  const d = Number(process.env.HYBRID_DENSE_WEIGHT);
  const s = Number(process.env.HYBRID_SPARSE_WEIGHT);
  const dense = Number.isFinite(d) && d >= 0 ? d : HYBRID_DENSE_WEIGHT;
  const sparse = Number.isFinite(s) && s >= 0 ? s : HYBRID_SPARSE_WEIGHT;
  const sum = dense + sparse;
  if (sum <= 0) return [HYBRID_DENSE_WEIGHT, HYBRID_SPARSE_WEIGHT];
  return [dense / sum, sparse / sum];
}

/** 基础设施是否齐备（不含用户开关） */
export function isRagInfraReady(): boolean {
  return isAiEnvEnabled() && Boolean(getDashScopeApiKey());
}
