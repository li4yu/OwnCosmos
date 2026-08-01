import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
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
 * Phase 3: essay (流思笺).
 * Phase 4: archive_item (拾忆馆藏); essay.archived_at 写入。
 * Phase 6: plan (来日途·规划，V1 仅单次事件).
 * Phase 8: focus_session (凝时·顺钟) → archive focus_record.
 * Phase 10: plan 丰满 + plan_task / daily_habit / daily_checkin.
 * Phase 11: essay.source_plan_id（缘想）；临期延期/完成（不做关卡）。
 * Phase 12: archive_item 藏忆 / 记忆碎片图文；抹忆硬删流入类。
 * Phase 13: 绪签 / 心情 / 素材匣（不做 plan_ref）。
 * Phase 14: 凝时逆漏 / 绑计划 / 唤起随笔溯源。
 */

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
   * Phase 4+: 流思笺无编辑自动归档小时数（默认 48）
   * 设置页可改
   */
  essayIdleHours: integer("essay_idle_hours").notNull().default(48),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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

/** Phase 3: 流思笺（流动中随笔） */
export const essay = pgTable(
  "essay",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    /** NULL = 流动中；Phase 4 归档时写入 */
    archivedAt: timestamp("archived_at"),
    /** Phase 11: 缘想自来日途计划 */
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
  },
  (t) => [
    index("essay_user_archived_idx").on(t.userId, t.archivedAt),
    index("essay_user_updated_idx").on(t.userId, t.updatedAt),
    index("essay_user_source_plan_idx").on(t.userId, t.sourcePlanId),
    index("essay_user_mood_idx").on(t.userId, t.mood),
    index("essay_user_source_focus_idx").on(t.userId, t.sourceFocusSessionId),
  ],
);

/** Phase 4+: 拾忆馆藏条目（快照；类型可扩展） */
export const ARCHIVE_TYPE_ESSAY_SEDIMENT = "essay_sediment" as const;
/** Phase 7 写入；P5 仅分区空态预留 */
export const ARCHIVE_TYPE_PLAN_ARCHIVE = "plan_archive" as const;
/** Phase 10: 轮期系列计次归档（同 series 一条） */
export const ARCHIVE_TYPE_PLAN_CYCLE = "plan_cycle_archive" as const;
/** Phase 10: 日课习惯计次归档（同 habit 一条） */
export const ARCHIVE_TYPE_DAILY_CHECKIN = "daily_checkin_archive" as const;
/** Phase 8 写入；P5 仅分区空态预留 */
export const ARCHIVE_TYPE_FOCUS_RECORD = "focus_record" as const;
/** Phase 12: 用户上传的记忆碎片 */
export const ARCHIVE_TYPE_MEMORY_FRAGMENT = "memory_fragment" as const;
export const ARCHIVE_REASON_MANUAL = "manual" as const;
export const ARCHIVE_REASON_AUTO_48H = "auto_48h" as const;
/** Phase 7: 临期帖完成归档 */
export const ARCHIVE_REASON_PLAN_COMPLETE = "plan_complete" as const;
/** Phase 7: 逾期进站补算归档 */
export const ARCHIVE_REASON_PLAN_OVERDUE = "plan_overdue" as const;
/** Phase 10: 轮期当期结束滚下一期 */
export const ARCHIVE_REASON_PLAN_CYCLE_ROLLOVER = "plan_cycle_rollover" as const;
/** Phase 10: 日课打卡归档 */
export const ARCHIVE_REASON_DAILY_CHECKIN = "daily_checkin" as const;
/** Phase 8: 顺钟完整结束 → 凝录 */
export const ARCHIVE_REASON_FOCUS_COMPLETE = "focus_complete" as const;
/** Phase 12: 记忆碎片上传 */
export const ARCHIVE_REASON_USER_UPLOAD = "user_upload" as const;

/** 抹忆可删的流入类（不含轮期 / 日课 / 碎片） */
export const WIPE_ARCHIVE_TYPES = [
  ARCHIVE_TYPE_ESSAY_SEDIMENT,
  ARCHIVE_TYPE_PLAN_ARCHIVE,
  ARCHIVE_TYPE_FOCUS_RECORD,
] as const;

export const archiveItem = pgTable(
  "archive_item",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** essay_sediment | plan_archive | plan_cycle_archive | daily_checkin_archive | focus_record | memory_fragment */
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    sourceModule: text("source_module").notNull(),
    sourceEssayId: text("source_essay_id").references(() => essay.id, {
      onDelete: "set null",
    }),
    /** Phase 7: 规划归档溯源 */
    sourcePlanId: text("source_plan_id").references(
      (): AnyPgColumn => plan.id,
      { onDelete: "set null" },
    ),
    /** Phase 8: 凝录溯源 */
    sourceFocusSessionId: text("source_focus_session_id").references(
      (): AnyPgColumn => focusSession.id,
      { onDelete: "set null" },
    ),
    /** Phase 10: 日课习惯溯源 */
    sourceHabitId: text("source_habit_id").references(
      (): AnyPgColumn => dailyHabit.id,
      { onDelete: "set null" },
    ),
    /** Phase 10: 轮期系列 id（与 plan.series_id 对齐） */
    sourceSeriesId: text("source_series_id"),
    /** Phase 10: 轮期 / 日课累计次数 */
    cycleCount: integer("cycle_count"),
    /** Phase 10: 轮期单位快照 day|week|month|year|custom */
    cycleUnit: text("cycle_unit"),
    /** Phase 10+: 自定义间隔天数快照（cycle_unit=custom） */
    cycleEveryDays: integer("cycle_every_days"),
    archiveReason: text("archive_reason").notNull(),
    archivedAt: timestamp("archived_at").notNull(),
    /** 原随笔创建时间快照 */
    sourceCreatedAt: timestamp("source_created_at").notNull(),
    /** 原随笔最后编辑时间快照 */
    sourceUpdatedAt: timestamp("source_updated_at").notNull(),
    /** Phase 12: 藏忆（知识库标记，无向量）；归档默认 true，记忆碎片显式 false */
    inKnowledge: boolean("in_knowledge").notNull().default(true),
    /** Phase 12: 藏忆时间 */
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
    /** 截止日期 / 轮期期末 / 胶囊解锁日；愿景可空 */
    dueAt: timestamp("due_at"),
    /** Phase 7: 临期配，提前几天进入提醒窗（默认 1） */
    remindDays: integer("remind_days").notNull().default(1),
    /** open | done */
    status: text("status").notNull().default(PLAN_STATUS_OPEN),
    /** NULL = 仍在来日途；归档馆藏时写入 */
    archivedAt: timestamp("archived_at"),
    /** Phase 10: 提炼自流思笺 */
    sourceEssayId: text("source_essay_id").references(() => essay.id, {
      onDelete: "set null",
    }),
    /** Phase 10: 轮期单位 day|week|month|year|custom */
    cycleUnit: text("cycle_unit"),
    /** Phase 10+: 自定义间隔天数；仅 cycle_unit=custom 时使用（2–365） */
    cycleEveryDays: integer("cycle_every_days"),
    /** Phase 10: 轮期系列 id（同系列共享） */
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

/** Phase 13: 绪签字典（软停用，不硬删） */
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

/** Phase 13: 流动随笔 ↔ 绪签 */
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

/** Phase 13: 规划 ↔ 绪签 */
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

/** Phase 13: 馆藏 ↔ 绪签（归档时写入，含签名快照） */
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
    /** open | done | deferred（轮期子任务以打卡次数为主，不依赖 done） */
    status: text("status").notNull().default(PLAN_TASK_STATUS_OPEN),
    /** 打卡累计次数；与轮期「完成本期」无关 */
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

/** Phase 10: 日课习惯模板 */
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

/** Phase 10: 日课打卡 */
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
/** Phase 14: 逆漏 */
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
    /** Phase 14: 逆漏目标毫秒；顺钟为 null */
    targetMs: integer("target_ms"),
    /** Phase 14: 绑定来日途计划（规划 / 当日轮期） */
    planId: text("plan_id").references((): AnyPgColumn => plan.id, {
      onDelete: "set null",
    }),
    /** Phase 14: 绑定未完成日课（与 plan_id 互斥） */
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
  archiveItems: many(archiveItem),
  plans: many(plan),
  planTasks: many(planTask),
  dailyHabits: many(dailyHabit),
  dailyCheckins: many(dailyCheckin),
  focusSessions: many(focusSession),
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
}));

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
