import { getDashScopeApiKey, getLlmModel } from "@/ai/config";

const DASHSCOPE_CHAT_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionOptions = {
  temperature?: number;
  signal?: AbortSignal;
};

/**
 * DashScope OpenAI 兼容非流式聊天（路由 / 摘要压缩）。
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
): Promise<string> {
  const apiKey = getDashScopeApiKey();
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY 未配置");

  const res = await fetch(DASHSCOPE_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getLlmModel(),
      messages,
      stream: false,
      temperature: options.temperature ?? 0.2,
      enable_thinking: false,
    }),
    signal: options.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText.slice(0, 400) || `LLM HTTP ${res.status}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const text = json.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("LLM 返回空内容");
  return text;
}

/**
 * DashScope OpenAI 兼容流式聊天；yield 文本增量。
 */
export async function* streamChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
): AsyncGenerator<string, void, unknown> {
  const apiKey = getDashScopeApiKey();
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY 未配置");

  const res = await fetch(DASHSCOPE_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getLlmModel(),
      messages,
      stream: true,
      temperature: options.temperature ?? 0.4,
      enable_thinking: false,
    }),
    signal: options.signal,
  });

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText.slice(0, 400) || `LLM HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as {
          choices?: { delta?: { content?: string | null } }[];
        };
        const delta = json.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) {
          yield delta;
        }
      } catch {
        // 忽略非整行 JSON
      }
    }
  }
}
