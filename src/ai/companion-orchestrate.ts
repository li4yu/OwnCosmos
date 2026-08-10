import {
  type CompanionJump,
  jumpsFromAgentMeta,
  scrubCompanionAnswer,
} from "@/ai/companion-jumps";
import { isRagInfraReady } from "@/ai/config";
import type { ChatMessage } from "@/ai/llm";
import { streamChatCompletion } from "@/ai/llm";
import {
  SYSTEM_ACTION_HINT,
  SYSTEM_CHAT_COMPANION,
  SYSTEM_DUE_COACH,
  SYSTEM_FALLBACK,
  SYSTEM_FOCUS_QUERY,
  SYSTEM_MOOD_CARE,
  SYSTEM_PRODUCT_HOWTO,
  SYSTEM_USER_RECALL,
  buildRagUserMessage,
  formatChunkBlock,
} from "@/ai/prompts";
import {
  type CompanionIntent,
  type RouterResult,
  routeCompanionIntent,
} from "@/ai/router";
import {
  toolGetBooklist,
  toolGetFocusStats,
  toolGetHomeSummary,
  toolGetMoodSummary,
  toolGetRecentFocusNotes,
  toolListDueItems,
  toolSemanticSearchProject,
  toolSemanticSearchUser,
} from "@/ai/tools";
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
import { buildPersonaPromptBlock } from "@/lib/companion-persona";
import {
  appendMessage,
  getOrCreateOpenConversation,
  getRecentTurnsText,
  listConversationMessages,
  maybeCompressConversation,
  setConversationTitleIfEmpty,
} from "@/services/ai-conversation";
import { getCompanionPref } from "@/services/companion";

export type CompanionStreamEvent =
  | {
      type: "meta";
      conversationId: string;
      intent: CompanionIntent;
      confidence: number;
      reason: string;
      jumps: CompanionJump[];
    }
  | { type: "delta"; text: string }
  | {
      type: "done";
      assistantMessageId: string;
      jumps: CompanionJump[];
    };

async function buildAgentMessages(
  userId: string,
  userMessage: string,
  route: RouterResult,
  ctx?: { summary?: string | null; lastTurns?: string },
): Promise<{ system: string; user: string; meta: Record<string, unknown> }> {
  const q = route.slots.query || userMessage;
  const riskNote =
    route.slots.risk === "write_request"
      ? "\n\n（注意：用户似乎在请求写操作；请拒绝代操作并指引到对应页面。）"
      : "";

  switch (route.intent) {
    case AI_INTENT_PRODUCT_HOWTO: {
      const hits = await toolSemanticSearchProject(userId, q);
      return {
        system: SYSTEM_PRODUCT_HOWTO,
        user:
          buildRagUserMessage("project", userMessage, formatChunkBlock(hits)) +
          riskNote,
        meta: { hits: hits.map((h) => ({ id: h.id, title: h.title, sourceId: h.sourceId })) },
      };
    }
    case AI_INTENT_USER_RECALL: {
      const hits = await toolSemanticSearchUser(userId, q);
      return {
        system: SYSTEM_USER_RECALL,
        user:
          buildRagUserMessage("user", userMessage, formatChunkBlock(hits)) +
          riskNote,
        meta: {
          hits: hits.map((h) => ({
            id: h.id,
            title: h.title,
            archiveItemId: h.archiveItemId,
          })),
        },
      };
    }
    case AI_INTENT_DUE_COACH: {
      const due = await toolListDueItems(userId);
      return {
        system: SYSTEM_DUE_COACH,
        user: `用户问题：${userMessage}\n\n（工具 list_due_items 结果）临期提醒列表（JSON）：\n${JSON.stringify(due, null, 2)}${riskNote}`,
        meta: { due },
      };
    }
    case AI_INTENT_ACTION_HINT: {
      const home = await toolGetHomeSummary(userId);
      return {
        system: SYSTEM_ACTION_HINT,
        user: `用户问题：${userMessage}\n\n（工具 get_home_summary 结果）站内摘要（JSON）：\n${JSON.stringify(home, null, 2)}${riskNote}`,
        meta: { home },
      };
    }
    case AI_INTENT_FOCUS_QUERY: {
      const [stats, notes] = await Promise.all([
        toolGetFocusStats(userId),
        toolGetRecentFocusNotes(userId),
      ]);
      return {
        system: SYSTEM_FOCUS_QUERY,
        user: `用户问题：${userMessage}\n\n（工具结果）专注统计（JSON）：\n${JSON.stringify(stats, null, 2)}\n\n（工具结果）近况专注记录摘要（JSON，可空）：\n${JSON.stringify(notes, null, 2)}${riskNote}`,
        meta: { stats, notes },
      };
    }
    case AI_INTENT_MOOD_CARE: {
      const [mood, books] = await Promise.all([
        toolGetMoodSummary(userId),
        Promise.resolve(toolGetBooklist()),
      ]);
      return {
        system: SYSTEM_MOOD_CARE,
        user: `用户问题：${userMessage}\n\n（工具结果）心绪相关摘要（JSON，可空）：\n${JSON.stringify(mood, null, 2)}\n\n（工具结果）本地书单（JSON，可空）：\n${JSON.stringify(books, null, 2)}${riskNote}`,
        meta: { mood, books },
      };
    }
    case AI_INTENT_CHAT_COMPANION: {
      const summary = ctx?.summary?.trim() || "（无）";
      const turns = ctx?.lastTurns?.trim() || "（无）";
      return {
        system: SYSTEM_CHAT_COMPANION,
        user: `会话摘要：\n${summary}\n\n最近对话：\n${turns}\n\n用户本轮：\n${userMessage}${riskNote}`,
        meta: { mode: "chat_companion" },
      };
    }
    case AI_INTENT_UNKNOWN:
    default:
      return {
        system: SYSTEM_FALLBACK,
        user: `用户消息：${userMessage}\n路由备注：${route.reason || "置信不足"}${riskNote}`,
        meta: {},
      };
  }
}

function temperatureForIntent(intent: CompanionIntent): number {
  if (intent === AI_INTENT_FOCUS_QUERY) return 0.25;
  if (intent === AI_INTENT_CHAT_COMPANION) return 0.88;
  if (intent === AI_INTENT_MOOD_CARE) return 0.65;
  return 0.55;
}

/** 伴读一轮：记忆 → 路由 → 工具 → SSE 流式回答 → 落库 */
export async function* streamCompanionTurn(input: {
  userId: string;
  message: string;
  conversationId?: string | null;
  signal?: AbortSignal;
}): AsyncGenerator<CompanionStreamEvent, void, unknown> {
  if (!isRagInfraReady()) {
    throw new Error("AI 未启用或未配置密钥");
  }
  const text = input.message.trim();
  if (!text) throw new Error("消息不能为空");

  let conversation = null as Awaited<
    ReturnType<typeof getOrCreateOpenConversation>
  > | null;
  if (input.conversationId) {
    const packed = await listConversationMessages(
      input.userId,
      input.conversationId,
      1,
    );
    conversation = packed?.conversation ?? null;
  }
  if (!conversation) {
    conversation = await getOrCreateOpenConversation(input.userId);
  }

  await appendMessage({
    conversationId: conversation.id,
    role: "user",
    content: text,
  });
  await setConversationTitleIfEmpty(conversation.id, text);

  const lastTurns = await getRecentTurnsText(conversation.id, 4);
  const route = await routeCompanionIntent({
    userMessage: text,
    summary: conversation.summary,
    lastTurns,
  });

  const built = await buildAgentMessages(input.userId, text, route, {
    summary: conversation.summary,
    lastTurns,
  });
  const pref = await getCompanionPref(input.userId);
  const personaBlock = buildPersonaPromptBlock(pref);
  const systemWithPersona = `${built.system}\n\n${personaBlock}`;
  const jumps = jumpsFromAgentMeta(route.intent, built.meta);

  yield {
    type: "meta",
    conversationId: conversation.id,
    intent: route.intent,
    confidence: route.confidence,
    reason: route.reason,
    jumps,
  };

  const messages: ChatMessage[] = [
    { role: "system", content: systemWithPersona },
    { role: "user", content: built.user },
  ];

  let answer = "";
  for await (const delta of streamChatCompletion(messages, {
    temperature: temperatureForIntent(route.intent),
    signal: input.signal,
  })) {
    answer += delta;
    yield { type: "delta", text: delta };
  }

  const cleaned = scrubCompanionAnswer(answer || "（空回答）");
  const assistantMessageId = await appendMessage({
    conversationId: conversation.id,
    role: "assistant",
    content: cleaned,
    intent: route.intent,
    meta: {
      confidence: route.confidence,
      reason: route.reason,
      jumps,
      ...built.meta,
    },
  });

  void maybeCompressConversation(conversation.id, conversation.summary);

  yield { type: "done", assistantMessageId, jumps };
}
