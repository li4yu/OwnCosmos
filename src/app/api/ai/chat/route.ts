import { headers } from "next/headers";
import { streamCompanionTurn } from "@/ai/companion-orchestrate";
import { isRagInfraReady, getLlmModel } from "@/ai/config";
import { assertAiRateLimit } from "@/lib/ai-rate-limit";
import { auth } from "@/lib/auth";

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
  const limited = await assertAiRateLimit(session.user.id, "chat");
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
        for await (const ev of streamCompanionTurn({
          userId: session.user.id,
          message,
          conversationId,
          signal,
        })) {
          send(ev);
        }
      } catch (e) {
        if (signal.aborted) {
          send({ type: "error", error: "已停止" });
        } else {
          send({
            type: "error",
            error: e instanceof Error ? e.message : "伴读失败",
          });
        }
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
