import { headers } from "next/headers";
import { getLlmModel, isRagInfraReady } from "@/ai/config";
import { assertAiRateLimit } from "@/lib/ai-rate-limit";
import { auth } from "@/lib/auth";
import { streamReflectTurn } from "@/services/reflect";

export const runtime = "nodejs";

type Body = {
  message?: string;
  conversationId?: string | null;
};

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const limited = await assertAiRateLimit(session.user.id, "reflect");
  if (limited) return limited;
  if (!isRagInfraReady()) {
    return Response.json(
      { ok: false, error: "AI 未启用或未配置密钥" },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ ok: false, error: "无效 JSON" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message : "";
  if (!message.trim()) {
    return Response.json({ ok: false, error: "消息不能为空" }, { status: 400 });
  }

  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId : null;
  const signal = req.signal;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(obj)}\n\n`),
        );
      };
      try {
        send({ type: "start", llmModel: getLlmModel() });
        for await (const ev of streamReflectTurn({
          userId: session.user.id,
          message,
          conversationId,
          signal,
        })) {
          send(ev);
        }
      } catch (e) {
        send({
          type: "error",
          error: signal.aborted
            ? "已停止"
            : e instanceof Error
              ? e.message
              : "自省对话失败",
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
