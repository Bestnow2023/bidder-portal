import { env } from "cloudflare:workers";
import type {
  ChatMessage,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
  PortalData,
  PortalUser,
  Role,
  UserStatus,
  WorkLog,
} from "../app/portal-types";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  rate_per_application: number;
  bonus_per_interview: number;
  next_payment_date: string;
  payment_schedule: string;
  created_at: string;
  updated_at: string;
};

type MethodRow = {
  id: string;
  user_id: string;
  method: string;
  address: string;
  is_primary: number;
  created_at: string;
  updated_at: string;
};

type WorkLogRow = {
  id: string;
  user_id: string;
  work_date: string;
  sheet_link: string;
  applied_jobs: number;
  interviews_scheduled: number;
  notes: string;
  created_at: string;
  updated_at: string;
};

type PaymentRow = {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  scheduled_date: string;
  amount: number;
  status: PaymentStatus;
  payment_link: string;
  memo: string;
  created_at: string;
  updated_at: string;
};

type ChatRow = {
  id: string;
  user_id: string;
  author_name: string;
  author_role: Role;
  body: string;
  created_at: string;
};

const ADMIN_EMAIL = "admin@portal.local";

function getBinding() {
  if (!env.DB) {
    throw new Error("Database binding DB is unavailable.");
  }

  return env.DB;
}

function now() {
  return new Date().toISOString();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function cleanNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function displayNameFromEmail(email: string) {
  const local = email.split("@")[0] || "User";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapUser(row: UserRow): PortalUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    ratePerApplication: Number(row.rate_per_application || 0),
    bonusPerInterview: Number(row.bonus_per_interview || 0),
    nextPaymentDate: row.next_payment_date || "",
    paymentSchedule: row.payment_schedule || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMethod(row: MethodRow): PaymentMethod {
  return {
    id: row.id,
    userId: row.user_id,
    method: row.method,
    address: row.address,
    isPrimary: Boolean(row.is_primary),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWorkLog(row: WorkLogRow): WorkLog {
  return {
    id: row.id,
    userId: row.user_id,
    workDate: row.work_date,
    sheetLink: row.sheet_link,
    appliedJobs: Number(row.applied_jobs || 0),
    interviewsScheduled: Number(row.interviews_scheduled || 0),
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPayment(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    userId: row.user_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    scheduledDate: row.scheduled_date,
    amount: Number(row.amount || 0),
    status: row.status,
    paymentLink: row.payment_link || "",
    memo: row.memo || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapChat(row: ChatRow): ChatMessage {
  return {
    id: row.id,
    userId: row.user_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function ensurePortalSchema() {
  const db = getBinding();

  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS portal_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'bidder',
      status TEXT NOT NULL DEFAULT 'pending',
      rate_per_application REAL NOT NULL DEFAULT 0,
      bonus_per_interview REAL NOT NULL DEFAULT 0,
      next_payment_date TEXT NOT NULL DEFAULT '',
      payment_schedule TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS portal_users_role_idx ON portal_users (role)"),
    db.prepare("CREATE INDEX IF NOT EXISTS portal_users_status_idx ON portal_users (status)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS portal_payment_methods (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      method TEXT NOT NULL,
      address TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES portal_users(id)
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS portal_payment_methods_user_idx ON portal_payment_methods (user_id)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS portal_payment_methods_user_method_idx ON portal_payment_methods (user_id, method)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS portal_work_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      work_date TEXT NOT NULL,
      sheet_link TEXT NOT NULL,
      applied_jobs INTEGER NOT NULL DEFAULT 0,
      interviews_scheduled INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES portal_users(id)
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS portal_work_logs_user_idx ON portal_work_logs (user_id)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS portal_work_logs_user_date_idx ON portal_work_logs (user_id, work_date)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS portal_payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'scheduled',
      payment_link TEXT NOT NULL DEFAULT '',
      memo TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES portal_users(id)
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS portal_payments_user_idx ON portal_payments (user_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS portal_payments_date_idx ON portal_payments (scheduled_date)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS portal_chat_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES portal_users(id)
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS portal_chat_messages_created_idx ON portal_chat_messages (created_at)"),
  ]);

  await seedDemoData();
}

async function seedDemoData() {
  const db = getBinding();
  const stamp = now();

  await db.batch([
    db
      .prepare(`INSERT OR IGNORE INTO portal_users (
        id, email, name, role, status, rate_per_application, bonus_per_interview,
        next_payment_date, payment_schedule, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        "user_admin",
        ADMIN_EMAIL,
        "Admin Owner",
        "admin",
        "approved",
        0,
        0,
        "",
        "",
        stamp,
        stamp
      ),
    db
      .prepare(`INSERT OR IGNORE INTO portal_users (
        id, email, name, role, status, rate_per_application, bonus_per_interview,
        next_payment_date, payment_schedule, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        "user_maya",
        "maya.bidder@example.com",
        "Maya Bidder",
        "bidder",
        "approved",
        1.25,
        12,
        "2026-08-21",
        "Weekly on Friday",
        stamp,
        stamp
      ),
    db
      .prepare(`INSERT OR IGNORE INTO portal_users (
        id, email, name, role, status, rate_per_application, bonus_per_interview,
        next_payment_date, payment_schedule, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        "user_pending",
        "pending.bidder@example.com",
        "Pending Bidder",
        "bidder",
        "pending",
        0,
        0,
        "",
        "",
        stamp,
        stamp
      ),
    db
      .prepare(`INSERT OR IGNORE INTO portal_payment_methods (
        id, user_id, method, address, is_primary, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind("method_maya_wise", "user_maya", "Wise", "maya@example.com", 1, stamp, stamp),
    db
      .prepare(`INSERT OR IGNORE INTO portal_work_logs (
        id, user_id, work_date, sheet_link, applied_jobs, interviews_scheduled, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        "log_maya_2026_08_13",
        "user_maya",
        "2026-08-13",
        "https://docs.google.com/spreadsheets/d/example-maya-log",
        18,
        2,
        "Focused on Upwork backend roles.",
        stamp,
        stamp
      ),
    db
      .prepare(`INSERT OR IGNORE INTO portal_payments (
        id, user_id, period_start, period_end, scheduled_date, amount, status, payment_link, memo, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        "payment_maya_1",
        "user_maya",
        "2026-08-06",
        "2026-08-12",
        "2026-08-14",
        142.5,
        "paid",
        "https://pay.example.com/receipt/maya-001",
        "First weekly payout",
        stamp,
        stamp
      ),
    db
      .prepare(`INSERT OR IGNORE INTO portal_chat_messages (
        id, user_id, author_name, author_role, body, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(
        "chat_welcome",
        "user_admin",
        "Admin Owner",
        "admin",
        "Welcome. Please log daily sheet links, applied jobs, and scheduled interviews before the payment review.",
        stamp
      ),
  ]);
}

async function getUserByEmail(email: string) {
  const db = getBinding();
  const row = await db
    .prepare("SELECT * FROM portal_users WHERE email = ? LIMIT 1")
    .bind(normalizeEmail(email))
    .first<UserRow>();

  return row ? mapUser(row) : null;
}

async function getUserById(userId: string) {
  const db = getBinding();
  const row = await db
    .prepare("SELECT * FROM portal_users WHERE id = ? LIMIT 1")
    .bind(userId)
    .first<UserRow>();

  return row ? mapUser(row) : null;
}

export async function findOrCreateUser(emailInput: string, nameInput?: string) {
  await ensurePortalSchema();
  const db = getBinding();
  const email = normalizeEmail(emailInput);

  if (!email || !email.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return existing;
  }

  const isAdmin = email === ADMIN_EMAIL;
  const name = cleanText(nameInput) || displayNameFromEmail(email);
  const stamp = now();

  await db
    .prepare(`INSERT INTO portal_users (
      id, email, name, role, status, rate_per_application, bonus_per_interview,
      next_payment_date, payment_schedule, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      createId("user"),
      email,
      name,
      isAdmin ? "admin" : "bidder",
      isAdmin ? "approved" : "pending",
      0,
      0,
      "",
      "",
      stamp,
      stamp
    )
    .run();

  return getUserByEmail(email) as Promise<PortalUser>;
}

export async function getPortalData(email: string): Promise<PortalData> {
  const currentUser = await findOrCreateUser(email);
  const db = getBinding();
  const isAdmin = currentUser.role === "admin";

  const users = isAdmin
    ? ((await db
        .prepare("SELECT * FROM portal_users ORDER BY role ASC, status ASC, name ASC")
        .all<UserRow>()).results || []).map(mapUser)
    : [currentUser];

  const paymentMethods = isAdmin
    ? ((await db
        .prepare("SELECT * FROM portal_payment_methods ORDER BY is_primary DESC, updated_at DESC")
        .all<MethodRow>()).results || []).map(mapMethod)
    : ((await db
        .prepare("SELECT * FROM portal_payment_methods WHERE user_id = ? ORDER BY is_primary DESC, updated_at DESC")
        .bind(currentUser.id)
        .all<MethodRow>()).results || []).map(mapMethod);

  const workLogs = isAdmin
    ? ((await db
        .prepare("SELECT * FROM portal_work_logs ORDER BY work_date DESC, created_at DESC")
        .all<WorkLogRow>()).results || []).map(mapWorkLog)
    : ((await db
        .prepare("SELECT * FROM portal_work_logs WHERE user_id = ? ORDER BY work_date DESC")
        .bind(currentUser.id)
        .all<WorkLogRow>()).results || []).map(mapWorkLog);

  const payments = isAdmin
    ? ((await db
        .prepare("SELECT * FROM portal_payments ORDER BY scheduled_date DESC, created_at DESC")
        .all<PaymentRow>()).results || []).map(mapPayment)
    : ((await db
        .prepare("SELECT * FROM portal_payments WHERE user_id = ? ORDER BY scheduled_date DESC, created_at DESC")
        .bind(currentUser.id)
        .all<PaymentRow>()).results || []).map(mapPayment);

  const chatMessages = ((await db
    .prepare("SELECT * FROM portal_chat_messages ORDER BY created_at ASC LIMIT 80")
    .all<ChatRow>()).results || []).map(mapChat);

  return { currentUser, users, paymentMethods, workLogs, payments, chatMessages };
}

export async function signIn(email: string, name?: string) {
  const user = await findOrCreateUser(email, name);
  return getPortalData(user.email);
}

export async function updateUserAsAdmin(adminEmail: string, payload: Record<string, unknown>) {
  const admin = await findOrCreateUser(adminEmail);
  if (admin.role !== "admin") {
    throw new Error("Only admins can manage users.");
  }

  const targetUserId = cleanText(payload.targetUserId);
  const target = await getUserById(targetUserId);
  if (!target) {
    throw new Error("User not found.");
  }

  const role = cleanText(payload.role, target.role) as Role;
  const status = cleanText(payload.status, target.status) as UserStatus;
  const safeRole: Role = ["admin", "bidder", "developer"].includes(role) ? role : target.role;
  const safeStatus: UserStatus = ["pending", "approved", "paused"].includes(status) ? status : target.status;
  const isAdminRole = safeRole === "admin";
  const stamp = now();

  await getBinding()
    .prepare(`UPDATE portal_users
      SET name = ?, role = ?, status = ?, rate_per_application = ?, bonus_per_interview = ?,
        next_payment_date = ?, payment_schedule = ?, updated_at = ?
      WHERE id = ?`)
    .bind(
      cleanText(payload.name, target.name) || target.name,
      safeRole,
      safeStatus,
      isAdminRole ? 0 : cleanNumber(payload.ratePerApplication, target.ratePerApplication),
      isAdminRole ? 0 : cleanNumber(payload.bonusPerInterview, target.bonusPerInterview),
      isAdminRole ? "" : cleanText(payload.nextPaymentDate, target.nextPaymentDate),
      isAdminRole ? "" : cleanText(payload.paymentSchedule, target.paymentSchedule),
      stamp,
      target.id
    )
    .run();

  return getPortalData(admin.email);
}

export async function savePaymentMethod(email: string, payload: Record<string, unknown>) {
  const currentUser = await findOrCreateUser(email);
  if (currentUser.role === "admin") {
    throw new Error("Admins do not need payment methods.");
  }

  const method = cleanText(payload.method);
  const address = cleanText(payload.address);
  if (!method || !address) {
    throw new Error("Payment method and address are required.");
  }

  const db = getBinding();
  const stamp = now();
  await db.batch([
    db.prepare("UPDATE portal_payment_methods SET is_primary = 0, updated_at = ? WHERE user_id = ?").bind(stamp, currentUser.id),
    db
      .prepare(`INSERT INTO portal_payment_methods (
        id, user_id, method, address, is_primary, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(user_id, method) DO UPDATE SET
        address = excluded.address,
        is_primary = 1,
        updated_at = excluded.updated_at`)
      .bind(createId("method"), currentUser.id, method, address, stamp, stamp),
  ]);

  return getPortalData(currentUser.email);
}

export async function saveWorkLog(email: string, payload: Record<string, unknown>) {
  const currentUser = await findOrCreateUser(email);
  if (currentUser.role !== "bidder" || currentUser.status !== "approved") {
    throw new Error("Only approved bidders can log bidder work.");
  }

  const workDate = cleanText(payload.workDate);
  const sheetLink = cleanText(payload.sheetLink);
  if (!workDate || !sheetLink) {
    throw new Error("Work date and Google Sheet link are required.");
  }

  const appliedJobs = Math.round(cleanNumber(payload.appliedJobs));
  const interviewsScheduled = Math.round(cleanNumber(payload.interviewsScheduled));
  const stamp = now();

  await getBinding()
    .prepare(`INSERT INTO portal_work_logs (
      id, user_id, work_date, sheet_link, applied_jobs, interviews_scheduled, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, work_date) DO UPDATE SET
      sheet_link = excluded.sheet_link,
      applied_jobs = excluded.applied_jobs,
      interviews_scheduled = excluded.interviews_scheduled,
      notes = excluded.notes,
      updated_at = excluded.updated_at`)
    .bind(
      createId("log"),
      currentUser.id,
      workDate,
      sheetLink,
      appliedJobs,
      interviewsScheduled,
      cleanText(payload.notes),
      stamp,
      stamp
    )
    .run();

  return getPortalData(currentUser.email);
}

export async function addPaymentAsAdmin(adminEmail: string, payload: Record<string, unknown>) {
  const admin = await findOrCreateUser(adminEmail);
  if (admin.role !== "admin") {
    throw new Error("Only admins can add payments.");
  }

  const targetUserId = cleanText(payload.userId);
  const target = await getUserById(targetUserId);
  if (!target || target.role === "admin") {
    throw new Error("Select a non-admin user for payment.");
  }

  const periodStart = cleanText(payload.periodStart);
  const periodEnd = cleanText(payload.periodEnd);
  const scheduledDate = cleanText(payload.scheduledDate);
  const amount = cleanNumber(payload.amount);
  const statusInput = cleanText(payload.status, "scheduled") as PaymentStatus;
  const status: PaymentStatus = statusInput === "paid" ? "paid" : "scheduled";

  if (!periodStart || !periodEnd || !scheduledDate || amount <= 0) {
    throw new Error("Payment period, scheduled date, and amount are required.");
  }

  const stamp = now();
  await getBinding()
    .prepare(`INSERT INTO portal_payments (
      id, user_id, period_start, period_end, scheduled_date, amount, status, payment_link, memo, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      createId("payment"),
      target.id,
      periodStart,
      periodEnd,
      scheduledDate,
      amount,
      status,
      cleanText(payload.paymentLink),
      cleanText(payload.memo),
      stamp,
      stamp
    )
    .run();

  if (scheduledDate) {
    await getBinding()
      .prepare("UPDATE portal_users SET next_payment_date = ?, updated_at = ? WHERE id = ?")
      .bind(scheduledDate, stamp, target.id)
      .run();
  }

  return getPortalData(admin.email);
}

export async function addChatMessage(email: string, payload: Record<string, unknown>) {
  const currentUser = await findOrCreateUser(email);
  if (currentUser.status !== "approved") {
    throw new Error("Only approved users can send chat messages.");
  }

  const body = cleanText(payload.body);
  if (!body) {
    throw new Error("Message cannot be empty.");
  }

  await getBinding()
    .prepare(`INSERT INTO portal_chat_messages (
      id, user_id, author_name, author_role, body, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(createId("chat"), currentUser.id, currentUser.name, currentUser.role, body.slice(0, 1000), now())
    .run();

  return getPortalData(currentUser.email);
}
