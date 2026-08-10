import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  type AnyPgColumn,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Better Auth + domain schema.
 * Phase 1–2: user/session/account/verification (+ theme/bio).
 * Phase 3: essay (随笔).
 * Phase 4: archive_item (馆藏); essay.archived_at 写入。
 * Phase 6: plan (来日途·规划，V1 仅单次事件).
 * Phase 8: focus_session (凝时·正向计时) → archive focus_record.
 * Phase 10: plan 丰满 + plan_task / daily_habit / daily_checkin.
 * Phase 11: essay.source_plan_id（随想）；临期延期/完成（不做关卡）。
 * Phase 12: archive_item 进知识库 / 记忆碎片图文；删除归档硬删流入类。
 * Phase 13: 标签 / 心情 / 素材匣（不做 plan_ref）。
 * Phase 14: 凝时倒计时 / 绑计划 / 唤起随笔溯源。
 * Phase 15: 时间线 / 情绪复盘 / 通知偏好（复用 archive_item.mood）。
 * Phase 16: 凝时勿扰 / 倒计时默认时长；桌面通知 + Cron 归档；专题随笔。
 * Phase 17: 邮箱验证 / 重置改密 / 注销（复用 email_verified + verification）。
 * Phase 18: 随笔富文本 HTML + essay_image；图片本地 uploads（暂不 S3）。
 * Phase 19: AI/RAG — user.ai_enabled；rag_document 对账（向量在 Milvus）。
 * Phase 21: AI 伴读 — 会话 / 消息 / 桌宠偏好 / 主动气泡事件。
 */

/** Phase 18: 正文格式 */
export const BODY_FORMAT_PLAIN = "plain" as const;
export const BODY_FORMAT_HTML = "html" as const;

/** Phase 16: 倒计时默认时长（25 分钟） */
export const DEFAULT_FOCUS_COUNTDOWN_MS = 1_500_000;

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** Phase 2: 深空夜色 night / 时光卡其 khaki */
  theme: text("theme").notNull().default("night"),
  /** Phase 2: 简介 / 签名 */
  bio: text("bio"),
  /**
   * Phase 4+: 随笔无编辑自动归档小时数（默认 48）
   * 设置页可改
   */
  essayIdleHours: integer("essay_idle_hours").notNull().default(48),
  /** Phase 15: 往年今日（今时际轻提示） */
  anniversaryRemind: boolean("anniversary_remind").notNull().default(false),
  /** Phase 15–16: 总通知开关（浏览器桌面通知） */
  notifyEnabled: boolean("notify_enabled").notNull().default(true),
  /** Phase 15–16: 临期提醒（浏览器桌面通知） */
  notifyDueReminder: boolean("notify_due_reminder").notNull().default(true),
  /** Phase 16: 勿扰 — 专注页弱化打断；专注中不弹桌面通知 */
  focusDnd: boolean("focus_dnd").notNull().default(false),
  /** Phase 16: 倒计时默认目标毫秒 */
  focusCountdownDefaultMs: integer("focus_countdown_default_ms")
    .notNull()
    .default(DEFAULT_FOCUS_COUNTDOWN_MS),
  /** Phase 19: 用户启用 AI（须同时 AI_ENABLED=true） */
  aiEnabled: boolean("ai_enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Phase 19: RAG 对账状态 */
export const RAG_CORPUS_USER = "user" as const;
export const RAG_CORPUS_PROJECT = "project" as const;
export const RAG_SOURCE_ARCHIVE = "archive_item" as const;
export const RAG_SOURCE_HANDBOOK = "handbook_section" as const;
export const RAG_STATUS_PENDING = "pending" as const;
export const RAG_STATUS_SYNCED = "synced" as const;
export const RAG_STATUS_ERROR = "error" as const;
export const RAG_STATUS_DELETED = "deleted" as const;

/**
 * Phase 19: RAG 对账薄表（无 embedding；向量在 Milvus）
 * source_id：馆藏 = archive_item.id；手册 = 稳定节 id。不建 FK 到 archive_item。
 */
export const ragDocument = pgTable(
  "rag_document",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    corpus: text("corpus").notNull(),
    sourceKind: text("source_kind").notNull(),
    sourceId: text("source_id").notNull(),
    archiveType: text("archive_type"),
    contentHash: text("content_hash").notNull(),
    chunkCount: integer("chunk_count").notNull().default(0),
    embeddingModel: text("embedding_model").notNull(),
    status: text("status").notNull().default(RAG_STATUS_PENDING),
    lastSyncedAt: timestamp("last_synced_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("rag_document_corpus_source_uidx").on(t.corpus, t.sourceId),
    index("rag_document_user_corpus_status_idx").on(
      t.userId,
      t.corpus,
      t.status,
    ),
    index("rag_document_status_updated_idx").on(t.status, t.updatedAt),
  ],
);

/** Phase 21: 伴读意图（路由输出） */
export const AI_INTENT_PRODUCT_HOWTO = "product_howto" as const;
export const AI_INTENT_USER_RECALL = "user_recall" as const;
export const AI_INTENT_DUE_COACH = "due_coach" as const;
export const AI_INTENT_ACTION_HINT = "action_hint" as const;
export const AI_INTENT_FOCUS_QUERY = "focus_query" as const;
export const AI_INTENT_MOOD_CARE = "mood_care" as const;
export const AI_INTENT_CHAT_COMPANION = "chat_companion" as const;
export const AI_INTENT_UNKNOWN = "unknown" as const;

/** Phase 21: 主动气泡类别 */
export const AI_PROACTIVE_WELCOME = "welcome" as const;
export const AI_PROACTIVE_TIP = "tip" as const;
export const AI_PROACTIVE_TIP_EXTRA = "tip_extra" as const;
export const AI_PROACTIVE_DUE_HINT = "due_hint" as const;
export const AI_PROACTIVE_MOOD_HINT = "mood_hint" as const;
export const AI_PROACTIVE_FOCUS_NUDGE = "focus_nudge" as const;
export const AI_PROACTIVE_CHECKIN_NUDGE = "checkin_nudge" as const;
export const AI_PROACTIVE_CHECKIN_CHEER = "checkin_cheer" as const;
export const AI_PROACTIVE_CHAT_INVITE = "chat_invite" as const;
export const DEFAULT_DAILY_BUBBLE_CAP = 5;

/** Phase 21: 伴读对话会话（勿与 Better Auth 的 session 混淆） */
export const aiConversation = pgTable(
  "ai_conversation",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title"),
    /** 超窗后压缩的短摘要 */
    summary: text("summary"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    closedAt: timestamp("closed_at"),
  },
  (t) => [
    index("ai_conversation_user_updated_idx").on(t.userId, t.updatedAt),
  ],
);

/** Phase 21: 伴读消息 */
export const aiMessage = pgTable(
  "ai_message",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => aiConversation.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    intent: text("intent"),
    meta: jsonb("meta").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("ai_message_conversation_created_idx").on(
      t.conversationId,
      t.createdAt,
    ),
  ],
);

/** Phase 21: 伴读语气预设 */
export const COMPANION_TONE_WARM = "warm" as const;
export const COMPANION_TONE_PLAYFUL = "playful" as const;
export const COMPANION_TONE_CALM = "calm" as const;
export const COMPANION_TONE_EARNEST = "earnest" as const;
export const COMPANION_TONES = [
  COMPANION_TONE_WARM,
  COMPANION_TONE_PLAYFUL,
  COMPANION_TONE_CALM,
  COMPANION_TONE_EARNEST,
] as const;
export type CompanionTone = (typeof COMPANION_TONES)[number];

export const DEFAULT_COMPANION_NAME = "小宇";
export const DEFAULT_COMPANION_TONE = COMPANION_TONE_WARM;
export const DEFAULT_USER_ADDRESS = "你";

/** Phase 21: 桌宠 / 主动气泡偏好（1:1 用户） */
export const aiCompanionPref = pgTable("ai_companion_pref", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  dnd: boolean("dnd").notNull().default(false),
  dailyBubbleCap: integer("daily_bubble_cap")
    .notNull()
    .default(DEFAULT_DAILY_BUBBLE_CAP),
  /** 静默开始：一天内分钟 0–1439；null=不设 */
  quietStartMin: integer("quiet_start_min"),
  quietEndMin: integer("quiet_end_min"),
  /** 伴读自称称呼 */
  companionName: text("companion_name")
    .notNull()
    .default(DEFAULT_COMPANION_NAME),
  /** warm | playful | calm | earnest */
  tone: text("tone").notNull().default(DEFAULT_COMPANION_TONE),
  /** 伴读如何称呼用户 */
  userAddress: text("user_address").notNull().default(DEFAULT_USER_ADDRESS),
  /** false：首次打开对话时引导设置人格 */
  personaReady: boolean("persona_ready").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Phase 21: 主动气泡事件（同日同类去重） */
export const aiProactiveEvent = pgTable(
  "ai_proactive_event",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    day: date("day").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown> | null>(),
    dismissedAt: timestamp("dismissed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ai_proactive_user_category_day_uidx").on(
      t.userId,
      t.category,
      t.day,
    ),
    index("ai_proactive_user_created_idx").on(t.userId, t.createdAt),
  ],
);

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Phase 16: 专题随笔的「专题」夹
 * 删除专题时：未归档篇由服务层级联删；已归档篇 folder_id 置空（onDelete set null）
 */
export const essayFolder = pgTable(
  "essay_folder",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** 可选说明 */
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("essay_folder_user_updated_idx").on(t.userId, t.updatedAt),
  ],
);

/** Phase 3: 随笔（流动中随笔）；folder_id 空=每日随笔 */
export const essay = pgTable(
  "essay",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    /** Phase 18: plain | html */
    bodyFormat: text("body_format").notNull().default(BODY_FORMAT_PLAIN),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    /** NULL = 流动中；Phase 4 归档时写入 */
    archivedAt: timestamp("archived_at"),
    /** Phase 11: 随想自来日途计划 */
    sourcePlanId: text("source_plan_id").references(
      (): AnyPgColumn => plan.id,
      { onDelete: "set null" },
    ),
    /** Phase 13: 固定心情 key（见 src/lib/moods.ts）；未选为 null */
    mood: text("mood"),
    /** Phase 14: 凝时中唤起新建的随笔溯源 */
    sourceFocusSessionId: text("source_focus_session_id").references(
      (): AnyPgColumn => focusSession.id,
      { onDelete: "set null" },
    ),
    /** Phase 16: 所属专题；null = 每日随笔（可自动自动归档） */
    folderId: text("folder_id").references(() => essayFolder.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    index("essay_user_archived_idx").on(t.userId, t.archivedAt),
    index("essay_user_updated_idx").on(t.userId, t.updatedAt),
    index("essay_user_source_plan_idx").on(t.userId, t.sourcePlanId),
    index("essay_user_mood_idx").on(t.userId, t.mood),
    index("essay_user_source_focus_idx").on(t.userId, t.sourceFocusSessionId),
    index("essay_user_folder_archived_idx").on(
      t.userId,
      t.folderId,
      t.archivedAt,
    ),
  ],
);

/**
 * Phase 18: 随笔插图登记（URL 在正文 HTML 内；删篇 cascade，本阶段不删磁盘文件）
 */
export const essayImage = pgTable(
  "essay_image",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    essayId: text("essay_id")
      .notNull()
      .references(() => essay.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("essay_image_user_essay_idx").on(t.userId, t.essayId)],
);

/** Phase 4+: 馆藏条目（快照；类型可扩展） */
export const ARCHIVE_TYPE_ESSAY_SEDIMENT = "essay_sediment" as const;
/** Phase 16: 专题整夹归档（父条；子篇见 archive_topic_essay） */
export const ARCHIVE_TYPE_ESSAY_TOPIC = "essay_topic_archive" as const;
/** Phase 7 写入；P5 仅分区空态预留 */
export const ARCHIVE_TYPE_PLAN_ARCHIVE = "plan_archive" as const;
/** Phase 10: 周期计划系列计次归档（同 series 一条） */
export const ARCHIVE_TYPE_PLAN_CYCLE = "plan_cycle_archive" as const;
/** Phase 10: 每日打卡习惯计次归档（同 habit 一条） */
export const ARCHIVE_TYPE_DAILY_CHECKIN = "daily_checkin_archive" as const;
/** Phase 8 写入；P5 仅分区空态预留 */
export const ARCHIVE_TYPE_FOCUS_RECORD = "focus_record" as const;
/** Phase 12: 用户上传的记忆碎片 */
export const ARCHIVE_TYPE_MEMORY_FRAGMENT = "memory_fragment" as const;
export const ARCHIVE_REASON_MANUAL = "manual" as const;
export const ARCHIVE_REASON_AUTO_48H = "auto_48h" as const;
/** Phase 7: 临期提醒完成归档 */
export const ARCHIVE_REASON_PLAN_COMPLETE = "plan_complete" as const;
/** Phase 7: 逾期进站补算归档 */
export const ARCHIVE_REASON_PLAN_OVERDUE = "plan_overdue" as const;
/** Phase 10: 周期计划当期结束滚下一期 */
export const ARCHIVE_REASON_PLAN_CYCLE_ROLLOVER = "plan_cycle_rollover" as const;
/** Phase 10: 每日打卡归档 */
export const ARCHIVE_REASON_DAILY_CHECKIN = "daily_checkin" as const;
/** Phase 8: 正向计时完整结束 → 专注记录 */
export const ARCHIVE_REASON_FOCUS_COMPLETE = "focus_complete" as const;
/** Phase 12: 记忆碎片上传 */
export const ARCHIVE_REASON_USER_UPLOAD = "user_upload" as const;

/**
 * 删除归档可删类型（硬删馆藏行）。
 * 规划归档（plan_archive）删除归档时会同步删除已完成的来日途计划；
 * 不删除未完成计划与每日打卡本体。打卡本账仍用「取消打卡」回退次数。
 */
export const WIPE_ARCHIVE_TYPES = [
  ARCHIVE_TYPE_ESSAY_SEDIMENT,
  ARCHIVE_TYPE_ESSAY_TOPIC,
  ARCHIVE_TYPE_PLAN_ARCHIVE,
  ARCHIVE_TYPE_FOCUS_RECORD,
  ARCHIVE_TYPE_MEMORY_FRAGMENT,
  ARCHIVE_TYPE_PLAN_CYCLE,
  ARCHIVE_TYPE_DAILY_CHECKIN,
] as const;

export const archiveItem = pgTable(
  "archive_item",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** essay_sediment | essay_topic_archive | plan_archive | plan_cycle_archive | daily_checkin_archive | focus_record | memory_fragment */
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    /** Phase 18: 随笔归档快照格式 plain | html */
    bodyFormat: text("body_format").notNull().default(BODY_FORMAT_PLAIN),
    sourceModule: text("source_module").notNull(),
    sourceEssayId: text("source_essay_id").references(() => essay.id, {
      onDelete: "set null",
    }),
    /** Phase 7: 规划归档溯源 */
    sourcePlanId: text("source_plan_id").references(
      (): AnyPgColumn => plan.id,
      { onDelete: "set null" },
    ),
    /** Phase 8: 专注记录溯源 */
    sourceFocusSessionId: text("source_focus_session_id").references(
      (): AnyPgColumn => focusSession.id,
      { onDelete: "set null" },
    ),
    /** Phase 10: 每日打卡习惯溯源 */
    sourceHabitId: text("source_habit_id").references(
      (): AnyPgColumn => dailyHabit.id,
      { onDelete: "set null" },
    ),
    /** Phase 10: 周期计划系列 id（与 plan.series_id 对齐） */
    sourceSeriesId: text("source_series_id"),
    /** Phase 10: 周期计划 / 每日打卡累计次数 */
    cycleCount: integer("cycle_count"),
    /** Phase 10: 周期计划单位快照 day|week|month|year|custom */
    cycleUnit: text("cycle_unit"),
    /** Phase 10+: 自定义间隔天数快照（cycle_unit=custom） */
    cycleEveryDays: integer("cycle_every_days"),
    archiveReason: text("archive_reason").notNull(),
    archivedAt: timestamp("archived_at").notNull(),
    /** 原随笔创建时间快照 */
    sourceCreatedAt: timestamp("source_created_at").notNull(),
    /** 原随笔最后编辑时间快照 */
    sourceUpdatedAt: timestamp("source_updated_at").notNull(),
    /** Phase 12: 进知识库（知识库标记，无向量）；归档默认 true，记忆碎片显式 false */
    inKnowledge: boolean("in_knowledge").notNull().default(true),
    /** Phase 12: 进知识库时间 */
    keptAt: timestamp("kept_at"),
    /** Phase 12: 记忆碎片图片 URL */
    imageUrl: text("image_url"),
    /** Phase 12: 对象存储 / 本地 key，删图用 */
    imageKey: text("image_key"),
    /** Phase 12: 碎片可编辑 */
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    /** Phase 13: 归档时从随笔/计划快照的心情 key */
    mood: text("mood"),
  },
  (t) => [
    index("archive_item_user_archived_idx").on(t.userId, t.archivedAt),
    index("archive_item_user_type_idx").on(t.userId, t.type),
    index("archive_item_user_knowledge_idx").on(t.userId, t.inKnowledge),
    index("archive_item_user_type_archived_idx").on(
      t.userId,
      t.type,
      t.archivedAt,
    ),
    index("archive_item_user_mood_idx").on(t.userId, t.mood),
    uniqueIndex("archive_item_user_series_uidx").on(t.userId, t.sourceSeriesId),
    uniqueIndex("archive_item_user_habit_uidx").on(t.userId, t.sourceHabitId),
  ],
);

/**
 * Phase 16: 专题归档夹内篇快照（父条 type=essay_topic_archive）
 * 删除归档父条时 cascade 删除。
 */
export const archiveTopicEssay = pgTable(
  "archive_topic_essay",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    archiveItemId: text("archive_item_id")
      .notNull()
      .references(() => archiveItem.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    /** Phase 18 */
    bodyFormat: text("body_format").notNull().default(BODY_FORMAT_PLAIN),
    mood: text("mood"),
    sourceEssayId: text("source_essay_id").references(() => essay.id, {
      onDelete: "set null",
    }),
    sourceCreatedAt: timestamp("source_created_at").notNull(),
    sourceUpdatedAt: timestamp("source_updated_at").notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (t) => [
    index("archive_topic_essay_user_archive_idx").on(
      t.userId,
      t.archiveItemId,
    ),
  ],
);

/** Phase 6+: 来日途 · 规划 */
export const PLAN_KIND_ONCE = "once" as const;
export const PLAN_KIND_VISION = "vision" as const;
export const PLAN_KIND_STAGE = "stage" as const;
export const PLAN_KIND_CYCLE = "cycle" as const;
export const PLAN_KIND_CAPSULE = "capsule" as const;
export const PLAN_STATUS_OPEN = "open" as const;
export const PLAN_STATUS_DONE = "done" as const;
export const CYCLE_UNIT_DAY = "day" as const;
export const CYCLE_UNIT_WEEK = "week" as const;
export const CYCLE_UNIT_MONTH = "month" as const;
export const CYCLE_UNIT_YEAR = "year" as const;
/** 自定义间隔天数（配合 plan.cycle_every_days） */
export const CYCLE_UNIT_CUSTOM = "custom" as const;
export const PLAN_TASK_STATUS_OPEN = "open" as const;
export const PLAN_TASK_STATUS_DONE = "done" as const;
export const PLAN_TASK_STATUS_DEFERRED = "deferred" as const;

export const plan = pgTable(
  "plan",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** once | vision | stage | cycle | capsule */
    kind: text("kind").notNull().default(PLAN_KIND_ONCE),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    /** 截止日期 / 周期计划期末 / 胶囊解锁日；愿景可空 */
    dueAt: timestamp("due_at"),
    /** Phase 7: 提前提醒，提前几天进入提醒窗（默认 1） */
    remindDays: integer("remind_days").notNull().default(1),
    /** open | done */
    status: text("status").notNull().default(PLAN_STATUS_OPEN),
    /** NULL = 仍在来日途；归档馆藏时写入 */
    archivedAt: timestamp("archived_at"),
    /** Phase 10: 提炼自随笔 */
    sourceEssayId: text("source_essay_id").references(() => essay.id, {
      onDelete: "set null",
    }),
    /** Phase 10: 周期计划单位 day|week|month|year|custom */
    cycleUnit: text("cycle_unit"),
    /** Phase 10+: 自定义间隔天数；仅 cycle_unit=custom 时使用（2–365） */
    cycleEveryDays: integer("cycle_every_days"),
    /** Phase 10: 周期计划系列 id（同系列共享） */
    seriesId: text("series_id"),
    /** Phase 10: 阶段任务挂愿景等 */
    parentPlanId: text("parent_plan_id").references(
      (): AnyPgColumn => plan.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    /** Phase 13: 固定心情 key（见 src/lib/moods.ts） */
    mood: text("mood"),
  },
  (t) => [
    index("plan_user_archived_idx").on(t.userId, t.archivedAt),
    index("plan_user_due_idx").on(t.userId, t.dueAt),
    index("plan_user_status_idx").on(t.userId, t.status),
    index("plan_user_source_essay_idx").on(t.userId, t.sourceEssayId),
    index("plan_user_kind_idx").on(t.userId, t.kind),
    index("plan_user_series_idx").on(t.userId, t.seriesId),
    index("plan_user_mood_idx").on(t.userId, t.mood),
  ],
);

/** Phase 13: 标签字典（软停用，不硬删） */
export const tag = pgTable(
  "tag",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("tag_user_name_uidx").on(t.userId, t.name),
    index("tag_user_active_idx").on(t.userId, t.active),
  ],
);

/** Phase 13: 流动随笔 ↔ 标签 */
export const essayTag = pgTable(
  "essay_tag",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    essayId: text("essay_id")
      .notNull()
      .references(() => essay.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.essayId, t.tagId] }),
    index("essay_tag_user_tag_idx").on(t.userId, t.tagId),
  ],
);

/** Phase 13: 规划 ↔ 标签 */
export const planTag = pgTable(
  "plan_tag",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.planId, t.tagId] }),
    index("plan_tag_user_tag_idx").on(t.userId, t.tagId),
  ],
);

/** Phase 13: 馆藏 ↔ 标签（归档时写入，含签名快照） */
export const archiveItemTag = pgTable(
  "archive_item_tag",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    archiveItemId: text("archive_item_id")
      .notNull()
      .references(() => archiveItem.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    nameSnapshot: text("name_snapshot").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.archiveItemId, t.tagId] }),
    index("archive_item_tag_user_tag_idx").on(t.userId, t.tagId),
    index("archive_item_tag_user_name_idx").on(t.userId, t.nameSnapshot),
  ],
);

/** Phase 13: 素材匣（正文副本；源删除不删副本） */
export const MATERIAL_SOURCE_ESSAY = "essay" as const;
export const MATERIAL_SOURCE_ARCHIVE = "archive_item" as const;
export const MATERIAL_SOURCE_PLAN = "plan" as const;
export const MATERIAL_SOURCE_MANUAL = "manual" as const;

export const material = pgTable(
  "material",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    title: text("title").notNull().default(""),
    /** essay | archive_item | plan | manual */
    sourceKind: text("source_kind").notNull(),
    sourceEssayId: text("source_essay_id").references(() => essay.id, {
      onDelete: "set null",
    }),
    sourceArchiveItemId: text("source_archive_item_id").references(
      () => archiveItem.id,
      { onDelete: "set null" },
    ),
    sourcePlanId: text("source_plan_id").references(() => plan.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("material_user_created_idx").on(t.userId, t.createdAt)],
);

/** Phase 10: 规划子任务 */
export const planTask = pgTable(
  "plan_task",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** open | done | deferred（周期计划子任务以打卡次数为主，不依赖 done） */
    status: text("status").notNull().default(PLAN_TASK_STATUS_OPEN),
    /** 打卡累计次数；与周期计划「完成本期」无关 */
    checkCount: integer("check_count").notNull().default(0),
    /** 最近打卡本地日 YYYY-MM-DD；同一天不可再打 */
    lastCheckinDate: text("last_checkin_date"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("plan_task_user_plan_idx").on(t.userId, t.planId),
    index("plan_task_plan_sort_idx").on(t.planId, t.sortOrder),
  ],
);

/** Phase 10: 每日打卡习惯模板 */
export const dailyHabit = pgTable(
  "daily_habit",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("daily_habit_user_active_idx").on(t.userId, t.active)],
);

/** Phase 10: 每日打卡 */
export const dailyCheckin = pgTable(
  "daily_checkin",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    habitId: text("habit_id")
      .notNull()
      .references(() => dailyHabit.id, { onDelete: "cascade" }),
    /** YYYY-MM-DD 本地日历日 */
    checkinDate: text("checkin_date").notNull(),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("daily_checkin_habit_date_uidx").on(t.habitId, t.checkinDate),
    index("daily_checkin_user_date_idx").on(t.userId, t.checkinDate),
  ],
);

/** Phase 8+: 凝时会话 mode */
export const FOCUS_MODE_FORWARD = "forward" as const;
/** Phase 14: 倒计时 */
export const FOCUS_MODE_COUNTDOWN = "countdown" as const;
export const FOCUS_STATUS_RUNNING = "running" as const;
export const FOCUS_STATUS_PAUSED = "paused" as const;
export const FOCUS_STATUS_COMPLETED = "completed" as const;

export const focusSession = pgTable(
  "focus_session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** forward | countdown */
    mode: text("mode").notNull().default(FOCUS_MODE_FORWARD),
    /** running | paused | completed */
    status: text("status").notNull(),
    /** 已计入的专注毫秒（不含当前 running 段） */
    accumulatedMs: integer("accumulated_ms").notNull().default(0),
    /** Phase 14: 倒计时目标毫秒；正向计时为 null */
    targetMs: integer("target_ms"),
    /** Phase 14: 绑定来日途计划（规划 / 当日周期计划） */
    planId: text("plan_id").references((): AnyPgColumn => plan.id, {
      onDelete: "set null",
    }),
    /** Phase 14: 绑定未完成每日打卡（与 plan_id 互斥） */
    habitId: text("habit_id").references((): AnyPgColumn => dailyHabit.id, {
      onDelete: "set null",
    }),
    /** 当前 running 段起点；暂停 / 结束时清空 */
    runningSince: timestamp("running_since"),
    startedAt: timestamp("started_at").notNull(),
    endedAt: timestamp("ended_at"),
    title: text("title").notNull().default(""),
    reflection: text("reflection").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("focus_session_user_status_idx").on(t.userId, t.status),
    index("focus_session_user_ended_idx").on(t.userId, t.endedAt),
    index("focus_session_user_plan_idx").on(t.userId, t.planId),
    index("focus_session_user_habit_idx").on(t.userId, t.habitId),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  essays: many(essay),
  essayFolders: many(essayFolder),
  essayImages: many(essayImage),
  archiveItems: many(archiveItem),
  archiveTopicEssays: many(archiveTopicEssay),
  plans: many(plan),
  planTasks: many(planTask),
  dailyHabits: many(dailyHabit),
  dailyCheckins: many(dailyCheckin),
  focusSessions: many(focusSession),
}));

export const essayFolderRelations = relations(essayFolder, ({ one, many }) => ({
  user: one(user, {
    fields: [essayFolder.userId],
    references: [user.id],
  }),
  essays: many(essay),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const essayRelations = relations(essay, ({ one, many }) => ({
  user: one(user, {
    fields: [essay.userId],
    references: [user.id],
  }),
  folder: one(essayFolder, {
    fields: [essay.folderId],
    references: [essayFolder.id],
  }),
  images: many(essayImage),
  archiveItems: many(archiveItem),
  refinedPlans: many(plan),
  sourcePlan: one(plan, {
    fields: [essay.sourcePlanId],
    references: [plan.id],
    relationName: "essay_from_plan",
  }),
  sourceFocusSession: one(focusSession, {
    fields: [essay.sourceFocusSessionId],
    references: [focusSession.id],
    relationName: "essay_from_focus",
  }),
  essayTags: many(essayTag),
}));

export const essayImageRelations = relations(essayImage, ({ one }) => ({
  user: one(user, {
    fields: [essayImage.userId],
    references: [user.id],
  }),
  essay: one(essay, {
    fields: [essayImage.essayId],
    references: [essay.id],
  }),
}));

export const archiveItemRelations = relations(archiveItem, ({ one, many }) => ({
  user: one(user, {
    fields: [archiveItem.userId],
    references: [user.id],
  }),
  sourceEssay: one(essay, {
    fields: [archiveItem.sourceEssayId],
    references: [essay.id],
  }),
  sourcePlan: one(plan, {
    fields: [archiveItem.sourcePlanId],
    references: [plan.id],
  }),
  sourceFocusSession: one(focusSession, {
    fields: [archiveItem.sourceFocusSessionId],
    references: [focusSession.id],
  }),
  sourceHabit: one(dailyHabit, {
    fields: [archiveItem.sourceHabitId],
    references: [dailyHabit.id],
  }),
  archiveItemTags: many(archiveItemTag),
  topicEssays: many(archiveTopicEssay),
}));

export const archiveTopicEssayRelations = relations(
  archiveTopicEssay,
  ({ one }) => ({
    user: one(user, {
      fields: [archiveTopicEssay.userId],
      references: [user.id],
    }),
    archiveItem: one(archiveItem, {
      fields: [archiveTopicEssay.archiveItemId],
      references: [archiveItem.id],
    }),
    sourceEssay: one(essay, {
      fields: [archiveTopicEssay.sourceEssayId],
      references: [essay.id],
    }),
  }),
);

export const planRelations = relations(plan, ({ one, many }) => ({
  user: one(user, {
    fields: [plan.userId],
    references: [user.id],
  }),
  sourceEssay: one(essay, {
    fields: [plan.sourceEssayId],
    references: [essay.id],
  }),
  yuanxiangEssays: many(essay, { relationName: "essay_from_plan" }),
  parentPlan: one(plan, {
    fields: [plan.parentPlanId],
    references: [plan.id],
    relationName: "plan_parent",
  }),
  childPlans: many(plan, { relationName: "plan_parent" }),
  archiveItems: many(archiveItem),
  tasks: many(planTask),
  planTags: many(planTag),
  focusSessions: many(focusSession),
}));

export const tagRelations = relations(tag, ({ one, many }) => ({
  user: one(user, {
    fields: [tag.userId],
    references: [user.id],
  }),
  essayTags: many(essayTag),
  planTags: many(planTag),
  archiveItemTags: many(archiveItemTag),
}));

export const essayTagRelations = relations(essayTag, ({ one }) => ({
  user: one(user, {
    fields: [essayTag.userId],
    references: [user.id],
  }),
  essay: one(essay, {
    fields: [essayTag.essayId],
    references: [essay.id],
  }),
  tag: one(tag, {
    fields: [essayTag.tagId],
    references: [tag.id],
  }),
}));

export const planTagRelations = relations(planTag, ({ one }) => ({
  user: one(user, {
    fields: [planTag.userId],
    references: [user.id],
  }),
  plan: one(plan, {
    fields: [planTag.planId],
    references: [plan.id],
  }),
  tag: one(tag, {
    fields: [planTag.tagId],
    references: [tag.id],
  }),
}));

export const archiveItemTagRelations = relations(archiveItemTag, ({ one }) => ({
  user: one(user, {
    fields: [archiveItemTag.userId],
    references: [user.id],
  }),
  archiveItem: one(archiveItem, {
    fields: [archiveItemTag.archiveItemId],
    references: [archiveItem.id],
  }),
  tag: one(tag, {
    fields: [archiveItemTag.tagId],
    references: [tag.id],
  }),
}));

export const materialRelations = relations(material, ({ one }) => ({
  user: one(user, {
    fields: [material.userId],
    references: [user.id],
  }),
  sourceEssay: one(essay, {
    fields: [material.sourceEssayId],
    references: [essay.id],
  }),
  sourceArchiveItem: one(archiveItem, {
    fields: [material.sourceArchiveItemId],
    references: [archiveItem.id],
  }),
  sourcePlan: one(plan, {
    fields: [material.sourcePlanId],
    references: [plan.id],
  }),
}));

export const planTaskRelations = relations(planTask, ({ one }) => ({
  user: one(user, {
    fields: [planTask.userId],
    references: [user.id],
  }),
  plan: one(plan, {
    fields: [planTask.planId],
    references: [plan.id],
  }),
}));

export const dailyHabitRelations = relations(dailyHabit, ({ one, many }) => ({
  user: one(user, {
    fields: [dailyHabit.userId],
    references: [user.id],
  }),
  checkins: many(dailyCheckin),
}));

export const dailyCheckinRelations = relations(dailyCheckin, ({ one }) => ({
  user: one(user, {
    fields: [dailyCheckin.userId],
    references: [user.id],
  }),
  habit: one(dailyHabit, {
    fields: [dailyCheckin.habitId],
    references: [dailyHabit.id],
  }),
}));

export const focusSessionRelations = relations(focusSession, ({ one, many }) => ({
  user: one(user, {
    fields: [focusSession.userId],
    references: [user.id],
  }),
  plan: one(plan, {
    fields: [focusSession.planId],
    references: [plan.id],
  }),
  habit: one(dailyHabit, {
    fields: [focusSession.habitId],
    references: [dailyHabit.id],
  }),
  archiveItems: many(archiveItem),
  essays: many(essay, { relationName: "essay_from_focus" }),
}));

export const aiConversationRelations = relations(
  aiConversation,
  ({ one, many }) => ({
    user: one(user, {
      fields: [aiConversation.userId],
      references: [user.id],
    }),
    messages: many(aiMessage),
  }),
);

export const aiMessageRelations = relations(aiMessage, ({ one }) => ({
  conversation: one(aiConversation, {
    fields: [aiMessage.conversationId],
    references: [aiConversation.id],
  }),
}));

export const aiCompanionPrefRelations = relations(
  aiCompanionPref,
  ({ one }) => ({
    user: one(user, {
      fields: [aiCompanionPref.userId],
      references: [user.id],
    }),
  }),
);

export const aiProactiveEventRelations = relations(
  aiProactiveEvent,
  ({ one }) => ({
    user: one(user, {
      fields: [aiProactiveEvent.userId],
      references: [user.id],
    }),
  }),
);
