import { headers } from "next/headers";
import { streamChatCompletion } from "@/ai/llm";
import {
  POLISH_MAX_CHARS,
  buildPolishMessages,
  isPolishStyle,
  type PolishScope,
  type PolishStyle,
} from "@/ai/polish";
import { getLlmModel, isRagInfraReady } from "@/ai/config";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

type Body = {
  text?: string;
  scope?: string;
  style?: string;
};

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ ok: false, error: "未登录" }, { status: 401 });
  }
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

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return Response.json({ ok: false, error: "原文不能为空" }, { status: 400 });
  }
  if (text.length > POLISH_MAX_CHARS) {
    return Response.json(
      { ok: false, error: `原文过长（最多 ${POLISH_MAX_CHARS} 字）` },
      { status: 400 },
    );
  }

  const scope: PolishScope =
    body.scope === "selection" ? "selection" : "full";
  const styleRaw = typeof body.style === "string" ? body.style : "smooth";
  if (!isPolishStyle(styleRaw)) {
    return Response.json({ ok: false, error: "无效风格" }, { status: 400 });
  }
  const style: PolishStyle = styleRaw;

  const messages = buildPolishMessages({ scope, style, text });
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
        send({ type: "start", llmModel: getLlmModel(), scope, style });
        for await (const delta of streamChatCompletion(messages, {
          temperature: 0.55,
          signal,
        })) {
          send({ type: "delta", text: delta });
        }
        send({ type: "done" });
      } catch (e) {
        if (signal.aborted) {
          send({ type: "error", error: "已停止" });
        } else {
          send({
            type: "error",
            error: e instanceof Error ? e.message : "润色失败",
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
