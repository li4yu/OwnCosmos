import { chatCompletion } from "@/ai/llm";
import { SYSTEM_ROUTER } from "@/ai/prompts";
import {
  AI_INTENT_ACTION_HINT,
  AI_INTENT_CHAT_COMPANION,
  AI_INTENT_DUE_COACH,
  AI_INTENT_FOCUS_QUERY,
  AI_INTENT_MOOD_CARE,
  AI_INTENT_PRODUCT_HOWTO,
  AI_INTENT_UNKNOWN,
  AI_INTENT_USER_RECALL,
} from "@/db/schema";

export type CompanionIntent =
  | typeof AI_INTENT_PRODUCT_HOWTO
  | typeof AI_INTENT_USER_RECALL
  | typeof AI_INTENT_DUE_COACH
  | typeof AI_INTENT_ACTION_HINT
  | typeof AI_INTENT_FOCUS_QUERY
  | typeof AI_INTENT_MOOD_CARE
  | typeof AI_INTENT_CHAT_COMPANION
  | typeof AI_INTENT_UNKNOWN;

export type RouterResult = {
  intent: CompanionIntent;
  confidence: number;
  slots: {
    query: string;
    time_range: string;
    risk: string;
  };
  reason: string;
};

const INTENTS = new Set<string>([
  AI_INTENT_PRODUCT_HOWTO,
  AI_INTENT_USER_RECALL,
  AI_INTENT_DUE_COACH,
  AI_INTENT_ACTION_HINT,
  AI_INTENT_FOCUS_QUERY,
  AI_INTENT_MOOD_CARE,
  AI_INTENT_CHAT_COMPANION,
  AI_INTENT_UNKNOWN,
]);

function fallback(reason: string): RouterResult {
  return {
    intent: AI_INTENT_UNKNOWN,
    confidence: 0,
    slots: { query: "", time_range: "unspecified", risk: "none" },
    reason,
  };
}

/** 强信号：问专注/凝时时长与记录时，勿误入馆藏召回 */
function forceFocusQuery(message: string): boolean {
  const t = message.trim();
  if (!t) return false;
  if (!/专注|凝时|番茄钟|正计时|正向计时|倒计时|顺钟|逆漏/.test(t)) return false;
  if (/怎么用|如何用|怎样用|什么是|用法|入口在哪|在哪找/.test(t)) return false;
  return /多久|时长|几分钟|几小时|记录|统计|今天|本周|最近|有没有|有吗|了吗|几次|次数/.test(
    t,
  );
}

/** 强信号：闲聊 / 陪聊，勿误入 Fallback 说明书 */
function forceChatCompanion(message: string): boolean {
  const t = message.trim();
  if (!t) return false;
  // 明确站内任务时不抢
  if (
    /怎么用|如何用|临期|馆藏|进知识库|归档|专注多久|本周专注|今天做什么|检索|手册/.test(
      t,
    )
  ) {
    return false;
  }
  if (
    /陪我聊|聊聊天|说说话|闲聊|陪陪我|听我说|讲个笑话|无聊|想找人说|晚安|早安|午安/.test(
      t,
    )
  ) {
    return true;
  }
  // 极短寒暄
  if (/^(你好|嗨|哈喽|在吗|嘿|hi|hello|早上好|晚上好)[呀啊吗～~！!。.\s]*$/i.test(t)) {
    return true;
  }
  return false;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence?.[1]?.trim() || trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no json");
  return JSON.parse(raw.slice(start, end + 1));
}

export async function routeCompanionIntent(input: {
  userMessage: string;
  summary?: string | null;
  lastTurns?: string;
}): Promise<RouterResult> {
  const user = `会话摘要：
${input.summary?.trim() || "（无）"}

最近两轮：
${input.lastTurns?.trim() || "（无）"}

用户本轮：
${input.userMessage.trim()}`;

  try {
    const text = await chatCompletion(
      [
        { role: "system", content: SYSTEM_ROUTER },
        { role: "user", content: user },
      ],
      { temperature: 0.1 },
    );
    const parsed = extractJson(text) as {
      intent?: string;
      confidence?: number;
      slots?: {
        query?: string;
        time_range?: string;
        risk?: string;
      };
      reason?: string;
    };
    const intent = INTENTS.has(parsed.intent ?? "")
      ? (parsed.intent as CompanionIntent)
      : AI_INTENT_UNKNOWN;
    const confidence =
      typeof parsed.confidence === "number" ? parsed.confidence : 0;
    const result: RouterResult = {
      intent: confidence < 0.55 ? AI_INTENT_UNKNOWN : intent,
      confidence,
      slots: {
        query: parsed.slots?.query?.trim() || "",
        time_range: parsed.slots?.time_range || "unspecified",
        risk: parsed.slots?.risk || "none",
      },
      reason: (parsed.reason || "").slice(0, 40),
    };
    if (confidence < 0.55) {
      result.intent = AI_INTENT_UNKNOWN;
    }
    if (forceFocusQuery(input.userMessage)) {
      result.intent = AI_INTENT_FOCUS_QUERY;
      result.confidence = Math.max(result.confidence, 0.92);
      result.reason = (result.reason || "专注查询").slice(0, 40);
      if (!result.slots.query) result.slots.query = input.userMessage.trim();
    } else if (forceChatCompanion(input.userMessage)) {
      result.intent = AI_INTENT_CHAT_COMPANION;
      result.confidence = Math.max(result.confidence, 0.9);
      result.reason = (result.reason || "旅伴闲聊").slice(0, 40);
    }
    return result;
  } catch {
    if (forceFocusQuery(input.userMessage)) {
      return {
        intent: AI_INTENT_FOCUS_QUERY,
        confidence: 0.9,
        slots: {
          query: input.userMessage.trim(),
          time_range: "unspecified",
          risk: "none",
        },
        reason: "专注关键词兜底",
      };
    }
    if (forceChatCompanion(input.userMessage)) {
      return {
        intent: AI_INTENT_CHAT_COMPANION,
        confidence: 0.88,
        slots: {
          query: input.userMessage.trim(),
          time_range: "unspecified",
          risk: "none",
        },
        reason: "闲聊关键词兜底",
      };
    }
    return fallback("路由解析失败");
  }
}
