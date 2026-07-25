import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Better Auth + domain schema.
 * Phase 1–2: user/session/account/verification (+ theme/bio).
 * Phase 3: essay (流思笺).
 * Phase 4: archive_item (拾忆馆藏); essay.archived_at 写入。
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

/** Phase 4: 拾忆馆藏条目（快照；类型可扩展） */
export const ARCHIVE_TYPE_ESSAY_SEDIMENT = "essay_sediment" as const;
export const ARCHIVE_REASON_MANUAL = "manual" as const;
export const ARCHIVE_REASON_AUTO_48H = "auto_48h" as const;

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

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  essays: many(essay),
  archiveItems: many(archiveItem),
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
}));
