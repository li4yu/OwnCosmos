import { headers } from "next/headers";
import { DEFAULT_SEARCH_TOP_K, getLlmModel, isRagInfraReady } from "@/ai/config";
import { streamRagAnswer } from "@/ai/rag-answer";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

type Body = {
  corpus?: "user" | "project";
  query?: string;
  topK?: number;
};

/** Phase 19 测试：混合检索 → 子智能体 prompt → SSE 流式回答 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  if (!isRagInfraReady()) {
    return Response.json(
      { ok: false, error: "AI/RAG 未启用或未配置密钥" },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ ok: false, error: "无效 JSON" }, { status: 400 });
  }

  const corpus = body.corpus === "project" ? "project" : "user";
  const query = typeof body.query === "string" ? body.query : "";
  const topK =
    typeof body.topK === "number" && body.topK > 0 && body.topK <= 30
      ? Math.floor(body.topK)
      : DEFAULT_SEARCH_TOP_K;

  if (!query.trim()) {
    return Response.json({ ok: false, error: "query 不能为空" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(obj)}\n\n`),
        );
      };
      try {
        send({ type: "start", llmModel: getLlmModel(), corpus, topK });
        for await (const ev of streamRagAnswer({
          userId: session.user.id,
          corpus,
          query,
          topK,
        })) {
          send(ev);
        }
        send({ type: "done" });
      } catch (e) {
        send({
          type: "error",
          error: e instanceof Error ? e.message : "流式回答失败",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
