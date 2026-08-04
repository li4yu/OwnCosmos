import { DEFAULT_SEARCH_TOP_K, isRagInfraReady } from "@/ai/config";
import type { ChatMessage } from "@/ai/llm";
import { streamChatCompletion } from "@/ai/llm";
import {
  SYSTEM_PRODUCT_HOWTO,
  SYSTEM_USER_RECALL,
  buildRagUserMessage,
  formatChunkBlock,
} from "@/ai/prompts";
import {
  type SemanticHit,
  semanticSearchProject,
  semanticSearchUser,
} from "@/ai/search";

export type RagAnswerMeta = {
  corpus: "user" | "project";
  hits: SemanticHit[];
  agent: "product_howto" | "user_recall";
};

/** 检索 → 拼 prompt → 流式生成（测试 / 子智能体雏形） */
export async function* streamRagAnswer(input: {
  userId: string;
  corpus: "user" | "project";
  query: string;
  topK?: number;
}): AsyncGenerator<
  { type: "meta"; meta: RagAnswerMeta } | { type: "delta"; text: string },
  void,
  unknown
> {
  if (!isRagInfraReady()) {
    throw new Error("AI/RAG 未启用或未配置密钥");
  }

  const topK = input.topK ?? DEFAULT_SEARCH_TOP_K;
  const query = input.query.trim();
  if (!query) throw new Error("query 不能为空");

  const hits =
    input.corpus === "project"
      ? await semanticSearchProject(input.userId, query, topK)
      : await semanticSearchUser(input.userId, query, topK);

  const agent =
    input.corpus === "project" ? "product_howto" : "user_recall";
  const system =
    input.corpus === "project" ? SYSTEM_PRODUCT_HOWTO : SYSTEM_USER_RECALL;
  const chunks = formatChunkBlock(hits);
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    {
      role: "user",
      content: buildRagUserMessage(input.corpus, query, chunks),
    },
  ];

  yield {
    type: "meta",
    meta: { corpus: input.corpus, hits, agent },
  };

  for await (const text of streamChatCompletion(messages)) {
    yield { type: "delta", text };
  }
}
