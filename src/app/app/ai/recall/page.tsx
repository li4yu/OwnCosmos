import { RagRecallPanel } from "@/components/ai/rag-recall-panel";
import { PageHeader } from "@/components/shell/page-header";
import {
  DEFAULT_SEARCH_TOP_K,
  getEmbeddingModel,
  getHybridWeights,
  getLlmModel,
  getMilvusAddress,
  isRagInfraReady,
} from "@/ai/config";
import { requireSession } from "@/lib/session";

/** Phase 19 临时：单独测语义召回，不进顶栏正式导航 */
export default async function RagRecallTestPage() {
  await requireSession();
  const infraReady = isRagInfraReady();
  const milvus = getMilvusAddress();
  const model = getEmbeddingModel();
  const llm = getLlmModel();
  const [denseW, sparseW] = getHybridWeights();

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="RAG 召回测试"
        eyebrow="AI · DEV"
        description="混合检索命中 + 检索入上下文流式回答；非正式产品入口。"
        backHref="/app/settings"
        backLabel="返回设置"
      />

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          运行状态
        </p>
        <ul className="mt-1.5 space-y-0.5 text-xs text-[var(--mist)]">
          <li>infra：{infraReady ? "就绪（AI_ENABLED + 密钥）" : "未就绪"}</li>
          <li>embedding：{model}（dense&sparse）</li>
          <li>LLM：{llm}（SSE · /api/ai/answer）</li>
          <li>
            混合权重：dense={denseW.toFixed(2)} / sparse={sparseW.toFixed(2)}（稠密更大）
          </li>
          <li>默认 TopK：{DEFAULT_SEARCH_TOP_K}</li>
          <li>Milvus：{milvus} · collection=own_cosmos_rag_hybrid</li>
          <li>
            project→product_howto；user→user_recall。mode=ilike 为降级关键词。
          </li>
        </ul>
      </section>

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <RagRecallPanel />
      </section>
    </main>
  );
}
