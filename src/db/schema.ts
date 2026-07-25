import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  type AnyPgColumn,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Better Auth + domain schema.
 * Phase 1–2: user/session/account/verification (+ theme/bio).
 * Phase 3: essay (流思笺).
 * Phase 4: archive_item (拾忆馆藏); essay.archived_at 写入。
 * Phase 6: plan (来日途·规划，V1 仅单次事件).
 * Phase 8: focus_session (凝时·顺钟) → archive focus_record.
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
  },
  (t) => [
    index("essay_user_archived_idx").on(t.userId, t.archivedAt),
    index("essay_user_updated_idx").on(t.userId, t.updatedAt),
  ],
);

/** Phase 4+: 拾忆馆藏条目（快照；类型可扩展） */
export const ARCHIVE_TYPE_ESSAY_SEDIMENT = "essay_sediment" as const;
/** Phase 7 写入；P5 仅分区空态预留 */
export const ARCHIVE_TYPE_PLAN_ARCHIVE = "plan_archive" as const;
/** Phase 8 写入；P5 仅分区空态预留 */
export const ARCHIVE_TYPE_FOCUS_RECORD = "focus_record" as const;
export const ARCHIVE_REASON_MANUAL = "manual" as const;
export const ARCHIVE_REASON_AUTO_48H = "auto_48h" as const;
/** Phase 7: 临期帖完成归档 */
export const ARCHIVE_REASON_PLAN_COMPLETE = "plan_complete" as const;
/** Phase 7: 逾期进站补算归档 */
export const ARCHIVE_REASON_PLAN_OVERDUE = "plan_overdue" as const;
/** Phase 8: 顺钟完整结束 → 凝录 */
export const ARCHIVE_REASON_FOCUS_COMPLETE = "focus_complete" as const;

export const archiveItem = pgTable(
  "archive_item",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** essay_sediment | plan_archive | focus_record | memory_fragment */
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
    archiveReason: text("archive_reason").notNull(),
    archivedAt: timestamp("archived_at").notNull(),
    /** 原随笔创建时间快照 */
    sourceCreatedAt: timestamp("source_created_at").notNull(),
    /** 原随笔最后编辑时间快照 */
    sourceUpdatedAt: timestamp("source_updated_at").notNull(),
  },
  (t) => [
    index("archive_item_user_archived_idx").on(t.userId, t.archivedAt),
    index("archive_item_user_type_idx").on(t.userId, t.type),
  ],
);

/** Phase 6: 来日途 · 规划（V1 仅 kind=once） */
export const PLAN_KIND_ONCE = "once" as const;
export const PLAN_STATUS_OPEN = "open" as const;
export const PLAN_STATUS_DONE = "done" as const;

export const plan = pgTable(
  "plan",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** once | vision | stage | cycle | capsule — 本阶段仅 once */
    kind: text("kind").notNull().default(PLAN_KIND_ONCE),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    /** 截止日期 */
    dueAt: timestamp("due_at").notNull(),
    /** Phase 7: 临期配，提前几天进入提醒窗（默认 1） */
    remindDays: integer("remind_days").notNull().default(1),
    /** open | done */
    status: text("status").notNull().default(PLAN_STATUS_OPEN),
    /** NULL = 仍在来日途；P7 归档馆藏时写入 */
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("plan_user_archived_idx").on(t.userId, t.archivedAt),
    index("plan_user_due_idx").on(t.userId, t.dueAt),
    index("plan_user_status_idx").on(t.userId, t.status),
  ],
);

/** Phase 8: 凝时会话（V1 仅顺钟 mode=forward） */
export const FOCUS_MODE_FORWARD = "forward" as const;
/** 跨阶段预留字面量；本阶段不写入 */
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
    /** forward | countdown — V1 仅 forward */
    mode: text("mode").notNull().default(FOCUS_MODE_FORWARD),
    /** running | paused | completed */
    status: text("status").notNull(),
    /** 已计入的专注毫秒（不含当前 running 段） */
    accumulatedMs: integer("accumulated_ms").notNull().default(0),
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
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  essays: many(essay),
  archiveItems: many(archiveItem),
  plans: many(plan),
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
}));

export const archiveItemRelations = relations(archiveItem, ({ one }) => ({
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
}));

export const planRelations = relations(plan, ({ one, many }) => ({
  user: one(user, {
    fields: [plan.userId],
    references: [user.id],
  }),
  archiveItems: many(archiveItem),
}));

export const focusSessionRelations = relations(focusSession, ({ one, many }) => ({
  user: one(user, {
    fields: [focusSession.userId],
    references: [user.id],
  }),
  archiveItems: many(archiveItem),
}));
