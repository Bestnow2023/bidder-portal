"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import type {
  ChatAttachment,
  ChatMessage,
  DepositRecord,
  EscrowRecord,
  PaymentFrequency,
  PaymentMethod,
  PaymentRecord,
  PaymentWeekday,
  PortalData,
  PortalUser,
  Role,
  UserStatus,
  WorkLog,
} from "./portal-types";

type AuthMode = "signIn" | "signUp" | "resetPassword";
type PortalView = "overview" | "dashboard" | "profile" | "clients" | "bidders" | "people" | "bidderSettings" | "work" | "payments" | "chat";

const paymentMethods = ["Payoneer", "BEP20", "Wise", "PayPal", "Bank transfer", "USDT TRC20", "Other"];
const paymentFrequencies: { value: PaymentFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];
const paymentWeekdays: { value: PaymentWeekday; label: string }[] = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
];
const weekdayIndex: Record<PaymentWeekday, number> = {
  "": -1,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
};
const defaultApiBaseUrl =
  process.env.NODE_ENV === "development" ? "http://localhost:4000" : "https://bidder-portal-be.vercel.app";
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || defaultApiBaseUrl).replace(/\/$/, "");
const portalApiUrl = `${apiBaseUrl}/api/portal`;
const portalMode = process.env.NEXT_PUBLIC_PORTAL_MODE?.toLowerCase() === "live" ? "live" : "dev";
const isLiveMode = portalMode === "live";
const adminTimeZone = process.env.NEXT_PUBLIC_ADMIN_TIME_ZONE || "America/New_York";
const chatPollIntervalMs = 15000;
const chatAttachmentLimit = 3;
const maxChatAttachmentBytes = 2 * 1024 * 1024;
const demoPassword = "demo1234";

const demoAccounts = [
  { label: "Super admin", email: "admin@portal.local", name: "Super Admin Owner" },
  { label: "Approved client", email: "client@portal.local", name: "Demo Client" },
  { label: "Approved bidder", email: "maya.bidder@example.com", name: "Maya Bidder" },
  { label: "Pending bidder", email: "pending.bidder@example.com", name: "Pending Bidder" },
];
const timeZoneOptions = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Warsaw",
  "Africa/Lagos",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Singapore",
  "Asia/Manila",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];
const viewRoutes: Record<PortalView, string> = {
  overview: "/operations",
  dashboard: "/dashboard",
  profile: "/profile",
  clients: "/clients",
  bidders: "/bidders",
  people: "/people",
  bidderSettings: "/bidder-settings",
  work: "/work",
  payments: "/payments",
  chat: "/chat",
};
const routeViews: Record<string, PortalView> = {
  "/operations": "overview",
  "/dashboard": "dashboard",
  "/profile": "profile",
  "/clients": "clients",
  "/bidders": "bidders",
  "/people": "people",
  "/bidder-settings": "bidderSettings",
  "/work": "work",
  "/payments": "payments",
  "/chat": "chat",
};

function DigniwareLogo({
  className,
  variant = "theme",
}: {
  className?: string;
  variant?: "theme" | "dark" | "light";
}) {
  const fallbackSrc = variant === "dark" ? "/digniware-logo-dark.png" : "/digniware-logo-light.png";

  if (variant !== "theme") {
    return <Image className={className} src={fallbackSrc} alt="Digniware" width={112} height={112} />;
  }

  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" srcSet="/digniware-logo-dark.png" />
      <Image className={className} src="/digniware-logo-light.png" alt="Digniware" width={112} height={112} />
    </picture>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function shortDate(value: string) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function optionalDateTime(value?: string) {
  return value ? dateTime(value) : "Not set";
}

function dateTimeInZone(value: string, timeZone: string) {
  if (!value) {
    return "Not set";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone,
    }).format(new Date(value));
  } catch {
    return dateTime(value);
  }
}

function browserTimeZone() {
  if (typeof Intl === "undefined") {
    return adminTimeZone;
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || adminTimeZone;
}

function formatBytes(value: number) {
  if (!value) {
    return "File";
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentSummary(attachments: ChatAttachment[] = []) {
  if (!attachments.length) {
    return "";
  }

  if (attachments.length === 1) {
    const [attachment] = attachments;
    if (attachment.type.startsWith("image/")) return "Photo";
    if (attachment.type.startsWith("audio/")) return "Voice message";
    return attachment.name;
  }

  return `${attachments.length} files`;
}

function chatNotificationText(message: ChatMessage) {
  const body = message.body?.trim();
  const attachmentText = attachmentSummary(message.attachments || []);
  return `${message.authorName}: ${body || attachmentText || "New message"}`;
}

function chatReadStorageKey(userId: string) {
  return `bidderPortalChatRead:${userId}`;
}

function loadChatReadReceipts(userId: string): Record<string, string> {
  if (typeof window === "undefined" || !userId) {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(chatReadStorageKey(userId));
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveChatReadReceipts(userId: string, receipts: Record<string, string>) {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  window.localStorage.setItem(chatReadStorageKey(userId), JSON.stringify(receipts));
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizePaymentFrequency(value?: string): PaymentFrequency {
  return value === "weekly" || value === "biweekly" || value === "monthly" ? value : "";
}

function normalizePaymentWeekday(value?: string): PaymentWeekday {
  return value === "monday" || value === "tuesday" || value === "wednesday" || value === "thursday" || value === "friday"
    ? value
    : "";
}

function parsePaymentSchedule(value?: string) {
  const schedule = (value || "").toLowerCase();
  const frequency: PaymentFrequency = schedule.includes("biweekly")
    ? "biweekly"
    : schedule.includes("monthly")
      ? "monthly"
      : schedule.includes("weekly")
        ? "weekly"
        : "";
  const weekday = paymentWeekdays.find((day) => schedule.includes(day.value))?.value || "";

  return { frequency, weekday };
}

function paymentScheduleLabel(frequencyInput?: string, weekdayInput?: string) {
  const frequency = normalizePaymentFrequency(frequencyInput);
  const weekday = normalizePaymentWeekday(weekdayInput);
  if (!frequency || !weekday) {
    return "";
  }

  const frequencyLabel = paymentFrequencies.find((item) => item.value === frequency)?.label || titleCase(frequency);
  const weekdayLabel = paymentWeekdays.find((item) => item.value === weekday)?.label || titleCase(weekday);
  return `${frequencyLabel} on ${weekdayLabel}`;
}

function roleLabel(role: Role) {
  if (role === "super_admin") return "Super Admin";
  if (role === "client" || role === "admin") return "Client";
  if (role === "developer") return "Developer";
  return "Bidder";
}

function isSuperAdminRole(role: Role) {
  return role === "super_admin";
}

function isClientRole(role: Role) {
  return role === "client" || role === "admin";
}

function canViewManagedRecords(role: Role) {
  return isSuperAdminRole(role) || isClientRole(role);
}

function isWorkerUser(user: PortalUser) {
  return !isSuperAdminRole(user.role) && !isClientRole(user.role);
}

function statusLabel(status: UserStatus) {
  return titleCase(status);
}

function viewTitle(view: string) {
  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    overview: "Dashboard",
    profile: "Profile",
    clients: "Clients",
    bidders: "Bidders",
    people: "People",
    bidderSettings: "Bidder Settings",
    work: "Work Logs",
    payments: "Payments",
    chat: "Inbox",
  };
  return titles[view] || "Portal";
}

function viewSubtitle(view: string, isAdmin: boolean) {
  if (!isAdmin) {
    if (view === "clients") return "Search client profiles and review payment history signals.";
    if (view === "bidders") return "Search bidder profiles and contracting status.";
    if (view === "profile") return "Complete your public profile so matched people understand who they are working with.";
    return "Log your bidder activity and keep payment details current.";
  }

  const subtitles: Record<string, string> = {
    overview: "Review work, clients, payments, and escrow snapshots.",
    profile: "Complete your public profile and escrow readiness.",
    clients: "Review client profiles and hiring signals.",
    bidders: "Search bidders and see who is available or already contracted.",
    people: "Manage user accounts, approval status, roles, passwords, and email verification.",
    bidderSettings: "Set bidder rates, interview bonuses, payment dates, and schedules.",
    work: "Review bidder work logs and Google Sheet links.",
    payments: "Record payouts, review payment methods, and track client escrow.",
    chat: "Direct member messaging with super admin monitoring.",
  };

  return subtitles[view] || "Manage the bidder portal.";
}

function viewsForUser(user: PortalUser): PortalView[] {
  if (isSuperAdminRole(user.role)) {
    return ["people", "chat"];
  }

  if (isClientRole(user.role)) {
    return ["overview", "profile", "bidders", "work", "payments", "chat"];
  }

  if (user.role === "bidder") {
    return ["dashboard", "profile", "clients", "work", "payments", "chat"];
  }

  return ["profile", "payments", "chat"];
}

function safeViewForUser(user: PortalUser, view: PortalView) {
  const availableViews = viewsForUser(user);
  return availableViews.includes(view) ? view : availableViews[0];
}

function viewFromPath(pathname: string): PortalView {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  return routeViews[normalizedPath] || "overview";
}

function estimateForUser(user: PortalUser, logs: WorkLog[]) {
  return logs
    .filter((log) => log.userId === user.id)
    .reduce(
      (total, log) =>
        total +
        log.appliedJobs * user.ratePerApplication +
        log.interviewsScheduled * user.bonusPerInterview,
      0
    );
}

function paidForUser(userId: string, payments: PaymentRecord[]) {
  return payments
    .filter((payment) => payment.userId === userId && payment.status === "paid")
    .reduce((total, payment) => total + payment.amount, 0);
}

function scheduledForUser(userId: string, payments: PaymentRecord[]) {
  return payments
    .filter((payment) => payment.userId === userId && payment.status === "scheduled")
    .reduce((total, payment) => total + payment.amount, 0);
}

function creditsDepositedForClient(clientId: string, deposits: DepositRecord[]) {
  return deposits
    .filter((deposit) => deposit.clientId === clientId && deposit.status === "paid")
    .reduce((total, deposit) => total + deposit.creditAmount, 0);
}

function creditsSpentForClient(clientId: string, payments: PaymentRecord[]) {
  return payments
    .filter((payment) => payment.clientId === clientId && payment.status === "paid")
    .reduce((total, payment) => total + payment.amount, 0);
}

function creditBalanceForClient(clientId: string, deposits: DepositRecord[], payments: PaymentRecord[]) {
  return Math.max(0, creditsDepositedForClient(clientId, deposits) - creditsSpentForClient(clientId, payments));
}

function userById(users: PortalUser[], userId: string) {
  return users.find((user) => user.id === userId);
}

function inboxConversationId(userId: string, recipientId: string) {
  return [userId, recipientId].sort().join("__");
}

function chatConversationIdForMessage(message: ChatMessage) {
  if (message.conversationId) {
    return message.conversationId;
  }

  return message.recipientId ? inboxConversationId(message.userId, message.recipientId) : "";
}

function initialsForName(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "IN";
}

function assignedClientName(users: PortalUser[], user: PortalUser) {
  if (user.role !== "bidder") {
    return "-";
  }

  return userById(users, user.assignedAdminId || "")?.name || "Unassigned";
}

function profileSkillsText(user: PortalUser) {
  return (user.profileSkills || []).join(", ");
}

function isProfileComplete(user: PortalUser) {
  return Boolean(user.profileCompletedAt);
}

function clientUsers(users: PortalUser[]) {
  return users.filter((user) => isClientRole(user.role) && user.status === "approved");
}

function userMatchesSearch(user: PortalUser, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [
    user.name,
    user.email,
    roleLabel(user.role),
    user.profileTitle,
    user.profileBio,
    user.profileLocation,
    ...(user.profileSkills || []),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedQuery));
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dateAtMidnight(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

function nextWeekdayOnOrAfter(date: Date, weekdayInput: PaymentWeekday) {
  const weekday = normalizePaymentWeekday(weekdayInput);
  if (!weekday) {
    return null;
  }

  const offset = (weekdayIndex[weekday] - date.getDay() + 7) % 7;
  return addDays(date, offset);
}

function nextPaymentDateFromSchedule(frequencyInput?: string, weekdayInput?: string, baseDateInput = today(), advance = false) {
  const frequency = normalizePaymentFrequency(frequencyInput);
  const weekday = normalizePaymentWeekday(weekdayInput);
  const baseDate = dateAtMidnight(baseDateInput) || dateAtMidnight(today());
  if (!frequency || !weekday || !baseDate) {
    return "";
  }

  let searchDate = baseDate;
  if (advance) {
    if (frequency === "weekly") {
      searchDate = addDays(baseDate, 1);
    } else if (frequency === "biweekly") {
      searchDate = addDays(baseDate, 14);
    } else {
      searchDate = addMonths(baseDate, 1);
    }
  }

  const nextDate = nextWeekdayOnOrAfter(searchDate, weekday);
  return nextDate ? dateInputValue(nextDate) : "";
}

function paymentDateMatchesWeekday(value: string, weekdayInput?: string) {
  const date = dateAtMidnight(value);
  const weekday = normalizePaymentWeekday(weekdayInput);
  return Boolean(date && weekday && date.getDay() === weekdayIndex[weekday]);
}

type ActionMenuItem = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
};

function ActionMenu({ label = "...", items }: { label?: string; items: ActionMenuItem[] }) {
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isOpen = Boolean(menuPosition);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeMenu() {
      setMenuPosition(null);
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      closeMenu();
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [isOpen]);

  function openMenu() {
    const trigger = buttonRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const menuWidth = 208;
    const menuHeight = Math.min(items.length * 42 + 14, 280);
    const left = Math.min(window.innerWidth - menuWidth - 12, Math.max(12, rect.right - menuWidth));
    const downTop = rect.bottom + 8;
    const upTop = rect.top - menuHeight - 8;
    const top = downTop + menuHeight > window.innerHeight && upTop > 12
      ? upTop
      : Math.min(downTop, window.innerHeight - menuHeight - 12);

    setMenuPosition({ top: Math.max(12, top), left });
  }

  return (
    <div className="action-menu">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-transparent text-xl font-black leading-none text-slate-500 transition hover:bg-slate-100 hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        onClick={() => {
          if (isOpen) {
            setMenuPosition(null);
          } else {
            openMenu();
          }
        }}
      >
        {label}
      </button>
      {menuPosition ? (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 grid w-52 gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/15"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={`min-h-9 rounded-lg px-3 py-2 text-left text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${
              item.danger
                ? "text-red-700 hover:bg-red-50"
                : "text-slate-700 hover:bg-slate-100 hover:text-teal-700"
            }`}
            onClick={() => {
              setMenuPosition(null);
              item.onClick();
            }}
          >
            {item.label}
          </button>
        ))}
        </div>
      ) : null}
    </div>
  );
}

function daysUntil(value: string) {
  const target = dateAtMidnight(value);
  const current = dateAtMidnight(today());
  if (!target || !current) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.round((target.getTime() - current.getTime()) / DAY_MS);
}

function paymentTimingLabel(dayCount: number) {
  if (dayCount < 0) return `${Math.abs(dayCount)} day${Math.abs(dayCount) === 1 ? "" : "s"} overdue`;
  if (dayCount === 0) return "Due today";
  if (dayCount === 1) return "Due tomorrow";
  return `In ${dayCount} days`;
}

type UpcomingPaymentItem = {
  id: string;
  user?: PortalUser;
  scheduledDate: string;
  amount: number;
  daysUntil: number;
  description: string;
  sourceLabel: string;
};

type DateRange = {
  startDate: string;
  endDate: string;
  preset?: DatePreset;
};

type DatePreset = "all" | "date" | "thisWeek" | "lastWeek" | "last7Days" | "yesterday" | "custom";

function startOfWeek(date: Date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

function dateRangeFromPreset(preset: DatePreset, baseDateInput = today()): DateRange {
  const baseDate = dateAtMidnight(baseDateInput) || new Date();
  const currentDate = dateInputValue(baseDate);

  if (preset === "date") {
    return { preset, startDate: currentDate, endDate: "" };
  }

  if (preset === "thisWeek") {
    const weekStart = startOfWeek(baseDate);
    return { preset, startDate: dateInputValue(weekStart), endDate: dateInputValue(addDays(weekStart, 6)) };
  }

  if (preset === "lastWeek") {
    const weekStart = addDays(startOfWeek(baseDate), -7);
    return { preset, startDate: dateInputValue(weekStart), endDate: dateInputValue(addDays(weekStart, 6)) };
  }

  if (preset === "last7Days") {
    return { preset, startDate: dateInputValue(addDays(baseDate, -6)), endDate: currentDate };
  }

  if (preset === "yesterday") {
    const yesterday = dateInputValue(addDays(baseDate, -1));
    return { preset, startDate: yesterday, endDate: "" };
  }

  return { preset, startDate: "", endDate: "" };
}

function workSummary(user: PortalUser, logs: WorkLog[]) {
  return {
    appliedJobs: logs.reduce((total, log) => total + log.appliedJobs, 0),
    interviewsScheduled: logs.reduce((total, log) => total + log.interviewsScheduled, 0),
    earned: estimateForUser(user, logs),
    logCount: logs.length,
  };
}

function logMatchesDateRange(log: WorkLog, range: DateRange) {
  if (!range.startDate && !range.endDate) {
    return true;
  }

  if (range.preset === "date" && range.startDate && !range.endDate) {
    return log.workDate === range.startDate;
  }

  const logDate = dateAtMidnight(log.workDate)?.getTime();
  if (logDate == null) {
    return false;
  }

  const startDate = range.startDate ? dateAtMidnight(range.startDate)?.getTime() : null;
  const endDate = range.endDate ? dateAtMidnight(range.endDate)?.getTime() : null;

  if (startDate != null && logDate < startDate) {
    return false;
  }

  if (endDate != null && logDate > endDate) {
    return false;
  }

  return true;
}

function filterWorkLogsByDate(logs: WorkLog[], range: DateRange) {
  return logs.filter((log) => logMatchesDateRange(log, range));
}

function isWorkLogPaid(log: WorkLog, payments: PaymentRecord[]) {
  const logDate = dateAtMidnight(log.workDate)?.getTime();
  if (logDate == null) {
    return false;
  }

  return payments.some((payment) => {
    if (payment.userId !== log.userId || payment.status !== "paid") {
      return false;
    }

    const periodStart = dateAtMidnight(payment.periodStart)?.getTime();
    const periodEnd = dateAtMidnight(payment.periodEnd)?.getTime();
    return periodStart != null && periodEnd != null && periodStart <= logDate && logDate <= periodEnd;
  });
}

export default function PortalApp() {
  const [data, setData] = useState<PortalData | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>(isLiveMode ? "signUp" : "signIn");
  const [loginEmail, setLoginEmail] = useState(() => {
    if (typeof window === "undefined") {
      return isLiveMode ? "" : "admin@portal.local";
    }

    const storedEmail = window.localStorage.getItem("bidderPortalEmail") || "";
    const storedDemoEmail = demoAccounts.some((account) => account.email === storedEmail);
    if (isLiveMode && storedDemoEmail) {
      return "";
    }

    return storedEmail || (isLiveMode ? "" : "admin@portal.local");
  });
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState(isLiveMode ? "" : demoPassword);
  const [signupRole, setSignupRole] = useState<Role>("bidder");
  const [resetToken, setResetToken] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [verificationPendingEmail, setVerificationPendingEmail] = useState("");
  const [verificationSuccessEmail, setVerificationSuccessEmail] = useState("");
  const [sessionToken, setSessionToken] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.localStorage.getItem("bidderPortalSessionToken") || "";
  });
  const [activeView, setActiveView] = useState<PortalView>(() =>
    typeof window === "undefined" ? "overview" : viewFromPath(window.location.pathname)
  );
  const [chatRecipientId, setChatRecipientId] = useState(() => {
    if (typeof window === "undefined" || window.location.pathname !== viewRoutes.chat) {
      return "";
    }

    return new URLSearchParams(window.location.search).get("recipient") || "";
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [portalNavVisible, setPortalNavVisible] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() =>
    typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"
  );
  const latestChatMessageIdRef = useRef("");
  const lastScrollYRef = useRef(0);
  const effectiveActiveView = data ? safeViewForUser(data.currentUser, activeView) : activeView;

  const postPublicAction = useCallback(async (
    action: string,
    payload: Record<string, unknown> & { successMessage?: string } = {}
  ) => {
    setBusy(true);
    setError("");
    setAuthNotice("");

    try {
      const response = await fetch(portalApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email: payload.email || loginEmail, ...payload }),
      });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Portal API returned ${contentType || "non-JSON"} from ${portalApiUrl}. Check NEXT_PUBLIC_API_BASE_URL.`);
      }

      const nextData = await response.json();
      if (!response.ok) {
        throw new Error(nextData.error || "Action failed.");
      }

      if (nextData.currentUser) {
        setData(nextData);
        setLoginEmail(nextData.currentUser.email);
        if (nextData.sessionToken) {
          setSessionToken(nextData.sessionToken);
          window.localStorage.setItem("bidderPortalSessionToken", nextData.sessionToken);
        }
        window.localStorage.setItem("bidderPortalEmail", nextData.currentUser.email);
      } else if (action === "verifyEmail") {
        const verifiedEmail = String(payload.email || nextData.email || loginEmail);
        setVerificationPendingEmail("");
        setVerificationSuccessEmail(verifiedEmail);
        setLoginEmail(verifiedEmail);
        setAuthMode("signIn");
      } else {
        setAuthNotice(payload.successMessage || nextData.message || "Done.");
      }

      return nextData as PortalData | { ok: boolean; message?: string };
    } catch (publicActionError) {
      setError(publicActionError instanceof Error ? publicActionError.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }, [loginEmail]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const resetEmail = params.get("resetEmail") || "";
    const nextResetToken = params.get("resetToken") || "";
    const verifyEmailAddress = params.get("verifyEmail") || "";
    const verifyToken = params.get("verifyToken") || "";

    if (resetEmail && nextResetToken) {
      window.history.replaceState({}, "", window.location.pathname);
      const timeout = window.setTimeout(() => {
        setLoginEmail(resetEmail);
        setResetToken(nextResetToken);
        setLoginPassword("");
        setAuthMode("resetPassword");
        setAuthNotice("Enter a new password for this account.");
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    if (verifyEmailAddress && verifyToken) {
      window.history.replaceState({}, "", window.location.pathname);
      const timeout = window.setTimeout(() => {
        setLoginEmail(verifyEmailAddress);
        void postPublicAction("verifyEmail", {
          email: verifyEmailAddress,
          verifyToken,
          successMessage: "Email verified. You can sign in now.",
        });
      }, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [postPublicAction]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handlePopState = () => {
      setActiveView(viewFromPath(window.location.pathname));
      setChatRecipientId(new URLSearchParams(window.location.search).get("recipient") || "");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    lastScrollYRef.current = window.scrollY;

    function handleScroll() {
      const nextScrollY = window.scrollY;
      const scrollingUp = nextScrollY < lastScrollYRef.current;

      if (nextScrollY < 24 || scrollingUp) {
        setPortalNavVisible(true);
      } else if (nextScrollY > 96) {
        setPortalNavVisible(false);
      }

      lastScrollYRef.current = nextScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const refreshPortalData = useCallback(async (email: string, token: string, silent = false) => {
    if (!email || !token) {
      return;
    }

    if (!silent) {
      setBusy(true);
      setError("");
    }

    try {
      const response = await fetch(portalApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refreshPortal", email, sessionToken: token }),
      });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Portal API returned ${contentType || "non-JSON"} from ${portalApiUrl}. Check NEXT_PUBLIC_API_BASE_URL.`);
      }

      const nextData = await response.json();
      if (!response.ok) {
        throw new Error(nextData.error || "Refresh failed.");
      }

      setData(nextData);
      setLoginEmail(nextData.currentUser.email);
      if (nextData.sessionToken) {
        setSessionToken(nextData.sessionToken);
        window.localStorage.setItem("bidderPortalSessionToken", nextData.sessionToken);
      }
      window.localStorage.setItem("bidderPortalEmail", nextData.currentUser.email);
      return nextData as PortalData;
    } catch (refreshError) {
      if (!silent) {
        setError(refreshError instanceof Error ? refreshError.message : "Refresh failed.");
      }
    } finally {
      if (!silent) {
        setBusy(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!data?.currentUser.email || !sessionToken) {
      return;
    }

    const email = data.currentUser.email;
    const interval = window.setInterval(() => {
      void refreshPortalData(email, sessionToken, true);
    }, chatPollIntervalMs);

    return () => window.clearInterval(interval);
  }, [data?.currentUser.email, refreshPortalData, sessionToken]);

  useEffect(() => {
    if (data || !loginEmail || !sessionToken) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void refreshPortalData(loginEmail, sessionToken, true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [data, loginEmail, refreshPortalData, sessionToken]);

  useEffect(() => {
    if (!data) {
      latestChatMessageIdRef.current = "";
      window.setTimeout(() => setChatUnreadCount(0), 0);
      return;
    }

    const messages = data.chatMessages || [];
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) {
      latestChatMessageIdRef.current = "";
      window.setTimeout(() => setChatUnreadCount(0), 0);
      return;
    }

    const previousMessageId = latestChatMessageIdRef.current;
    if (!previousMessageId) {
      latestChatMessageIdRef.current = latestMessage.id;
      return;
    }

    if (previousMessageId !== latestMessage.id) {
      const previousIndex = messages.findIndex((message) => message.id === previousMessageId);
      const newMessages = previousIndex >= 0 ? messages.slice(previousIndex + 1) : [latestMessage];
      const incomingMessages = newMessages.filter(
        (message) => message.userId !== data.currentUser.id && !message.deletedAt
      );

      if (incomingMessages.length && effectiveActiveView !== "chat") {
        window.setTimeout(() => setChatUnreadCount((count) => count + incomingMessages.length), 0);
        const lastIncoming = incomingMessages[incomingMessages.length - 1];
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("Bidder Portal", { body: chatNotificationText(lastIncoming) });
        }
      }

      latestChatMessageIdRef.current = latestMessage.id;
    }

    if (effectiveActiveView === "chat") {
      window.setTimeout(() => setChatUnreadCount(0), 0);
    }
  }, [data, effectiveActiveView]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.title = chatUnreadCount > 0 ? `(${chatUnreadCount}) Bidder Work Portal` : "Bidder Work Portal";
  }, [chatUnreadCount]);

  useEffect(() => {
    if (!data || typeof window === "undefined") {
      return;
    }

    const nextView = safeViewForUser(data.currentUser, activeView);
    const nextPath = viewRoutes[nextView];

    if (window.location.pathname !== nextPath) {
      window.history.replaceState({}, "", nextPath);
    }
  }, [activeView, data]);

  async function enableChatNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
  }

  async function postAction(action: string, payload: Record<string, unknown> = {}) {
    if (!data && action !== "signIn" && action !== "signUp" && action !== "resetPassword") {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const email = action === "signIn" || action === "signUp" || action === "resetPassword" ? loginEmail : data?.currentUser.email;
      const authPayload =
        action === "signIn" || action === "signUp" || action === "resetPassword"
          ? { password: loginPassword }
          : { sessionToken };
      const response = await fetch(portalApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email, ...authPayload, ...payload }),
      });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Portal API returned ${contentType || "non-JSON"} from ${portalApiUrl}. Check NEXT_PUBLIC_API_BASE_URL.`);
      }

      const nextData = await response.json();
      if (!response.ok) {
        throw new Error(nextData.error || "Action failed.");
      }

      if (!nextData.currentUser) {
        if (action === "signUp" && nextData.needsEmailVerification) {
          const nextEmail = nextData.email || email || loginEmail;
          setVerificationPendingEmail(nextEmail);
          setVerificationSuccessEmail("");
          setLoginEmail(nextEmail);
          setLoginPassword("");
          setAuthNotice(nextData.message || "Check your email to verify your account before signing in.");
        } else {
          setAuthNotice(nextData.message || "Done.");
        }
        return undefined;
      }

      setData(nextData);
      setLoginEmail(nextData.currentUser.email);
      if (nextData.sessionToken) {
        setSessionToken(nextData.sessionToken);
        window.localStorage.setItem("bidderPortalSessionToken", nextData.sessionToken);
      }
      window.localStorage.setItem("bidderPortalEmail", nextData.currentUser.email);
      return nextData as PortalData;
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : "Action failed.";
      if (action === "signIn" && message.toLowerCase().includes("sign up")) {
        setAuthMode("signUp");
        setLoginPassword("");
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    window.localStorage.removeItem("bidderPortalEmail");
    window.localStorage.removeItem("bidderPortalSessionToken");
    window.history.pushState({}, "", "/");
    setData(null);
    setSessionToken("");
    setLoginPassword(isLiveMode ? "" : demoPassword);
    setActiveView("overview");
    setChatUnreadCount(0);
    latestChatMessageIdRef.current = "";
    setVerificationPendingEmail("");
    setVerificationSuccessEmail("");
    setError("");
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (authMode === "resetPassword") {
      await postAction("resetPassword", { resetToken });
      return;
    }

    await postAction(authMode, { name: loginName, role: authMode === "signUp" ? signupRole : undefined });
  }

  function switchAuthMode(nextAuthMode: AuthMode) {
    setAuthMode(nextAuthMode);
    setLoginPassword(nextAuthMode === "signIn" && !isLiveMode ? demoPassword : "");
    setResetToken("");
    setAuthNotice("");
    setVerificationPendingEmail("");
    setVerificationSuccessEmail("");
    setError("");
  }

  async function requestForgotPassword() {
    if (!loginEmail) {
      setError("Enter your email first.");
      return;
    }

    await postPublicAction("requestPasswordReset", {
      email: loginEmail,
      successMessage: "If that account exists, a reset email has been sent.",
    });
  }

  if (!data) {
    if (verificationPendingEmail || verificationSuccessEmail) {
      const verified = Boolean(verificationSuccessEmail);
      const email = verificationSuccessEmail || verificationPendingEmail;

      return (
        <main className="app login-page">
          <section className="login-card">
            <div className="login-story">
              <DigniwareLogo className="brand-logo auth-logo" variant="dark" />
              <h1>Bidder Work Portal</h1>
              <p>
                Sign in with email, log bidder work, keep payment method details in one place,
                and let clients manage approvals, rates, next payout dates, history, and chat.
              </p>
            </div>

            <section className="login-form verification-card">
              <h2>{verified ? "Email verified successfully" : "Check your email"}</h2>
              <p>
                {verified
                  ? "Your email is verified. You can now sign in with your password."
                  : "We sent a verification link. Open your email and click the link before signing in."}
              </p>
              <div className={`status-strip compact ${verified ? "success" : ""}`}>
                {email}
              </div>
              <div className="actions" style={{ marginTop: 18 }}>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    setAuthMode("signIn");
                    setVerificationPendingEmail("");
                    setVerificationSuccessEmail("");
                    setAuthNotice("");
                  }}
                >
                  Continue to sign in
                </button>
              </div>
            </section>
          </section>
        </main>
      );
    }

    return (
      <main className="app login-page">
        <section className="login-card">
          <div className="login-story">
            <DigniwareLogo className="brand-logo auth-logo" variant="dark" />
            <h1>Bidder Work Portal</h1>
            <p>
              Sign in with email, log bidder work, keep payment method details in one place,
              and let clients manage approvals, rates, next payout dates, history, and chat.
            </p>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <h2>{authMode === "signUp" ? "Sign up" : authMode === "resetPassword" ? "Reset password" : "Email and password sign-in"}</h2>
            <p>
              {authMode === "signUp"
                ? "New users enter as pending until approval. Clients must be approved by a super admin."
                : authMode === "resetPassword"
                  ? "Create a new password from your reset email."
                  : "Use your approved email and password to enter the portal."}
            </p>

            {authMode !== "resetPassword" ? (
              <div className="auth-toggle" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                className={authMode === "signIn" ? "active" : ""}
                onClick={() => switchAuthMode("signIn")}
              >
                Sign in
              </button>
              <button
                type="button"
                className={authMode === "signUp" ? "active" : ""}
                onClick={() => switchAuthMode("signUp")}
              >
                Sign up
              </button>
              </div>
            ) : null}

            {!isLiveMode && authMode === "signIn" ? (
              <div className="quick-login">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setLoginEmail(account.email);
                    setLoginName(account.name);
                    setLoginPassword(demoPassword);
                  }}
                >
                  <span>{account.label}</span>
                  <strong>{account.email}</strong>
                </button>
              ))}
              </div>
            ) : null}

            <div className="form-grid">
              <label className="field full">
                <span>Email</span>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="person@example.com"
                  required
                />
              </label>
              <label className="field full">
                <span>Password</span>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder={authMode === "signUp" || authMode === "resetPassword" ? "Create at least 8 characters" : "Your password"}
                  minLength={8}
                  required
                />
              </label>
              {authMode === "signUp" || !isLiveMode ? (
                <label className="field full">
                <span>Name</span>
                <input
                  value={loginName}
                  onChange={(event) => setLoginName(event.target.value)}
                  placeholder={authMode === "signUp" ? "Your name" : "Optional display name"}
                  required={authMode === "signUp"}
                />
              </label>
              ) : null}
              {authMode === "signUp" ? (
                <label className="field full">
                  <span>Requested role</span>
                  <select value={signupRole} onChange={(event) => setSignupRole(event.target.value as Role)}>
                    <option value="bidder">Bidder</option>
                    <option value="client">Client</option>
                    <option value="developer">Developer</option>
                  </select>
                </label>
              ) : null}
            </div>

            <div className="actions" style={{ marginTop: 18 }}>
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? "Please wait" : authMode === "signUp" ? "Create account" : authMode === "resetPassword" ? "Reset password" : "Sign in"}
              </button>
              {authMode === "signIn" ? (
                <button className="ghost-button" type="button" disabled={busy} onClick={requestForgotPassword}>
                  Forgot password?
                </button>
              ) : null}
              {authMode === "resetPassword" ? (
                <button className="ghost-button" type="button" onClick={() => switchAuthMode("signIn")}>
                  Back to sign in
                </button>
              ) : null}
            </div>

            {authNotice ? <div className="status-strip compact">{authNotice}</div> : null}
            {error ? <div className="error">{error}</div> : null}
          </form>
        </section>
      </main>
    );
  }

  const currentUser = data.currentUser;
  const isSuperAdmin = isSuperAdminRole(currentUser.role);
  const canViewManaged = canViewManagedRecords(currentUser.role);
  const availableViews = viewsForUser(currentUser);
  const safeView = availableViews.includes(activeView) ? activeView : availableViews[0];

  function navigateToView(event: ReactMouseEvent<HTMLAnchorElement>, view: PortalView) {
    event.preventDefault();
    const nextPath = viewRoutes[view];

    if (typeof window !== "undefined" && window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }

    setActiveView(view);
    setChatRecipientId("");
    if (view === "chat") {
      setChatUnreadCount(0);
    }
  }

  function openInboxForUser(userId: string) {
    const nextPath = `${viewRoutes.chat}?recipient=${encodeURIComponent(userId)}`;

    if (typeof window !== "undefined") {
      window.history.pushState({}, "", nextPath);
    }

    setChatRecipientId(userId);
    setActiveView("chat");
    setChatUnreadCount(0);
    setPortalNavVisible(true);
  }

  return (
    <main className="app portal-shell">
      <header className={`portal-nav ${portalNavVisible ? "visible" : "hidden"}`}>
        <div className="portal-nav-inner">
          <div className="portal-brand">
            <DigniwareLogo className="brand-logo sidebar-logo" />
            <div className="sidebar-title">
              <strong>Bidder Portal</strong>
              <span>Work and payments</span>
            </div>
          </div>

          <nav className="nav-list" aria-label="Portal navigation">
            {availableViews.map((view) => (
              <a
                key={view}
                className={`nav-button transition ${
                  safeView === view
                    ? "active shadow-sm ring-1 ring-teal-700/10"
                    : "hover:bg-white/80 hover:text-teal-700"
                }`}
                href={viewRoutes[view]}
                onClick={(event) => navigateToView(event, view)}
              >
                <span>{viewTitle(view)}</span>
                {view === "chat" && chatUnreadCount > 0 ? <span className="nav-badge">{chatUnreadCount}</span> : null}
              </a>
            ))}
          </nav>

          <div className="portal-account">
            <div className="portal-user">
              <strong>{currentUser.name}</strong>
              <span className={`badge ${currentUser.role}`}>{roleLabel(currentUser.role)}</span>
            </div>
            <button className="ghost-button compact-button" type="button" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="content">
        <header className="topbar">
          <div>
            <h1>{viewTitle(safeView)}</h1>
            <p>{viewSubtitle(safeView, canViewManaged)}</p>
          </div>
          <div className="badge-row">
            <span className={`badge ${currentUser.role}`}>{roleLabel(currentUser.role)}</span>
            <span className={`badge ${currentUser.status}`}>{statusLabel(currentUser.status)}</span>
          </div>
        </header>

        {error ? <div className="error" style={{ marginBottom: 16 }}>{error}</div> : null}

        {currentUser.status !== "approved" ? (
          <PendingView data={data} busy={busy} onSaveMethod={postAction} />
        ) : (
          <>
            {safeView === "overview" && canViewManaged ? <AdminOverview data={data} /> : null}
            {safeView === "profile" ? <ProfileView data={data} busy={busy} onSave={postAction} /> : null}
            {safeView === "clients" ? <ClientDirectoryView data={data} onMessageClient={openInboxForUser} /> : null}
            {safeView === "bidders" ? <BiddersDirectoryView data={data} onMessageBidder={openInboxForUser} /> : null}
            {safeView === "people" && isSuperAdmin ? <PeopleView data={data} busy={busy} onSave={postAction} /> : null}
            {safeView === "bidderSettings" && isSuperAdmin ? <BidderSettingsView data={data} busy={busy} onSave={postAction} /> : null}
            {safeView === "dashboard" && currentUser.role === "bidder" ? <BidderDashboard data={data} /> : null}
            {safeView === "work" ? <WorkView data={data} busy={busy} onSave={postAction} /> : null}
            {safeView === "payments" ? <PaymentsView data={data} busy={busy} onAction={postAction} /> : null}
            {safeView === "chat" ? (
              <ChatView
                data={data}
                busy={busy}
                notificationsEnabled={notificationsEnabled}
                onEnableNotifications={enableChatNotifications}
                onSend={postAction}
                requestedRecipientId={chatRecipientId}
              />
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

function AdminOverview({ data }: { data: PortalData }) {
  const pendingUsers = data.users.filter((user) => user.status === "pending").length;
  const nonAdmins = data.users.filter(isWorkerUser);
  const totalApplied = data.workLogs.reduce((total, log) => total + log.appliedJobs, 0);
  const totalInterviews = data.workLogs.reduce((total, log) => total + log.interviewsScheduled, 0);
  const scheduled = data.payments
    .filter((payment) => payment.status === "scheduled")
    .reduce((total, payment) => total + payment.amount, 0);
  const paid = data.payments
    .filter((payment) => payment.status === "paid")
    .reduce((total, payment) => total + payment.amount, 0);

  return (
    <div>
      <div className="metric-grid">
        <div className="metric">
          <span>Pending approval</span>
          <strong>{pendingUsers}</strong>
        </div>
        <div className="metric">
          <span>Applied jobs</span>
          <strong>{totalApplied}</strong>
        </div>
        <div className="metric">
          <span>Interviews</span>
          <strong>{totalInterviews}</strong>
        </div>
        <div className="metric">
          <span>Scheduled payouts</span>
          <strong>{money(scheduled)}</strong>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Payment Snapshot</h2>
              <p>Manual payment records and payout links.</p>
            </div>
            <span className="badge paid">{money(paid)} paid</span>
          </div>
          <div className="payment-method-list">
            {nonAdmins.map((user) => {
              const earned = estimateForUser(user, data.workLogs);
              const paidTotal = paidForUser(user.id, data.payments);
              const remaining = Math.max(0, earned - paidTotal);
              return (
                <div className="payment-row" key={user.id}>
                  <div>
                    <strong>{user.name}</strong>
                    <span className="muted">{roleLabel(user.role)} - {user.paymentSchedule || "No schedule"}</span>
                  </div>
                  <div>
                    <strong>{money(remaining)}</strong>
                    <span className="mini-label">estimated open</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Recent Work</h2>
              <p>Latest bidder Google Sheet logs.</p>
            </div>
          </div>
          <div className="payment-method-list">
            {data.workLogs.slice(0, 5).map((log) => {
              const user = userById(data.users, log.userId);
              return (
                <div className="log-row" key={log.id}>
                  <div>
                    <strong>{user?.name || "Unknown user"}</strong>
                    <span className="muted">{shortDate(log.workDate)} - {log.appliedJobs} applied - {log.interviewsScheduled} interviews</span>
                  </div>
                  <a href={log.sheetLink} target="_blank" rel="noreferrer">Sheet</a>
                </div>
              );
            })}
            {!data.workLogs.length ? <div className="empty-state">No work logs yet.</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function ProfileView({
  data,
  busy,
  onSave,
}: {
  data: PortalData;
  busy: boolean;
  onSave: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const user = data.currentUser;
  const [draft, setDraft] = useState({
    profileTitle: user.profileTitle || "",
    profileBio: user.profileBio || "",
    profileSkills: profileSkillsText(user),
    profileLocation: user.profileLocation || "",
    profileTimeZone: user.profileTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    allowDirectMessages: user.allowDirectMessages !== false,
  });
  const profileTimeZoneOptions = timeZoneOptions.includes(draft.profileTimeZone)
    ? timeZoneOptions
    : [draft.profileTimeZone, ...timeZoneOptions].filter(Boolean);
  const relatedProfiles = data.users.filter((profileUser) => {
    if (profileUser.id === user.id || !isProfileComplete(profileUser)) {
      return false;
    }
    if (user.role === "bidder") {
      return isClientRole(profileUser.role);
    }
    if (canViewManagedRecords(user.role)) {
      return profileUser.role === "bidder";
    }
    return isClientRole(profileUser.role);
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave("saveProfile", draft);
  }

  return (
    <div className="dashboard-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>My Profile</h2>
            <p>Complete the profile that matched clients and bidders can view.</p>
          </div>
          <span className={`badge ${isProfileComplete(user) ? "approved" : "pending"}`}>
            {isProfileComplete(user) ? "Complete" : "Incomplete"}
          </span>
        </div>

        <form className="form-grid" onSubmit={submit}>
          <label className="field">
            <span>Profile title</span>
            <input
              value={draft.profileTitle}
              onChange={(event) => setDraft({ ...draft, profileTitle: event.target.value })}
              placeholder={isClientRole(user.role) ? "Hiring client for remote bidder work" : "Technical bidder for web projects"}
            />
          </label>
          <label className="field">
            <span>Location</span>
            <input
              value={draft.profileLocation}
              onChange={(event) => setDraft({ ...draft, profileLocation: event.target.value })}
              placeholder="City, country"
            />
          </label>
          <label className="field">
            <span>Timezone</span>
            <select
              value={draft.profileTimeZone}
              onChange={(event) => setDraft({ ...draft, profileTimeZone: event.target.value })}
            >
              {profileTimeZoneOptions.map((timeZone) => (
                <option key={timeZone} value={timeZone}>{timeZone}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Skills / focus</span>
            <input
              value={draft.profileSkills}
              onChange={(event) => setDraft({ ...draft, profileSkills: event.target.value })}
              placeholder="Upwork, LinkedIn, React, Backend"
            />
          </label>
          <label className="field full">
            <span>Profile bio</span>
            <textarea
              value={draft.profileBio}
              onChange={(event) => setDraft({ ...draft, profileBio: event.target.value })}
              placeholder="Summarize the work style, expectations, skills, and preferred communication."
            />
          </label>
          <label className="check-field full">
            <input
              type="checkbox"
              checked={draft.allowDirectMessages}
              onChange={(event) => setDraft({ ...draft, allowDirectMessages: event.target.checked })}
            />
            <span>Allow clients and bidders to contact me directly</span>
          </label>
          <div className="actions full">
            <button className="primary-button" type="submit" disabled={busy}>
              Save profile
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Visible Profiles</h2>
            <p>{user.role === "bidder" ? "Client profiles available to bidders." : "Bidder profiles assigned to this client view."}</p>
          </div>
        </div>
        <ProfileCardGrid users={relatedProfiles} />
      </section>
    </div>
  );
}

function ProfileCardGrid({ users }: { users: PortalUser[] }) {
  if (!users.length) {
    return <div className="empty-state">No completed profiles are visible yet.</div>;
  }

  return (
    <div className="profile-grid">
      {users.map((user) => (
        <article className="profile-card" key={user.id}>
          <div className="person-title">
            <div>
              <h3>{user.name}</h3>
              <span className="table-subtext">{roleLabel(user.role)} - {user.profileLocation || "Location not set"}</span>
            </div>
            <span className={`badge ${user.role}`}>{roleLabel(user.role)}</span>
          </div>
          <strong>{user.profileTitle || "Profile title not set"}</strong>
          <p>{user.profileBio || "No profile bio yet."}</p>
          <div className="badge-row">
            {(user.profileSkills || []).map((skill) => (
              <span className="badge" key={skill}>{skill}</span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function ClientDirectoryView({
  data,
  onMessageClient,
}: {
  data: PortalData;
  onMessageClient: (clientId: string) => void;
}) {
  const [selectedClient, setSelectedClient] = useState<PortalUser | null>(null);
  const [filters, setFilters] = useState({
    query: "",
    joinedAfter: "",
    minMoneyPaid: "",
    minRating: "",
    maxBidRate: "",
    minBonus: "",
    onlyOpenClients: false,
    sortBy: "joinedDate",
  });
  const clients = clientUsers(data.users)
    .filter((client) => userMatchesSearch(client, filters.query))
    .filter((client) => {
      const stats = client.clientStats;
      const joinedAfter = filters.joinedAfter ? new Date(`${filters.joinedAfter}T00:00:00`) : null;
      const joinedDate = new Date(client.createdAt);
      const moneyPaid = stats?.moneyPaid || 0;
      const rating = stats?.bidderRating || 0;
      const averageBidRate = stats?.averageBidRate || 0;
      const averageBonusGiven = stats?.averageBonusGiven || 0;

      return (
        (!joinedAfter || joinedDate >= joinedAfter) &&
        (!filters.minMoneyPaid || moneyPaid >= Number(filters.minMoneyPaid)) &&
        (!filters.minRating || rating >= Number(filters.minRating)) &&
        (!filters.maxBidRate || averageBidRate <= Number(filters.maxBidRate)) &&
        (!filters.minBonus || averageBonusGiven >= Number(filters.minBonus)) &&
        (!filters.onlyOpenClients || Boolean(stats?.flaggedNoHires))
      );
    })
    .sort((left, right) => {
      const leftStats = left.clientStats;
      const rightStats = right.clientStats;
      if (filters.sortBy === "moneyPaid") return (rightStats?.moneyPaid || 0) - (leftStats?.moneyPaid || 0);
      if (filters.sortBy === "bidderRating") return (rightStats?.bidderRating || 0) - (leftStats?.bidderRating || 0);
      if (filters.sortBy === "averageBidRate") return (leftStats?.averageBidRate || 0) - (rightStats?.averageBidRate || 0);
      if (filters.sortBy === "averageBonusGiven") return (rightStats?.averageBonusGiven || 0) - (leftStats?.averageBonusGiven || 0);
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  const selectedClientWorkers = selectedClient
    ? data.users.filter((user) => user.assignedAdminId === selectedClient.id)
    : [];
  const selectedClientWorkerIds = new Set(selectedClientWorkers.map((user) => user.id));
  if (selectedClient?.id && data.currentUser.assignedAdminId === selectedClient.id) {
    selectedClientWorkerIds.add(data.currentUser.id);
  }
  const selectedClientWorkLogs = selectedClient
    ? data.workLogs.filter((log) => selectedClientWorkerIds.has(log.userId)).slice(0, 8)
    : [];
  const selectedClientPayments = selectedClient
    ? data.payments.filter((payment) => selectedClientWorkerIds.has(payment.userId)).slice(0, 8)
    : [];

  function messageSelectedClient(client: PortalUser) {
    setSelectedClient(null);
    onMessageClient(client.id);
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Client Search</h2>
          <p>Find clients by hiring status, joined date, payment history, rating, bid rate, and bonuses.</p>
        </div>
      </div>

      <div className="filter-bar">
        <label className="field">
          <span>Search clients</span>
          <input value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} placeholder="Name, email, skill, location" />
        </label>
        <label className="field">
          <span>Joined after</span>
          <input type="date" value={filters.joinedAfter} onChange={(event) => setFilters({ ...filters, joinedAfter: event.target.value })} />
        </label>
        <label className="field">
          <span>Min money paid</span>
          <input type="number" min="0" value={filters.minMoneyPaid} onChange={(event) => setFilters({ ...filters, minMoneyPaid: event.target.value })} />
        </label>
        <label className="field">
          <span>Min bidder rating</span>
          <input type="number" min="0" max="5" step="0.1" value={filters.minRating} onChange={(event) => setFilters({ ...filters, minRating: event.target.value })} />
        </label>
        <label className="field">
          <span>Max average bid rate</span>
          <input type="number" min="0" step="0.01" value={filters.maxBidRate} onChange={(event) => setFilters({ ...filters, maxBidRate: event.target.value })} />
        </label>
        <label className="field">
          <span>Min average bonus</span>
          <input type="number" min="0" step="0.01" value={filters.minBonus} onChange={(event) => setFilters({ ...filters, minBonus: event.target.value })} />
        </label>
        <label className="field">
          <span>Sort by</span>
          <select value={filters.sortBy} onChange={(event) => setFilters({ ...filters, sortBy: event.target.value })}>
            <option value="joinedDate">Joined date</option>
            <option value="moneyPaid">Money paid</option>
            <option value="bidderRating">Bidder rating</option>
            <option value="averageBidRate">Average bid rate</option>
            <option value="averageBonusGiven">Average bonus given</option>
          </select>
        </label>
        <label className="check-field">
          <input
            type="checkbox"
            checked={filters.onlyOpenClients}
            onChange={(event) => setFilters({ ...filters, onlyOpenClients: event.target.checked })}
          />
          <span>Flagged clients only</span>
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Joined</th>
              <th>Money paid</th>
              <th>Bidder rating</th>
              <th>Average bid rate</th>
              <th>Average bonus</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const stats = client.clientStats;
              return (
                <tr className="clickable-row" key={client.id} onClick={() => setSelectedClient(client)}>
                  <td>
                    <strong>{client.name}</strong>
                    <span className="table-subtext">{client.profileTitle || client.email}</span>
                  </td>
                  <td>{shortDate(client.createdAt.slice(0, 10))}</td>
                  <td>{money(stats?.moneyPaid || 0)}</td>
                  <td>{(stats?.bidderRating || 0).toFixed(1)}</td>
                  <td>{money(stats?.averageBidRate || 0)}</td>
                  <td>{money(stats?.averageBonusGiven || 0)}</td>
                  <td>
                    {stats?.flaggedNoHires ? (
                      <span className="badge pending">No bidders hired</span>
                    ) : (
                      <span className="badge approved">{stats?.assignedBidderCount || 0} hired</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="ghost-button compact-button"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedClient(client);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!clients.length ? <div className="empty-state">No clients match these filters.</div> : null}

      {selectedClient ? (
        <div className="modal-backdrop">
          <section className="modal-panel client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="client-detail-title">
            <div className="modal-header">
              <div>
                <h2 id="client-detail-title">{selectedClient.name}</h2>
                <p>{selectedClient.email}</p>
              </div>
              <button className="ghost-button compact-button" type="button" onClick={() => setSelectedClient(null)}>
                Close
              </button>
            </div>

            <div className="profile-detail-grid">
              <article className="profile-card">
                <h3>Profile Info</h3>
                <strong>{selectedClient.profileTitle || "Profile title not set"}</strong>
                <p>{selectedClient.profileBio || "No profile bio yet."}</p>
                <p className="muted">{selectedClient.profileLocation || "Location not set"} - {selectedClient.profileTimeZone || "Timezone not set"}</p>
                <p className="muted">
                  {selectedClient.allowDirectMessages === false
                    ? "Direct messages are turned off."
                    : "Direct messages are allowed."}
                </p>
                <div className="badge-row">
                  {(selectedClient.profileSkills || []).map((skill) => (
                    <span className="badge" key={skill}>{skill}</span>
                  ))}
                  {!selectedClient.profileSkills?.length ? <span className="badge">No skills listed</span> : null}
                </div>
              </article>

              <article className="profile-card">
                <h3>Client Signals</h3>
                <div className="mini-metrics">
                  <span><strong>{money(selectedClient.clientStats?.moneyPaid || 0)}</strong> paid</span>
                  <span><strong>{(selectedClient.clientStats?.bidderRating || 0).toFixed(1)}</strong> rating</span>
                  <span><strong>{money(selectedClient.clientStats?.averageBidRate || 0)}</strong> avg bid</span>
                  <span><strong>{money(selectedClient.clientStats?.averageBonusGiven || 0)}</strong> avg bonus</span>
                </div>
                <button
                  className="primary-button"
                  type="button"
                  disabled={selectedClient.allowDirectMessages === false}
                  onClick={() => messageSelectedClient(selectedClient)}
                >
                  {selectedClient.allowDirectMessages === false ? "Messages off" : "Message client"}
                </button>
              </article>
            </div>

            <div className="two-column">
              <section className="panel nested-panel">
                <div className="panel-header">
                  <div>
                    <h2>Client Work History</h2>
                    <p>Recent logs tied to bidders assigned to this client.</p>
                  </div>
                </div>
                <div className="payment-method-list">
                  {selectedClientWorkLogs.map((log) => {
                    const user = userById(data.users, log.userId);
                    return (
                      <div className="log-row" key={log.id}>
                        <div>
                          <strong>{user?.name || "Unknown bidder"}</strong>
                          <span className="muted">{shortDate(log.workDate)} - {log.appliedJobs} applied - {log.interviewsScheduled} interviews</span>
                        </div>
                        {log.sheetLink ? <a href={log.sheetLink} target="_blank" rel="noreferrer">Sheet</a> : null}
                      </div>
                    );
                  })}
                  {!selectedClientWorkLogs.length ? <div className="empty-state compact">No visible work history yet.</div> : null}
                </div>
              </section>

              <section className="panel nested-panel">
                <div className="panel-header">
                  <div>
                    <h2>Payment History</h2>
                    <p>Recent payment records tied to assigned bidders.</p>
                  </div>
                </div>
                <div className="payment-method-list">
                  {selectedClientPayments.map((payment) => {
                    const user = userById(data.users, payment.userId);
                    return (
                      <div className="payment-row" key={payment.id}>
                        <div>
                          <strong>{money(payment.amount)} - {titleCase(payment.status)}</strong>
                          <span className="muted">{user?.name || "Unknown bidder"} - {shortDate(payment.scheduledDate)}</span>
                        </div>
                        {payment.paymentLink ? <a href={payment.paymentLink} target="_blank" rel="noreferrer">Receipt</a> : null}
                      </div>
                    );
                  })}
                  {!selectedClientPayments.length ? <div className="empty-state compact">No visible payment history yet.</div> : null}
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function BiddersDirectoryView({
  data,
  onMessageBidder,
}: {
  data: PortalData;
  onMessageBidder: (bidderId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const bidders = data.users
    .filter((user) => isWorkerUser(user) && user.status === "approved")
    .filter((user) => userMatchesSearch(user, query))
    .sort((left, right) => {
      const leftAvailable = !left.assignedAdminId || left.assignedAdminId === data.currentUser.id;
      const rightAvailable = !right.assignedAdminId || right.assignedAdminId === data.currentUser.id;
      if (leftAvailable !== rightAvailable) return leftAvailable ? -1 : 1;
      return left.name.localeCompare(right.name);
    });

  function contractStatus(user: PortalUser) {
    if (!user.assignedAdminId) {
      return { label: "Available", className: "approved" };
    }
    if (user.assignedAdminId === data.currentUser.id) {
      return { label: "Contracting with you", className: "bidder" };
    }
    return { label: "Contracted with another client", className: "pending" };
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Bidder Search</h2>
          <p>Review bidder profiles and see whether they are available or already contracted.</p>
        </div>
      </div>

      <div className="filter-bar">
        <label className="field">
          <span>Search bidders</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, skill, location" />
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Bidder</th>
              <th>Contract status</th>
              <th>Applied</th>
              <th>Interviews</th>
              <th>Earned</th>
              <th>Profile</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bidders.map((bidder) => {
              const status = contractStatus(bidder);
              return (
                <tr key={bidder.id}>
                  <td>
                    <strong>{bidder.name}</strong>
                    <span className="table-subtext">{bidder.email}</span>
                  </td>
                  <td><span className={`badge ${status.className}`}>{status.label}</span></td>
                  <td>{bidder.bidderStats?.totalApplied || 0}</td>
                  <td>{bidder.bidderStats?.totalInterviews || 0}</td>
                  <td>{money(bidder.bidderStats?.totalEarned || 0)}</td>
                  <td>
                    <strong>{bidder.profileTitle || "No title"}</strong>
                    <span className="table-subtext">{bidder.profileLocation || "Location not set"}</span>
                  </td>
                  <td>
                    <button
                      className="ghost-button compact-button"
                      type="button"
                      disabled={bidder.allowDirectMessages === false}
                      onClick={() => onMessageBidder(bidder.id)}
                    >
                      {bidder.allowDirectMessages === false ? "Messages off" : "Message"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!bidders.length ? <div className="empty-state">No bidders match this search.</div> : null}
    </section>
  );
}

function PeopleView({
  data,
  busy,
  onSave,
}: {
  data: PortalData;
  busy: boolean;
  onSave: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const [editingUser, setEditingUser] = useState<PortalUser | null>(null);
  const canManageRoles = data.currentUser.role === "super_admin";
  const adminUsers = data.users.filter((user) => isClientRole(user.role) && user.status === "approved");
  const visibleUsers = canManageRoles ? data.users : data.users.filter(isWorkerUser);

  async function updateUser(user: PortalUser, changes: Partial<Pick<PortalUser, "name" | "role" | "status" | "assignedAdminId">>) {
    await onSave("updateUser", {
      targetUserId: user.id,
      name: changes.name ?? user.name,
      role: changes.role ?? user.role,
      status: changes.status ?? user.status,
      assignedAdminId: changes.assignedAdminId ?? user.assignedAdminId ?? "",
    });
  }

  async function removeUser(user: PortalUser) {
    if (!window.confirm(`Remove ${user.name}? This will delete this user account and their portal records.`)) {
      return;
    }

    const nextData = await onSave("deleteUser", { targetUserId: user.id });
    if (nextData && editingUser?.id === user.id) {
      setEditingUser(null);
    }
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>User Management</h2>
          <p>Manage accounts, approval status, roles, passwords, and email verification.</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Assigned client</th>
              <th>Password</th>
              <th>Email</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  <span className="table-subtext">{user.email}</span>
                </td>
                <td><span className={`badge ${user.role}`}>{roleLabel(user.role)}</span></td>
                <td><span className={`badge ${user.status}`}>{statusLabel(user.status)}</span></td>
                <td>{assignedClientName(data.users, user)}</td>
                <td>{user.passwordSet ? "Set" : "Not set"}</td>
                <td>{user.emailVerifiedAt ? "Verified" : "Not verified"}</td>
                <td>{optionalDateTime(user.passwordUpdatedAt)}</td>
                <td>
                  <ActionMenu
                    items={[
                      { label: "Edit", onClick: () => setEditingUser(user) },
                      {
                        label: "Approve",
                        disabled: busy || user.status === "approved",
                        onClick: () => updateUser(user, { status: "approved" }),
                      },
                      {
                        label: "Activate",
                        disabled: busy || user.status === "approved",
                        onClick: () => updateUser(user, { status: "approved" }),
                      },
                      {
                        label: "Disable",
                        disabled: busy || user.status === "paused",
                        onClick: () => updateUser(user, { status: "paused" }),
                      },
                      {
                        label: "Send verification",
                        disabled: busy || Boolean(user.emailVerifiedAt),
                        onClick: () => onSave("requestEmailVerification", { targetUserId: user.id }),
                      },
                      {
                        label: "Remove",
                        danger: true,
                        disabled: busy || user.id === data.currentUser.id,
                        onClick: () => void removeUser(user),
                      },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser ? (
        <UserEditModal
          key={editingUser.id}
          user={editingUser}
          admins={adminUsers}
          canManageRoles={canManageRoles}
          busy={busy}
          onClose={() => setEditingUser(null)}
          onSave={async (action, payload) => {
            const nextData = await onSave(action, payload);
            if (nextData && action === "updateUser") {
              setEditingUser(null);
            }
            return nextData;
          }}
        />
      ) : null}
    </section>
  );
}

function UserEditModal({
  user,
  admins,
  canManageRoles,
  busy,
  onClose,
  onSave,
}: {
  user: PortalUser;
  admins: PortalUser[];
  canManageRoles: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const [draft, setDraft] = useState({
    name: user.name,
    role: user.role,
    status: user.status,
    assignedAdminId: user.assignedAdminId || "",
  });
  const [passwordDraft, setPasswordDraft] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave("updateUser", {
      targetUserId: user.id,
      name: draft.name,
      role: draft.role,
      status: draft.status,
      assignedAdminId: draft.role === "bidder" ? draft.assignedAdminId : "",
    });
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    const nextData = await onSave("setUserPassword", {
      targetUserId: user.id,
      password: passwordDraft,
    });
    if (nextData) {
      setPasswordDraft("");
    }
  }

  async function sendVerificationEmail() {
    await onSave("requestEmailVerification", { targetUserId: user.id });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
        <div className="panel-header">
          <div>
            <h2 id="edit-user-title">Edit User</h2>
            <p>{user.email}</p>
            <div className="account-meta">
              <span>Password: {user.passwordSet ? "Set" : "Not set"}</span>
              <span>Updated: {optionalDateTime(user.passwordUpdatedAt)}</span>
              <span>Email: {user.emailVerifiedAt ? "Verified" : "Not verified"}</span>
            </div>
          </div>
          <button className="ghost-button compact-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <form className="form-grid" onSubmit={submit}>
          <label className="field">
            <span>Name</span>
            <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <label className="field">
            <span>Role</span>
            <select
              value={draft.role}
              disabled={!canManageRoles}
              onChange={(event) => setDraft({ ...draft, role: event.target.value as Role })}
            >
              {draft.role === "super_admin" ? <option value="super_admin">Super Admin</option> : null}
              <option value="bidder">Bidder</option>
              <option value="developer">Developer</option>
              <option value="client">Client</option>
            </select>
          </label>
          {draft.role === "bidder" ? (
            <label className="field">
              <span>Assigned client</span>
              <select
                value={draft.assignedAdminId}
                disabled={!canManageRoles}
                onChange={(event) => setDraft({ ...draft, assignedAdminId: event.target.value })}
              >
                <option value="">Unassigned</option>
                {admins.map((adminUser) => (
                  <option key={adminUser.id} value={adminUser.id}>{adminUser.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="field">
            <span>Status</span>
            <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as UserStatus })}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paused">Paused</option>
            </select>
          </label>
          <div className="actions full">
            <button className="primary-button" type="submit" disabled={busy}>
              Save account
            </button>
            <button className="ghost-button" type="button" disabled={busy || Boolean(user.emailVerifiedAt)} onClick={sendVerificationEmail}>
              Send verification
            </button>
          </div>
        </form>

        <form className="form-grid account-tools" onSubmit={submitPassword}>
          <label className="field">
            <span>Temporary password</span>
            <input
              type="password"
              value={passwordDraft}
              minLength={8}
              onChange={(event) => setPasswordDraft(event.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </label>
          <button className="secondary-button" type="submit" disabled={busy || passwordDraft.length < 8}>
            Set password
          </button>
          <div className="muted full">
            Passwords are encrypted and cannot be viewed after they are saved.
          </div>
        </form>
      </section>
    </div>
  );
}

function BidderSettingsView({
  data,
  busy,
  onSave,
}: {
  data: PortalData;
  busy: boolean;
  onSave: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const [bidderSearch, setBidderSearch] = useState("");
  const bidders = data.users.filter((user) => user.role === "bidder" && userMatchesSearch(user, bidderSearch));
  const [editingBidder, setEditingBidder] = useState<PortalUser | null>(null);

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>Bidder Settings</h2>
          <p>Manage bidder rates, bonuses, and payment schedules separately from user accounts.</p>
        </div>
      </div>
      <div className="filter-bar">
        <label className="field">
          <span>Search bidders</span>
          <input value={bidderSearch} onChange={(event) => setBidderSearch(event.target.value)} placeholder="Name, email, skill, location" />
        </label>
      </div>
      {bidders.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Bidder</th>
                <th>Rate</th>
                <th>Bonus</th>
                <th>Schedule</th>
                <th>Next payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bidders.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                    <span className="table-subtext">{user.email}</span>
                  </td>
                  <td>{money(user.ratePerApplication)}</td>
                  <td>{money(user.bonusPerInterview)}</td>
                  <td>{user.paymentSchedule || "Not set"}</td>
                  <td>{shortDate(user.nextPaymentDate)}</td>
                  <td><span className={`badge ${user.status}`}>{statusLabel(user.status)}</span></td>
                  <td>
                    <ActionMenu items={[{ label: "Edit", onClick: () => setEditingBidder(user) }]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">No bidders yet.</div>
      )}

      {editingBidder ? (
        <BidderSettingsModal
          key={editingBidder.id}
          user={editingBidder}
          busy={busy}
          onClose={() => setEditingBidder(null)}
          onSave={async (action, payload) => {
            const nextData = await onSave(action, payload);
            if (nextData) {
              setEditingBidder(null);
            }
            return nextData;
          }}
        />
      ) : null}
    </section>
  );
}

function BidderSettingsModal({
  user,
  busy,
  onClose,
  onSave,
}: {
  user: PortalUser;
  busy: boolean;
  onClose: () => void;
  onSave: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const existingSchedule = parsePaymentSchedule(user.paymentSchedule);
  const [draft, setDraft] = useState({
    ratePerApplication: String(user.ratePerApplication),
    bonusPerInterview: String(user.bonusPerInterview),
    paymentFrequency: normalizePaymentFrequency(user.paymentFrequency) || existingSchedule.frequency,
    paymentWeekday: normalizePaymentWeekday(user.paymentWeekday) || existingSchedule.weekday,
  });
  const nextPaymentDate =
    draft.paymentFrequency && draft.paymentWeekday
      ? nextPaymentDateFromSchedule(
          draft.paymentFrequency,
          draft.paymentWeekday,
          user.nextPaymentDate && paymentDateMatchesWeekday(user.nextPaymentDate, draft.paymentWeekday) ? user.nextPaymentDate : today()
        )
      : "";
  const scheduleLabel = paymentScheduleLabel(draft.paymentFrequency, draft.paymentWeekday);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave("updateUser", {
      targetUserId: user.id,
      name: user.name,
      role: user.role,
      status: user.status,
      ratePerApplication: Number(draft.ratePerApplication),
      bonusPerInterview: Number(draft.bonusPerInterview),
      nextPaymentDate,
      paymentFrequency: draft.paymentFrequency,
      paymentWeekday: draft.paymentWeekday,
      paymentSchedule: scheduleLabel,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="edit-bidder-settings-title">
        <div className="panel-header">
          <div>
            <h2 id="edit-bidder-settings-title">Edit Bidder Settings</h2>
            <p>{user.name} - {user.email}</p>
          </div>
          <button className="ghost-button compact-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="field">
              <span>Rate per applied job</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.ratePerApplication}
                onChange={(event) => setDraft({ ...draft, ratePerApplication: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Interview bonus</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={draft.bonusPerInterview}
                onChange={(event) => setDraft({ ...draft, bonusPerInterview: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Frequency</span>
              <select
                value={draft.paymentFrequency}
                onChange={(event) => setDraft({ ...draft, paymentFrequency: event.target.value as PaymentFrequency })}
                required
              >
                <option value="">Select frequency</option>
                {paymentFrequencies.map((frequency) => (
                  <option key={frequency.value} value={frequency.value}>{frequency.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Weekday</span>
              <select
                value={draft.paymentWeekday}
                onChange={(event) => setDraft({ ...draft, paymentWeekday: event.target.value as PaymentWeekday })}
                required
              >
                <option value="">Select weekday</option>
                {paymentWeekdays.map((weekday) => (
                  <option key={weekday.value} value={weekday.value}>{weekday.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Next payment</span>
              <input type="date" value={nextPaymentDate} readOnly />
            </label>
            <label className="field">
              <span>Payment schedule</span>
              <input value={scheduleLabel} readOnly placeholder="Select frequency and weekday" />
            </label>
          </div>
          <div className="actions" style={{ marginTop: 14 }}>
            <button className="primary-button" type="submit" disabled={busy}>
              Save bidder settings
            </button>
            <button className="ghost-button" type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function BidderDashboard({ data }: { data: PortalData }) {
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: "", endDate: "" });
  const user = data.currentUser;
  const allLogs = data.workLogs.filter((log) => log.userId === user.id);
  const filteredLogs = filterWorkLogsByDate(allLogs, dateRange);
  const unpaidFilteredLogs = filteredLogs.filter((log) => !isWorkLogPaid(log, data.payments));
  const summary = workSummary(user, filteredLogs);
  const openEstimate = estimateForUser(user, unpaidFilteredLogs);

  return (
    <div className="dashboard-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Work Summary</h2>
            <p>All logged work with date filters.</p>
          </div>
        </div>
        <DateRangeFilter range={dateRange} onChange={setDateRange} />
        <div className="metric-grid">
          <div className="metric">
            <span>Total applied</span>
            <strong>{summary.appliedJobs}</strong>
          </div>
          <div className="metric">
            <span>Total interviews</span>
            <strong>{summary.interviewsScheduled}</strong>
          </div>
          <div className="metric">
            <span>Total earned</span>
            <strong>{money(summary.earned)}</strong>
          </div>
          <div className="metric">
            <span>Open estimate</span>
            <strong>{money(openEstimate)}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>All Work Logs</h2>
            <p>Paid and unpaid bidder logs.</p>
          </div>
          <span className="badge bidder">{summary.logCount} logs</span>
        </div>
        <WorkLogTable
          logs={filteredLogs}
          users={[user]}
          payments={data.payments}
          showPaymentStatus
          emptyMessage="No work logs match this date filter."
        />
      </section>
    </div>
  );
}

function WorkView({
  data,
  busy,
  onSave,
}: {
  data: PortalData;
  busy: boolean;
  onSave: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  if (canViewManagedRecords(data.currentUser.role)) {
    return <AdminWorkLogs data={data} />;
  }

  if (data.currentUser.role === "developer") {
    return (
      <div className="developer-note">
        Developer work logging is planned for the next phase. Payment details and chat remain available.
      </div>
    );
  }

  return <BidderWorkLog data={data} busy={busy} onSave={onSave} />;
}

function BidderWorkLog({
  data,
  busy,
  onSave,
}: {
  data: PortalData;
  busy: boolean;
  onSave: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const [draft, setDraft] = useState({
    workDate: today(),
    sheetLink: "",
    appliedJobs: "",
    interviewsScheduled: "",
    notes: "",
  });
  const [editingWorkLog, setEditingWorkLog] = useState<WorkLog | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: "", endDate: "" });

  const user = data.currentUser;
  const allLogs = data.workLogs.filter((log) => log.userId === user.id);
  const unpaidLogs = allLogs.filter((log) => !isWorkLogPaid(log, data.payments));
  const logs = filterWorkLogsByDate(unpaidLogs, dateRange);
  const summary = workSummary(user, logs);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextData = await onSave("saveWorkLog", {
      workDate: draft.workDate,
      sheetLink: draft.sheetLink,
      appliedJobs: Number(draft.appliedJobs),
      interviewsScheduled: Number(draft.interviewsScheduled),
      notes: draft.notes,
    });
    if (nextData) {
      setDraft({ workDate: today(), sheetLink: "", appliedJobs: "", interviewsScheduled: "", notes: "" });
    }
  }

  async function deleteWorkLog(log: WorkLog) {
    if (!window.confirm("Delete this unpaid work log?")) {
      return;
    }

    await onSave("deleteWorkLog", { workLogId: log.id });
  }

  return (
    <div className="two-column">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Daily Bidder Log</h2>
            <p>Attach the Google Sheet and enter daily totals.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <label className="field">
            <span>Date</span>
            <input type="date" value={draft.workDate} onChange={(event) => setDraft({ ...draft, workDate: event.target.value })} required />
          </label>
          <label className="field">
            <span>Applied jobs</span>
            <input type="number" min="0" value={draft.appliedJobs} onChange={(event) => setDraft({ ...draft, appliedJobs: event.target.value })} required />
          </label>
          <label className="field">
            <span>Interviews scheduled</span>
            <input type="number" min="0" value={draft.interviewsScheduled} onChange={(event) => setDraft({ ...draft, interviewsScheduled: event.target.value })} required />
          </label>
          <label className="field">
            <span>Google Sheet link</span>
            <input type="url" value={draft.sheetLink} onChange={(event) => setDraft({ ...draft, sheetLink: event.target.value })} placeholder="https://docs.google.com/spreadsheets/..." required />
          </label>
          <label className="field full">
            <span>Notes</span>
            <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </label>
          <div className="actions full">
            <button className="primary-button" type="submit" disabled={busy}>
              Save daily log
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Unpaid Work Totals</h2>
            <p>Only unpaid work logs are included here.</p>
          </div>
        </div>
        <DateRangeFilter range={dateRange} onChange={setDateRange} />
        <div className="metric-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <div className="metric">
            <span>Applied jobs</span>
            <strong>{summary.appliedJobs}</strong>
          </div>
          <div className="metric">
            <span>Interviews</span>
            <strong>{summary.interviewsScheduled}</strong>
          </div>
          <div className="metric">
            <span>Job rate</span>
            <strong>{money(user.ratePerApplication)}</strong>
          </div>
          <div className="metric">
            <span>Estimate</span>
            <strong>{money(summary.earned)}</strong>
          </div>
        </div>
      </section>

      <section className="panel" style={{ gridColumn: "1 / -1" }}>
        <div className="section-heading">
          <div>
            <h2>Unpaid Work Logs</h2>
            <p>Logs disappear from this list after a paid payment record covers their work date.</p>
          </div>
          <span className="badge pending">{logs.length} open</span>
        </div>
        <WorkLogTable
          logs={logs}
          users={[user]}
          emptyMessage="No unpaid work logs match this date filter."
          onEditLog={setEditingWorkLog}
          onDeleteLog={deleteWorkLog}
        />
      </section>

      {editingWorkLog ? (
        <WorkLogEditModal
          key={editingWorkLog.id}
          log={editingWorkLog}
          busy={busy}
          onClose={() => setEditingWorkLog(null)}
          onSave={async (payload) => {
            const nextData = await onSave("saveWorkLog", payload);
            if (nextData) {
              setEditingWorkLog(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function AdminWorkLogs({ data }: { data: PortalData }) {
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: "", endDate: "" });
  const [selectedUserId, setSelectedUserId] = useState("all");
  const logUsers = data.users.filter(isWorkerUser);
  const userFilteredLogs = data.workLogs.filter((log) => selectedUserId === "all" || log.userId === selectedUserId);
  const logs = filterWorkLogsByDate(userFilteredLogs, dateRange);

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>All Bidder Logs</h2>
          <p>Daily Google Sheet links, applications, and scheduled interviews.</p>
        </div>
      </div>
      <div className="filter-bar">
        <label className="field">
          <span>Select bidder</span>
          <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
            <option value="all">All bidders</option>
            {logUsers.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </label>
        <DateRangeFilter range={dateRange} onChange={setDateRange} embedded />
      </div>
      <WorkLogTable logs={logs} users={data.users} emptyMessage="No work logs match this date filter." />
    </section>
  );
}

function DateRangeFilter({
  range,
  onChange,
  embedded = false,
}: {
  range: DateRange;
  onChange: (range: DateRange) => void;
  embedded?: boolean;
}) {
  const hasFilter = Boolean(range.startDate || range.endDate);
  const activePreset = range.preset || (hasFilter ? "custom" : "all");
  const showSingleDate = activePreset === "date";
  const showCustomRange = activePreset === "custom";

  function selectPreset(preset: DatePreset) {
    if (preset === "custom") {
      onChange({ ...range, preset });
      return;
    }

    onChange(dateRangeFromPreset(preset));
  }

  const controls = (
    <>
      <label className="field">
        <span>Date filter</span>
        <select value={activePreset} onChange={(event) => selectPreset(event.target.value as DatePreset)}>
          <option value="all">All dates</option>
          <option value="date">Specific date</option>
          <option value="thisWeek">This week</option>
          <option value="lastWeek">Last week</option>
          <option value="last7Days">Last 7 days</option>
          <option value="yesterday">Yesterday</option>
          <option value="custom">Custom range</option>
        </select>
      </label>
      {showSingleDate || showCustomRange ? (
        <label className="field">
          <span>{showSingleDate ? "Date" : "Start date"}</span>
          <input
            type="date"
            value={range.startDate}
            onChange={(event) => onChange({ ...range, preset: activePreset, startDate: event.target.value })}
          />
        </label>
      ) : null}
      {showCustomRange ? (
        <label className="field">
          <span>End date</span>
          <input
            type="date"
            value={range.endDate}
            onChange={(event) => onChange({ ...range, preset: activePreset, endDate: event.target.value })}
          />
        </label>
      ) : null}
      <button
        className="ghost-button"
        type="button"
        disabled={!hasFilter}
        onClick={() => onChange(dateRangeFromPreset("all"))}
      >
        Clear
      </button>
    </>
  );

  if (embedded) {
    return controls;
  }

  return (
    <div className="filter-bar">
      {controls}
    </div>
  );
}

function WorkLogEditModal({
  log,
  busy,
  onClose,
  onSave,
}: {
  log: WorkLog;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    workDate: log.workDate,
    sheetLink: log.sheetLink,
    appliedJobs: String(log.appliedJobs),
    interviewsScheduled: String(log.interviewsScheduled),
    notes: log.notes,
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({
      workLogId: log.id,
      workDate: draft.workDate,
      sheetLink: draft.sheetLink,
      appliedJobs: Number(draft.appliedJobs),
      interviewsScheduled: Number(draft.interviewsScheduled),
      notes: draft.notes,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="edit-work-log-title">
        <div className="panel-header">
          <div>
            <h2 id="edit-work-log-title">Edit Work Log</h2>
            <p>Update this unpaid work log before it is paid.</p>
          </div>
          <button className="ghost-button compact-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <label className="field">
            <span>Date</span>
            <input type="date" value={draft.workDate} onChange={(event) => setDraft({ ...draft, workDate: event.target.value })} required />
          </label>
          <label className="field">
            <span>Applied jobs</span>
            <input type="number" min="0" value={draft.appliedJobs} onChange={(event) => setDraft({ ...draft, appliedJobs: event.target.value })} required />
          </label>
          <label className="field">
            <span>Interviews scheduled</span>
            <input type="number" min="0" value={draft.interviewsScheduled} onChange={(event) => setDraft({ ...draft, interviewsScheduled: event.target.value })} required />
          </label>
          <label className="field">
            <span>Google Sheet link</span>
            <input type="url" value={draft.sheetLink} onChange={(event) => setDraft({ ...draft, sheetLink: event.target.value })} required />
          </label>
          <label className="field full">
            <span>Notes</span>
            <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </label>
          <div className="actions full">
            <button className="primary-button" type="submit" disabled={busy}>
              Save changes
            </button>
            <button className="ghost-button" type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function WorkLogTable({
  logs,
  users,
  payments = [],
  showPaymentStatus = false,
  emptyMessage = "No work logs yet.",
  onEditLog,
  onDeleteLog,
}: {
  logs: WorkLog[];
  users: PortalUser[];
  payments?: PaymentRecord[];
  showPaymentStatus?: boolean;
  emptyMessage?: string;
  onEditLog?: (log: WorkLog) => void;
  onDeleteLog?: (log: WorkLog) => void;
}) {
  if (!logs.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>User</th>
            <th>Sheet</th>
            <th>Applied</th>
            <th>Interviews</th>
            {showPaymentStatus ? <th>Status</th> : null}
            <th>Notes</th>
            {onEditLog || onDeleteLog ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const user = userById(users, log.userId);
            const paid = isWorkLogPaid(log, payments);
            return (
              <tr key={log.id}>
                <td>{shortDate(log.workDate)}</td>
                <td>{user?.name || "Unknown"}</td>
                <td><a href={log.sheetLink} target="_blank" rel="noreferrer">Open sheet</a></td>
                <td>{log.appliedJobs}</td>
                <td>{log.interviewsScheduled}</td>
                {showPaymentStatus ? (
                  <td><span className={`badge ${paid ? "bidder" : "pending"}`}>{paid ? "Paid" : "Unpaid"}</span></td>
                ) : null}
                <td>{log.notes || "-"}</td>
                {onEditLog || onDeleteLog ? (
                  <td>
                    <ActionMenu
                      items={[
                        ...(onEditLog ? [{ label: "Edit", onClick: () => onEditLog(log) }] : []),
                        ...(onDeleteLog ? [{ label: "Delete", danger: true, onClick: () => onDeleteLog(log) }] : []),
                      ]}
                    />
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsView({
  data,
  busy,
  onAction,
}: {
  data: PortalData;
  busy: boolean;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  if (canViewManagedRecords(data.currentUser.role)) {
    return <AdminPayments data={data} busy={busy} onAction={onAction} />;
  }

  return <UserPayments data={data} busy={busy} onAction={onAction} />;
}

function PaymentMethodForm({
  busy,
  onSave,
  editingMethod,
  onCancelEdit,
}: {
  busy: boolean;
  onSave: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
  editingMethod?: PaymentMethod | null;
  onCancelEdit?: () => void;
}) {
  const [method, setMethod] = useState(editingMethod?.method || "Payoneer");
  const [address, setAddress] = useState(editingMethod?.address || "");
  const isEditing = Boolean(editingMethod);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextData = await onSave("savePaymentMethod", {
      methodId: editingMethod?.id,
      method,
      address,
    });
    if (nextData) {
      setAddress("");
      onCancelEdit?.();
    }
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <label className="field">
        <span>Payment method</span>
        <select value={method} onChange={(event) => setMethod(event.target.value)}>
          {paymentMethods.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Address</span>
        <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Wallet, email, account, or address" required />
      </label>
      <div className="actions full">
        <button className="primary-button" type="submit" disabled={busy}>
          {isEditing ? "Save method changes" : "Save payment method"}
        </button>
        {isEditing ? (
          <button className="ghost-button" type="button" disabled={busy} onClick={onCancelEdit}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function PaymentMethodList({
  methods,
  onEdit,
}: {
  methods: PaymentMethod[];
  onEdit?: (method: PaymentMethod) => void;
}) {
  if (!methods.length) {
    return <div className="empty-state">No payment method saved yet.</div>;
  }

  return (
    <div className="payment-method-list">
      {methods.map((method) => (
        <div className="method-row" key={method.id}>
          <div>
            <strong>{method.method}</strong>
            <span className="muted">Address: {method.address}</span>
          </div>
          <div className="method-actions">
            {method.isPrimary ? <span className="badge bidder">Primary</span> : null}
            {onEdit ? <ActionMenu items={[{ label: "Edit", onClick: () => onEdit(method) }]} /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function UserPayments({
  data,
  busy,
  onAction,
}: {
  data: PortalData;
  busy: boolean;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const user = data.currentUser;
  const methods = data.paymentMethods.filter((method) => method.userId === user.id);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const earned = estimateForUser(user, data.workLogs);
  const paid = paidForUser(user.id, data.payments);
  const scheduled = scheduledForUser(user.id, data.payments);
  const open = Math.max(0, earned - paid);

  return (
    <div className="two-column">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Payment Method</h2>
            <p>Manual payout details only; no payment processor is connected.</p>
          </div>
        </div>
        <PaymentMethodForm
          key={editingMethod?.id || "new-method"}
          busy={busy}
          onSave={onAction}
          editingMethod={editingMethod}
          onCancelEdit={() => setEditingMethod(null)}
        />
        <div style={{ marginTop: 16 }}>
          <PaymentMethodList methods={methods} onEdit={setEditingMethod} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Next Payment</h2>
            <p>{user.paymentSchedule || "Schedule not set yet."}</p>
          </div>
          <span className="badge pending">{shortDate(user.nextPaymentDate)}</span>
        </div>
        <div className="metric-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <div className="metric">
            <span>Rate per applied job</span>
            <strong>{money(user.ratePerApplication)}</strong>
          </div>
          <div className="metric">
            <span>Interview bonus</span>
            <strong>{money(user.bonusPerInterview)}</strong>
          </div>
          <div className="metric">
            <span>Estimated open</span>
            <strong>{money(open)}</strong>
          </div>
          <div className="metric">
            <span>Scheduled</span>
            <strong>{money(scheduled)}</strong>
          </div>
        </div>
      </section>

      <section className="panel" style={{ gridColumn: "1 / -1" }}>
        <div className="panel-header">
          <div>
            <h2>Payment History</h2>
            <p>Client-added payout records and receipt links.</p>
          </div>
        </div>
        <PaymentTable payments={data.payments} users={[user]} />
      </section>
    </div>
  );
}

function AdminPayments({
  data,
  busy,
  onAction,
}: {
  data: PortalData;
  busy: boolean;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const payableUsers = data.users.filter((user) =>
    isWorkerUser(user) &&
    (isSuperAdminRole(data.currentUser.role) || user.assignedAdminId === data.currentUser.id)
  );
  const canRecordPayments = isSuperAdminRole(data.currentUser.role) || isClientRole(data.currentUser.role);
  const canModifyPayments = isSuperAdminRole(data.currentUser.role);
  const [draft, setDraft] = useState({
    userId: payableUsers[0]?.id || "",
    periodStart: today(),
    periodEnd: today(),
    scheduledDate: payableUsers[0]?.nextPaymentDate || today(),
    amount: "",
    paymentLink: "",
    memo: "",
  });
  const creditClients = isSuperAdminRole(data.currentUser.role) ? clientUsers(data.users) : [data.currentUser].filter((user) => isClientRole(user.role));
  const [depositDraft, setDepositDraft] = useState({
    clientId: data.currentUser.role === "super_admin" ? creditClients[0]?.id || "" : data.currentUser.id,
    amount: "",
    currency: "USD",
    toCurrency: "USDT",
    network: "tron",
  });
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);

  const selectedUser = payableUsers.find((user) => user.id === draft.userId);
  const paymentClientId = isSuperAdminRole(data.currentUser.role)
    ? selectedUser?.assignedAdminId || depositDraft.clientId
    : data.currentUser.id;
  const depositClientId = isSuperAdminRole(data.currentUser.role) ? depositDraft.clientId : data.currentUser.id;
  const creditBalance = paymentClientId ? creditBalanceForClient(paymentClientId, data.deposits || [], data.payments) : 0;
  const depositAmount = Number(depositDraft.amount) || 0;
  const depositFee = Math.round(depositAmount * 0.05 * 100) / 100;
  const depositCredit = Math.max(0, Math.round((depositAmount - depositFee) * 100) / 100);
  const suggestedAmount = selectedUser
    ? Math.max(0, estimateForUser(selectedUser, data.workLogs) - paidForUser(selectedUser.id, data.payments))
    : 0;
  const scheduledPaymentItems: UpcomingPaymentItem[] = data.payments
    .filter((payment) => payment.status === "scheduled")
    .map((payment) => {
      const user = userById(data.users, payment.userId);
      return {
        id: payment.id,
        user,
        scheduledDate: payment.scheduledDate,
        amount: payment.amount,
        daysUntil: daysUntil(payment.scheduledDate),
        description: `${shortDate(payment.periodStart)} - ${shortDate(payment.periodEnd)}`,
        sourceLabel: "Scheduled record",
      };
    });
  const scheduledKeys = new Set(
    scheduledPaymentItems.map((item) => `${item.user?.id || "unknown"}:${item.scheduledDate}`)
  );
  const paydayItems: UpcomingPaymentItem[] = payableUsers
    .filter((user) => user.nextPaymentDate && !scheduledKeys.has(`${user.id}:${user.nextPaymentDate}`))
    .map((user) => ({
      id: `payday-${user.id}`,
      user,
      scheduledDate: user.nextPaymentDate,
      amount: Math.max(0, estimateForUser(user, data.workLogs) - paidForUser(user.id, data.payments)),
      daysUntil: daysUntil(user.nextPaymentDate),
      description: user.paymentSchedule || "From next payment date",
      sourceLabel: "Needs payment record",
    }));
  const upcomingPayments = [...scheduledPaymentItems, ...paydayItems]
    .filter((item) => item.daysUntil >= 0)
    .sort((left, right) => left.daysUntil - right.daysUntil || left.scheduledDate.localeCompare(right.scheduledDate))
    .slice(0, 10);
  const paydayReminders = [...scheduledPaymentItems, ...paydayItems]
    .filter((item) => item.daysUntil <= 1)
    .sort((left, right) => left.daysUntil - right.daysUntil || left.scheduledDate.localeCompare(right.scheduledDate));

  async function deletePayment(payment: PaymentRecord) {
    const user = userById(data.users, payment.userId);
    const label = `${user?.name || "this user"} - ${money(payment.amount)} on ${shortDate(payment.scheduledDate)}`;
    if (!window.confirm(`Delete payment record for ${label}?`)) {
      return;
    }

    const nextData = await onAction("deletePayment", { paymentId: payment.id });
    if (nextData && editingPayment?.id === payment.id) {
      setEditingPayment(null);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextData = await onAction("addPayment", {
      userId: draft.userId,
      clientId: paymentClientId,
      periodStart: draft.periodStart,
      periodEnd: draft.periodEnd,
      scheduledDate: draft.scheduledDate,
      amount: Number(draft.amount),
      paymentLink: draft.paymentLink,
      memo: draft.memo,
    });
    if (nextData) {
      setDraft({ ...draft, amount: "", paymentLink: "", memo: "" });
    }
  }

  async function submitDeposit(event: FormEvent) {
    event.preventDefault();
    const nextData = await onAction("createCreditDeposit", {
      clientId: depositDraft.clientId,
      amount: Number(depositDraft.amount),
      currency: depositDraft.currency,
      toCurrency: depositDraft.toCurrency,
      network: depositDraft.network,
    });
    if (nextData) {
      setDepositDraft({ ...depositDraft, amount: "" });
    }
  }

  function handleUserChange(userId: string) {
    const nextUser = payableUsers.find((user) => user.id === userId);
    setDraft({ ...draft, userId, scheduledDate: nextUser?.nextPaymentDate || draft.scheduledDate || today() });
  }

  return (
    <div className="two-column">
      <PaydayReminder reminders={paydayReminders} />

      {canRecordPayments ? (
        <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Add Payment Record</h2>
            <p>Pay assigned bidders from client credits.</p>
          </div>
          <span className="badge paid">{money(creditBalance)} credits</span>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <label className="field full">
            <span>User</span>
            <select value={draft.userId} onChange={(event) => handleUserChange(event.target.value)} required>
              {payableUsers.map((user) => (
                <option key={user.id} value={user.id}>{user.name} - {roleLabel(user.role)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Period start</span>
            <input type="date" value={draft.periodStart} onChange={(event) => setDraft({ ...draft, periodStart: event.target.value })} required />
          </label>
          <label className="field">
            <span>Period end</span>
            <input type="date" value={draft.periodEnd} onChange={(event) => setDraft({ ...draft, periodEnd: event.target.value })} required />
          </label>
          <label className="field">
            <span>Paid date</span>
            <input type="date" value={draft.scheduledDate} onChange={(event) => setDraft({ ...draft, scheduledDate: event.target.value })} required />
          </label>
          <label className="field">
            <span>Amount</span>
            <input type="number" min="0" step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} placeholder={money(suggestedAmount)} required />
          </label>
          <label className="field">
            <span>Payment link</span>
            <input value={draft.paymentLink} onChange={(event) => setDraft({ ...draft, paymentLink: event.target.value })} placeholder="Optional receipt or transfer note" />
          </label>
          <label className="field full">
            <span>Memo</span>
            <textarea value={draft.memo} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} />
          </label>
          <div className="actions full">
            <button className="primary-button" type="submit" disabled={busy || !payableUsers.length || (Number(draft.amount) || 0) > creditBalance}>Save paid payment</button>
            <button className="ghost-button" type="button" onClick={() => setDraft({ ...draft, amount: String(suggestedAmount.toFixed(2)) })}>
              Use estimate
            </button>
          </div>
        </form>
        </section>
      ) : null}

      <div className="payment-side-column">
        <UpcomingPaymentsPanel payments={upcomingPayments} />

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Credit Wallet</h2>
              <p>Deposit through Cryptomus. A 5% platform fee is deducted before credits are added.</p>
            </div>
          </div>
          <div className="metric-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            <div className="metric">
              <span>Credit balance</span>
              <strong>{money(depositClientId ? creditBalanceForClient(depositClientId, data.deposits || [], data.payments) : 0)}</strong>
            </div>
            <div className="metric">
              <span>Total deposited</span>
              <strong>{money(depositClientId ? creditsDepositedForClient(depositClientId, data.deposits || []) : 0)}</strong>
            </div>
            <div className="metric">
              <span>Credits spent</span>
              <strong>{money(depositClientId ? creditsSpentForClient(depositClientId, data.payments) : 0)}</strong>
            </div>
          </div>
          <form className="form-grid" onSubmit={submitDeposit}>
            {data.currentUser.role === "super_admin" ? (
              <label className="field full">
                <span>Client</span>
                <select value={depositDraft.clientId} onChange={(event) => setDepositDraft({ ...depositDraft, clientId: event.target.value })} required>
                  {creditClients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="field">
              <span>Deposit amount</span>
              <input type="number" min="0" step="0.01" value={depositDraft.amount} onChange={(event) => setDepositDraft({ ...depositDraft, amount: event.target.value })} required />
            </label>
            <label className="field">
              <span>5% fee</span>
              <input value={money(depositFee)} readOnly />
            </label>
            <label className="field">
              <span>Credits added</span>
              <input value={money(depositCredit)} readOnly />
            </label>
            <label className="field">
              <span>Invoice currency</span>
              <select value={depositDraft.currency} onChange={(event) => setDepositDraft({ ...depositDraft, currency: event.target.value })}>
                <option value="USD">USD</option>
                <option value="USDT">USDT</option>
              </select>
            </label>
            <label className="field">
              <span>Pay with</span>
              <select value={depositDraft.toCurrency} onChange={(event) => setDepositDraft({ ...depositDraft, toCurrency: event.target.value })}>
                <option value="USDT">USDT</option>
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
              </select>
            </label>
            <label className="field">
              <span>Network</span>
              <select value={depositDraft.network} onChange={(event) => setDepositDraft({ ...depositDraft, network: event.target.value })}>
                <option value="tron">TRON</option>
                <option value="bsc">BEP20</option>
                <option value="ethereum">Ethereum</option>
                <option value="">Any supported network</option>
              </select>
            </label>
            <div className="actions full">
              <button className="primary-button" type="submit" disabled={busy || !creditClients.length}>
                Create Cryptomus invoice
              </button>
            </div>
          </form>
          <DepositList deposits={(data.deposits || []).filter((deposit) => !depositClientId || deposit.clientId === depositClientId).slice(0, 5)} users={data.users} />
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Payment Methods</h2>
              <p>Saved payout destinations from bidders and developers.</p>
            </div>
          </div>
          <div className="payment-method-list">
            {payableUsers.map((user) => {
              const methods = data.paymentMethods.filter((method) => method.userId === user.id);
              const primary = methods.find((method) => method.isPrimary) || methods[0];
              return (
                <div className="method-row" key={user.id}>
                  <div>
                    <strong>{user.name}</strong>
                    <span className="muted">{primary ? `${primary.method}: ${primary.address}` : "No method saved"}</span>
                  </div>
                  <span className={`badge ${user.status}`}>{statusLabel(user.status)}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="panel" style={{ gridColumn: "1 / -1" }}>
        <div className="panel-header">
          <div>
            <h2>Payment History</h2>
            <p>Paid records and receipt links.</p>
          </div>
        </div>
        <PaymentTable
          payments={data.payments}
          users={data.users}
          onEdit={canModifyPayments ? setEditingPayment : undefined}
          onDelete={canModifyPayments ? deletePayment : undefined}
        />
      </section>

      <section className="panel" style={{ gridColumn: "1 / -1" }}>
        <div className="panel-header">
          <div>
            <h2>Escrow History</h2>
            <p>Client escrow records with the 5% fee and net funded amount.</p>
          </div>
        </div>
        <EscrowTable escrows={data.escrows || []} users={data.users} />
      </section>

      {editingPayment ? (
        <PaymentEditModal
          key={editingPayment.id}
          payment={editingPayment}
          users={payableUsers}
          busy={busy}
          onClose={() => setEditingPayment(null)}
          onSave={async (payload) => {
            const nextData = await onAction("editPayment", payload);
            if (nextData) {
              setEditingPayment(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function PaydayReminder({ reminders }: { reminders: UpcomingPaymentItem[] }) {
  if (!reminders.length) {
    return null;
  }

  return (
    <section className="payday-alert" style={{ gridColumn: "1 / -1" }}>
      <div>
        <h2>Payday Reminder</h2>
        <p>These payouts are due today, tomorrow, or already overdue.</p>
      </div>
      <div className="payment-method-list">
        {reminders.map((item) => (
          <div className="payment-row urgent" key={item.id}>
            <div>
              <strong>{item.user?.name || "Unknown user"}</strong>
              <span className="muted">
                {paymentTimingLabel(item.daysUntil)} - {shortDate(item.scheduledDate)} - {item.sourceLabel}
              </span>
            </div>
            <div>
              <strong>{money(item.amount)}</strong>
              <span className="mini-label">{item.description}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function UpcomingPaymentsPanel({ payments }: { payments: UpcomingPaymentItem[] }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Upcoming Payments</h2>
          <p>Scheduled payouts and upcoming next-payment dates.</p>
        </div>
      </div>
      {payments.length ? (
        <div className="payment-method-list">
          {payments.map((item) => (
            <div className="payment-row" key={item.id}>
              <div>
                <strong>{item.user?.name || "Unknown user"}</strong>
                <span className="muted">
                  {paymentTimingLabel(item.daysUntil)} - {shortDate(item.scheduledDate)}
                </span>
              </div>
              <div>
                <strong>{money(item.amount)}</strong>
                <span className="mini-label">{item.sourceLabel}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state compact">No upcoming scheduled payments.</div>
      )}
    </section>
  );
}

function PaymentEditModal({
  payment,
  users,
  busy,
  onClose,
  onSave,
}: {
  payment: PaymentRecord;
  users: PortalUser[];
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    userId: payment.userId,
    periodStart: payment.periodStart,
    periodEnd: payment.periodEnd,
    scheduledDate: payment.scheduledDate,
    amount: String(payment.amount),
    paymentLink: payment.paymentLink,
    memo: payment.memo,
  });

  function handleUserChange(userId: string) {
    const nextUser = users.find((user) => user.id === userId);
    setDraft({ ...draft, userId, scheduledDate: nextUser?.nextPaymentDate || draft.scheduledDate || today() });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({
      paymentId: payment.id,
      userId: draft.userId,
      periodStart: draft.periodStart,
      periodEnd: draft.periodEnd,
      scheduledDate: draft.scheduledDate,
      amount: Number(draft.amount),
      paymentLink: draft.paymentLink,
      memo: draft.memo,
    });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="edit-payment-title">
        <div className="panel-header">
          <div>
            <h2 id="edit-payment-title">Edit Payment</h2>
            <p>Update the paid payout record and receipt link.</p>
          </div>
          <button className="ghost-button compact-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <label className="field full">
            <span>User</span>
            <select value={draft.userId} onChange={(event) => handleUserChange(event.target.value)} required>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name} - {roleLabel(user.role)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Period start</span>
            <input type="date" value={draft.periodStart} onChange={(event) => setDraft({ ...draft, periodStart: event.target.value })} required />
          </label>
          <label className="field">
            <span>Period end</span>
            <input type="date" value={draft.periodEnd} onChange={(event) => setDraft({ ...draft, periodEnd: event.target.value })} required />
          </label>
          <label className="field">
            <span>Paid date</span>
            <input type="date" value={draft.scheduledDate} onChange={(event) => setDraft({ ...draft, scheduledDate: event.target.value })} required />
          </label>
          <label className="field">
            <span>Amount</span>
            <input type="number" min="0" step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} required />
          </label>
          <label className="field full">
            <span>Payment link</span>
            <input value={draft.paymentLink} onChange={(event) => setDraft({ ...draft, paymentLink: event.target.value })} placeholder="Receipt or transfer link" required />
          </label>
          <label className="field full">
            <span>Memo</span>
            <textarea value={draft.memo} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} />
          </label>
          <div className="actions full">
            <button className="primary-button" type="submit" disabled={busy}>
              Save edit
            </button>
            <button className="ghost-button" type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PaymentTable({
  payments,
  users,
  onEdit,
  onDelete,
}: {
  payments: PaymentRecord[];
  users: PortalUser[];
  onEdit?: (payment: PaymentRecord) => void;
  onDelete?: (payment: PaymentRecord) => void;
}) {
  if (!payments.length) {
    return <div className="empty-state">No payment history yet.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Period</th>
            <th>Paid date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Link</th>
            <th>Memo</th>
            {onEdit || onDelete ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => {
            const user = userById(users, payment.userId);
            return (
              <tr key={payment.id}>
                <td>{user?.name || "Unknown"}</td>
                <td>{shortDate(payment.periodStart)} - {shortDate(payment.periodEnd)}</td>
                <td>{shortDate(payment.scheduledDate)}</td>
                <td>{money(payment.amount)}</td>
                <td><span className={`badge ${payment.status === "paid" ? "bidder" : "pending"}`}>{titleCase(payment.status)}</span></td>
                <td>{payment.paymentLink ? <a href={payment.paymentLink} target="_blank" rel="noreferrer">Open link</a> : "-"}</td>
                <td>{payment.memo || "-"}</td>
                {onEdit || onDelete ? (
                  <td>
                    <ActionMenu
                      items={[
                        ...(onEdit ? [{ label: "Edit", onClick: () => onEdit(payment) }] : []),
                        ...(onDelete ? [{ label: "Delete", danger: true, onClick: () => onDelete(payment) }] : []),
                      ]}
                    />
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EscrowTable({ escrows, users }: { escrows: EscrowRecord[]; users: PortalUser[] }) {
  if (!escrows.length) {
    return <div className="empty-state">No escrow records yet.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Client</th>
            <th>Date</th>
            <th>Gross</th>
            <th>5% fee</th>
            <th>Net escrow</th>
            <th>Link</th>
            <th>Memo</th>
          </tr>
        </thead>
        <tbody>
          {escrows.map((escrow) => {
            const client = userById(users, escrow.clientId);
            return (
              <tr key={escrow.id}>
                <td>{client?.name || "Unknown client"}</td>
                <td>{shortDate(escrow.createdAt.slice(0, 10))}</td>
                <td>{money(escrow.amount)}</td>
                <td>{money(escrow.feeAmount)}</td>
                <td>{money(escrow.netAmount)}</td>
                <td>{escrow.receiptLink ? <a href={escrow.receiptLink} target="_blank" rel="noreferrer">Open link</a> : "-"}</td>
                <td>{escrow.memo || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DepositList({ deposits, users }: { deposits: DepositRecord[]; users: PortalUser[] }) {
  if (!deposits.length) {
    return <div className="empty-state compact">No credit deposits yet.</div>;
  }

  return (
    <div className="payment-method-list" style={{ marginTop: 16 }}>
      {deposits.map((deposit) => {
        const client = userById(users, deposit.clientId);
        return (
          <div className="payment-row" key={deposit.id}>
            <div>
              <strong>{money(deposit.creditAmount)} credits</strong>
              <span className="muted">
                {client?.name || "Client"} - {money(deposit.amount)} deposit - {deposit.providerStatus || deposit.status}
              </span>
            </div>
            <div className="actions">
              <span className={`badge ${deposit.status === "paid" ? "paid" : deposit.status === "failed" ? "paused" : "pending"}`}>
                {titleCase(deposit.status)}
              </span>
              {deposit.paymentUrl ? <a href={deposit.paymentUrl} target="_blank" rel="noreferrer">Open invoice</a> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type ChatAttachmentDraft = Omit<ChatAttachment, "id"> & { id?: string };

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("File could not be read."));
    reader.readAsDataURL(file);
  });
}

function ChatAttachmentView({ attachment }: { attachment: ChatAttachmentDraft }) {
  const isImage = attachment.type.startsWith("image/");
  const isAudio = attachment.type.startsWith("audio/");

  return (
    <div className={`chat-attachment ${isImage ? "image" : ""}`}>
      {isImage ? (
        <a href={attachment.dataUrl} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={attachment.dataUrl} alt={attachment.name} />
        </a>
      ) : isAudio ? (
        <audio controls preload="metadata" src={attachment.dataUrl} />
      ) : (
        <a className="file-link" href={attachment.dataUrl} download={attachment.name}>
          {attachment.name}
        </a>
      )}
      <span>{attachment.name} - {formatBytes(attachment.size)}</span>
    </div>
  );
}

function ChatAttachments({ attachments }: { attachments: ChatAttachmentDraft[] }) {
  if (!attachments.length) {
    return null;
  }

  return (
    <div className="chat-attachments">
      {attachments.map((attachment, index) => (
        <ChatAttachmentView
          key={attachment.id || `${attachment.name}-${attachment.size}-${index}`}
          attachment={attachment}
        />
      ))}
    </div>
  );
}

function ChatView({
  data,
  busy,
  notificationsEnabled,
  onEnableNotifications,
  onSend,
  requestedRecipientId,
}: {
  data: PortalData;
  busy: boolean;
  notificationsEnabled: boolean;
  onEnableNotifications: () => Promise<void>;
  onSend: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
  requestedRecipientId: string;
}) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachmentDraft[]>([]);
  const [chatError, setChatError] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editBody, setEditBody] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [readReceipts, setReadReceipts] = useState<Record<string, string>>(() => loadChatReadReceipts(data.currentUser.id));
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentUser = data.currentUser;
  const canSend = currentUser.status === "approved";
  const userTimeZone = browserTimeZone();
  const notificationSupported = typeof window !== "undefined" && "Notification" in window;
  const membersById = new Map<string, PortalUser>();
  [currentUser, ...data.users, ...(data.chatContacts || [])].forEach((user) => {
    membersById.set(user.id, user);
  });
  const contactUsers = (data.chatContacts || []).filter((user) => {
    if (user.id === currentUser.id) {
      return false;
    }

    const conversationId = inboxConversationId(currentUser.id, user.id);
    const hasConversation = data.chatMessages.some((message) => chatConversationIdForMessage(message) === conversationId);
    const isRequestedRecipient = user.id === requestedRecipientId;

    if (currentUser.role === "bidder" && !isClientRole(user.role)) {
      return false;
    }

    return hasConversation || isRequestedRecipient;
  });
  const directConversations = contactUsers.map((contact) => {
    const conversationId = inboxConversationId(currentUser.id, contact.id);
    const messages = data.chatMessages.filter((message) => chatConversationIdForMessage(message) === conversationId);
    const latestMessage = messages[messages.length - 1];
    const unreadCount = messages.filter(
      (message) =>
        message.userId !== currentUser.id &&
        !message.deletedAt &&
        (!readReceipts[conversationId] || message.createdAt > readReceipts[conversationId])
    ).length;

    return {
      id: `direct:${contact.id}`,
      conversationId,
      recipientId: contact.id,
      recipientAllowsContact: contact.allowDirectMessages !== false,
      title: contact.name,
      subtitle: `${roleLabel(contact.role)} - ${contact.email}`,
      preview: latestMessage?.deletedAt ? "Message deleted" : latestMessage?.body || latestMessage?.attachments?.[0]?.name || "No messages yet",
      avatar: initialsForName(contact.name),
      unreadCount,
      monitored: false,
    };
  }).sort((left, right) => {
    if (left.recipientId === requestedRecipientId) return -1;
    if (right.recipientId === requestedRecipientId) return 1;
    return right.unreadCount - left.unreadCount;
  });
  const directConversationIds = new Set(directConversations.map((conversation) => conversation.conversationId));
  const monitoredConversations = isSuperAdminRole(currentUser.role)
    ? Array.from(new Set(data.chatMessages.map(chatConversationIdForMessage).filter(Boolean)))
        .filter((conversationId) => !directConversationIds.has(conversationId))
        .map((conversationId) => {
          const messages = data.chatMessages.filter((message) => chatConversationIdForMessage(message) === conversationId);
          const latestMessage = messages[messages.length - 1];
          const participantIds = Array.from(
            new Set(messages.flatMap((message) => [message.userId, message.recipientId || ""]).filter(Boolean))
          );
          const participantNames = participantIds.map((id) => membersById.get(id)?.name || "Unknown member");

          return {
            id: `monitor:${conversationId}`,
            conversationId,
            recipientId: "",
            recipientAllowsContact: false,
            title: participantNames.join(" / ") || "Monitored conversation",
            subtitle: "Monitored conversation",
            preview: latestMessage?.deletedAt ? "Message deleted" : latestMessage?.body || latestMessage?.attachments?.[0]?.name || "No messages yet",
            avatar: "SA",
            unreadCount: 0,
            monitored: true,
          };
        })
    : [];
  const conversations = [...directConversations, ...monitoredConversations];
  const activeConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) || conversations[0];
  const activeConversationId = activeConversation?.conversationId || "";
  const activeMessages = useMemo(
    () =>
      activeConversationId
        ? data.chatMessages.filter((message) => chatConversationIdForMessage(message) === activeConversationId)
        : [],
    [activeConversationId, data.chatMessages]
  );
  const canSubmit =
    canSend &&
    Boolean(activeConversation) &&
    !activeConversation.monitored &&
    activeConversation.recipientAllowsContact &&
    Boolean(activeConversation.recipientId) &&
    Boolean(body.trim() || attachments.length);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [activeConversation?.id, activeMessages.length]);

  useEffect(() => {
    const conversationId = activeConversationId;
    if (!conversationId || !activeMessages.length) {
      return;
    }

    const latestIncomingMessage = [...activeMessages]
      .reverse()
      .find((message) => message.userId !== currentUser.id && !message.deletedAt);
    if (!latestIncomingMessage || readReceipts[conversationId] === latestIncomingMessage.createdAt) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setReadReceipts((current) => {
        const nextReceipts = { ...current, [conversationId]: latestIncomingMessage.createdAt };
        saveChatReadReceipts(currentUser.id, nextReceipts);
        return nextReceipts;
      });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [activeConversationId, activeMessages, currentUser.id, readReceipts]);

  function selectConversation(conversationId: string) {
    setSelectedConversationId(conversationId);
    setEditingMessageId("");
    setEditBody("");
    setChatError("");
  }

  async function sendMessage() {
    if (!canSubmit || busy) {
      return;
    }

    const nextData = await onSend("addChatMessage", {
      recipientId: activeConversation?.recipientId || "",
      body,
      attachments,
      authorTimeZone: userTimeZone,
    });
    if (nextData) {
      setBody("");
      setAttachments([]);
      setChatError("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await sendMessage();
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) {
      return;
    }

    const remainingSlots = chatAttachmentLimit - attachments.length;
    const acceptedFiles = selectedFiles.slice(0, Math.max(0, remainingSlots));
    const skippedCount = selectedFiles.length - acceptedFiles.length;
    const nextAttachments: ChatAttachmentDraft[] = [];
    let nextError = skippedCount > 0 ? `Only ${chatAttachmentLimit} files can be attached to one message.` : "";

    for (const file of acceptedFiles) {
      if (file.size > maxChatAttachmentBytes) {
        nextError = "Each chat file must be 2 MB or smaller.";
        continue;
      }

      try {
        nextAttachments.push({
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          dataUrl: await readFileAsDataUrl(file),
        });
      } catch (fileError) {
        nextError = fileError instanceof Error ? fileError.message : "File could not be read.";
      }
    }

    if (nextAttachments.length) {
      setAttachments((current) => [...current, ...nextAttachments]);
    }
    setChatError(nextError);
    event.target.value = "";
  }

  function removeAttachment(index: number) {
    setAttachments((current) => current.filter((_, attachmentIndex) => attachmentIndex !== index));
  }

  function startEditing(message: ChatMessage) {
    setEditingMessageId(message.id);
    setEditBody(message.body || "");
    setChatError("");
  }

  function cancelEditing() {
    setEditingMessageId("");
    setEditBody("");
  }

  async function saveEditedMessage(message: ChatMessage) {
    const nextData = await onSend("editChatMessage", {
      messageId: message.id,
      body: editBody,
    });
    if (nextData) {
      cancelEditing();
    }
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, message: ChatMessage) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void saveEditedMessage(message);
    }
  }

  async function deleteMessage(message: ChatMessage) {
    const nextData = await onSend("deleteChatMessage", { messageId: message.id });
    if (nextData && editingMessageId === message.id) {
      cancelEditing();
    }
  }

  return (
    <section className="panel chat-panel">
      <div className="chat-toolbar">
        <div className="telegram-chat-title">
          <div className="telegram-avatar">{activeConversation?.avatar || "IN"}</div>
          <div>
            <h2>{activeConversation?.title || "Inbox"}</h2>
            <p>
              {activeConversation
                ? `${activeConversation.subtitle} - ${activeMessages.length} messages`
                : "Choose an approved member to start a conversation."}
            </p>
          </div>
        </div>
        {notificationSupported ? (
          <button
            className="ghost-button"
            type="button"
            disabled={notificationsEnabled}
            onClick={onEnableNotifications}
          >
            {notificationsEnabled ? "Notifications on" : "Enable notifications"}
          </button>
        ) : null}
      </div>

      <div className="inbox-layout">
        <div className="conversation-list" aria-label="Inbox conversations">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              className={`conversation-button ${activeConversation?.id === conversation.id ? "active" : ""}`}
              onClick={() => selectConversation(conversation.id)}
            >
              <span className="conversation-avatar">{conversation.avatar}</span>
              <span>
                <strong>{conversation.title}</strong>
                <small>{conversation.preview}</small>
              </span>
              {conversation.unreadCount ? <span className="conversation-badge">{conversation.unreadCount}</span> : null}
            </button>
          ))}
          {!conversations.length ? (
            <div className="empty-state compact">No inbox contacts yet.</div>
          ) : null}
        </div>

        <div className="messages">
          {activeMessages.map((message) => {
            const deleted = Boolean(message.deletedAt);
            const isMine = message.userId === currentUser.id;
            const canEdit = !deleted && (isMine || isSuperAdminRole(currentUser.role));
            const canDelete = !deleted && isSuperAdminRole(currentUser.role);
            const isEditing = editingMessageId === message.id;
            const messageAttachments = message.attachments || [];
            const menuItems: ActionMenuItem[] = [];

            if (canEdit) {
              menuItems.push({ label: "Edit", onClick: () => startEditing(message) });
            }
            if (canDelete) {
              menuItems.push({ label: "Delete", danger: true, disabled: busy, onClick: () => void deleteMessage(message) });
            }

            return (
              <div className={`message-row ${isMine ? "mine" : ""}`} key={message.id}>
                <div className={`message ${isMine ? "mine" : ""} ${deleted ? "deleted" : ""}`}>
                  {!isMine ? (
                    <div className="message-author">
                      <strong>{message.authorName}</strong>
                      <span>{roleLabel(message.authorRole)}</span>
                    </div>
                  ) : null}

                  {deleted ? (
                    <p className="muted">Message deleted</p>
                  ) : isEditing ? (
                    <div className="message-edit">
                      <textarea
                        value={editBody}
                        onChange={(event) => setEditBody(event.target.value)}
                        onKeyDown={(event) => handleEditKeyDown(event, message)}
                        autoFocus
                      />
                      <div className="actions">
                        <button className="primary-button" type="button" disabled={busy} onClick={() => void saveEditedMessage(message)}>
                          Save edit
                        </button>
                        <button className="ghost-button" type="button" onClick={cancelEditing}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {message.body ? <p>{message.body}</p> : null}
                      <ChatAttachments attachments={messageAttachments} />
                    </>
                  )}

                  <div className="message-footer">
                    <span>Local {dateTimeInZone(message.createdAt, message.authorTimeZone || userTimeZone)}</span>
                    <span>Admin time {dateTimeInZone(message.createdAt, adminTimeZone)}</span>
                    {message.editedAt ? <span>Edited</span> : null}
                    {menuItems.length ? <ActionMenu items={menuItems} /> : null}
                  </div>
                </div>
              </div>
            );
          })}
          {activeConversation && !activeMessages.length ? <div className="empty-state">No messages yet.</div> : null}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form className="chat-composer" onSubmit={submit}>
        {attachments.length ? (
          <div className="attachment-preview-list">
            {attachments.map((attachment, index) => (
              <div className="attachment-preview" key={`${attachment.name}-${attachment.size}-${index}`}>
                <span>{attachment.name} - {formatBytes(attachment.size)}</span>
                <button className="ghost-button" type="button" onClick={() => removeAttachment(index)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="composer-shell">
          <button
            className="ghost-button compact-button"
            type="button"
            disabled={!canSend || !activeConversation || activeConversation.monitored || !activeConversation.recipientAllowsContact || attachments.length >= chatAttachmentLimit}
            onClick={() => fileInputRef.current?.click()}
          >
            Attach
          </button>
          <textarea
            aria-label="Message"
            placeholder="Message"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            disabled={!canSend || !activeConversation || activeConversation.monitored || !activeConversation.recipientAllowsContact}
            required={!attachments.length}
          />
          <button className="primary-button" type="submit" disabled={busy || !canSubmit}>
            Send
          </button>
        </div>

        <input
          ref={fileInputRef}
          className="file-input"
          type="file"
          multiple
          disabled={!canSend || !activeConversation || activeConversation.monitored || !activeConversation.recipientAllowsContact}
          onChange={handleFileSelection}
        />
        {!canSend ? <span className="muted">Approval is required before sending inbox messages.</span> : null}
        {activeConversation?.monitored ? <span className="muted">Monitoring conversation. Select a direct inbox contact to send.</span> : null}
        {activeConversation && !activeConversation.monitored && !activeConversation.recipientAllowsContact ? (
          <span className="muted">This member is not accepting direct messages.</span>
        ) : null}
        {!activeConversation && canSend ? <span className="muted">No approved inbox contacts are available yet.</span> : null}
        {chatError ? <div className="error full">{chatError}</div> : null}
      </form>
    </section>
  );
}

function PendingView({
  data,
  busy,
  onSaveMethod,
}: {
  data: PortalData;
  busy: boolean;
  onSaveMethod: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const user = data.currentUser;
  const methods = data.paymentMethods.filter((method) => method.userId === user.id);
  const canSavePaymentMethod = !isSuperAdminRole(user.role) && !isClientRole(user.role);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

  return (
    <div className="pending-box">
      <div className="status-strip">
        <h2>Account pending approval</h2>
        <p>
          {isClientRole(user.role)
            ? "A super admin must approve client accounts before management tools are available."
            : "A client can approve your account, set your bidder rate, set your interview bonus, and schedule your next payment."}
        </p>
      </div>

      {canSavePaymentMethod ? (
        <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Payment Method</h2>
              <p>You can save payout details while waiting.</p>
            </div>
          </div>
          <PaymentMethodForm
            key={editingMethod?.id || "pending-new-method"}
            busy={busy}
            onSave={onSaveMethod}
            editingMethod={editingMethod}
            onCancelEdit={() => setEditingMethod(null)}
          />
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Saved Details</h2>
              <p>Your assigned client will see the selected method and address.</p>
            </div>
          </div>
          <PaymentMethodList methods={methods} onEdit={setEditingMethod} />
        </section>
        </div>
      ) : null}
    </div>
  );
}
