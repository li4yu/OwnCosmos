import {
  COMPANION_TONE_CALM,
  COMPANION_TONE_EARNEST,
  COMPANION_TONE_PLAYFUL,
  COMPANION_TONE_WARM,
  COMPANION_TONES,
  DEFAULT_COMPANION_NAME,
  DEFAULT_COMPANION_TONE,
  DEFAULT_USER_ADDRESS,
  type CompanionTone,
} from "@/db/schema";

export type CompanionPersona = {
  companionName: string;
  tone: CompanionTone;
  userAddress: string;
  personaReady: boolean;
};

export const TONE_OPTIONS: {
  value: CompanionTone;
  label: string;
  hint: string;
}[] = [
  {
    value: COMPANION_TONE_WARM,
    label: "温和陪伴",
    hint: "体贴、好说话，像靠谱朋友",
  },
  {
    value: COMPANION_TONE_PLAYFUL,
    label: "轻松打趣",
    hint: "活泼一点，可轻幽默",
  },
  {
    value: COMPANION_TONE_CALM,
    label: "沉静克制",
    hint: "短句、少装饰，语气稳",
  },
  {
    value: COMPANION_TONE_EARNEST,
    label: "认真踏实",
    hint: "务实、少玩笑，把事说清",
  },
];

export function isCompanionTone(v: string): v is CompanionTone {
  return (COMPANION_TONES as readonly string[]).includes(v);
}

export function clampCompanionName(raw: string): string {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return DEFAULT_COMPANION_NAME;
  return t.slice(0, 16);
}

export function clampUserAddress(raw: string): string {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return DEFAULT_USER_ADDRESS;
  return t.slice(0, 16);
}

export function normalizeTone(raw: string | null | undefined): CompanionTone {
  if (raw && isCompanionTone(raw)) return raw;
  return DEFAULT_COMPANION_TONE;
}

const TONE_PROMPT: Record<CompanionTone, string> = {
  [COMPANION_TONE_WARM]:
    "语气：温和陪伴，像靠谱朋友；句子顺畅，可共情。",
  [COMPANION_TONE_PLAYFUL]:
    "语气：轻松打趣，可轻幽默、略活泼；勿油腻、勿连环整活。",
  [COMPANION_TONE_CALM]:
    "语气：沉静克制，偏短句；少装饰、少玩笑，把话说清楚即可。",
  [COMPANION_TONE_EARNEST]:
    "语气：认真踏实，务实少玩笑；把事实与下一步说清楚。",
};

/** 注入各子智能体 system 的人格段 */
export function buildPersonaPromptBlock(persona: CompanionPersona): string {
  const name = clampCompanionName(persona.companionName);
  const address = clampUserAddress(persona.userAddress);
  const tone = normalizeTone(persona.tone);
  return [
    "【你的人格设定】",
    `- 你的称呼是「${name}」（用户这样叫你；自称可用「我」或「${name}」）。`,
    `- 称呼用户为「${address}」（可自然穿插，不要每句都喊）。`,
    `- ${TONE_PROMPT[tone]}`,
    "- 表情要丰富自然：按语境选用多样 emoji，不要反复只用固定的那几个；也不要刷屏，每段适量即可。",
  ].join("\n");
}

export const DEFAULT_PERSONA: CompanionPersona = {
  companionName: DEFAULT_COMPANION_NAME,
  tone: DEFAULT_COMPANION_TONE,
  userAddress: DEFAULT_USER_ADDRESS,
  personaReady: false,
};
