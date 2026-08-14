import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const portalUsers = sqliteTable(
  "portal_users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: ["admin", "bidder", "developer"] }).notNull().default("bidder"),
    status: text("status", { enum: ["pending", "approved", "paused"] }).notNull().default("pending"),
    ratePerApplication: real("rate_per_application").notNull().default(0),
    bonusPerInterview: real("bonus_per_interview").notNull().default(0),
    nextPaymentDate: text("next_payment_date").notNull().default(""),
    paymentSchedule: text("payment_schedule").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    emailIdx: uniqueIndex("portal_users_email_idx").on(table.email),
    roleIdx: index("portal_users_role_idx").on(table.role),
    statusIdx: index("portal_users_status_idx").on(table.status),
  })
);

export const portalPaymentMethods = sqliteTable(
  "portal_payment_methods",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => portalUsers.id),
    method: text("method").notNull(),
    address: text("address").notNull(),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdx: index("portal_payment_methods_user_idx").on(table.userId),
    userMethodIdx: uniqueIndex("portal_payment_methods_user_method_idx").on(table.userId, table.method),
  })
);

export const portalWorkLogs = sqliteTable(
  "portal_work_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => portalUsers.id),
    workDate: text("work_date").notNull(),
    sheetLink: text("sheet_link").notNull(),
    appliedJobs: integer("applied_jobs").notNull().default(0),
    interviewsScheduled: integer("interviews_scheduled").notNull().default(0),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdx: index("portal_work_logs_user_idx").on(table.userId),
    userDateIdx: uniqueIndex("portal_work_logs_user_date_idx").on(table.userId, table.workDate),
  })
);

export const portalPayments = sqliteTable(
  "portal_payments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => portalUsers.id),
    periodStart: text("period_start").notNull(),
    periodEnd: text("period_end").notNull(),
    scheduledDate: text("scheduled_date").notNull(),
    amount: real("amount").notNull().default(0),
    status: text("status", { enum: ["scheduled", "paid"] }).notNull().default("scheduled"),
    paymentLink: text("payment_link").notNull().default(""),
    memo: text("memo").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdx: index("portal_payments_user_idx").on(table.userId),
    dateIdx: index("portal_payments_date_idx").on(table.scheduledDate),
  })
);

export const portalChatMessages = sqliteTable(
  "portal_chat_messages",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => portalUsers.id),
    authorName: text("author_name").notNull(),
    authorRole: text("author_role").notNull(),
    body: text("body").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    createdIdx: index("portal_chat_messages_created_idx").on(table.createdAt),
  })
);
