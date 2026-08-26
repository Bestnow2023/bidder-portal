"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent, KeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import type {
  ChatAttachment,
  ChatMessage,
  BidProfileRecord,
  ContractRecord,
  ContractStatus,
  ContractPaymentStyle,
  DisputeRecord,
  DisputeStatus,
  DepositRecord,
  EscrowRecord,
  PaymentFrequency,
  PaymentMethod,
  PaymentRecord,
  PaymentWeekday,
  PortalData,
  PortalNotification,
  PortalPost,
  PortalUser,
  PostStatus,
  Role,
  UserStatus,
  WorkLog,
} from "./portal-types";

type AuthMode = "signIn" | "signUp" | "resetPassword";
type PublicPortalData = { posts: PortalPost[]; users: PortalUser[] };
type PortalView = "overview" | "dashboard" | "profile" | "clients" | "bidders" | "posts" | "contracts" | "disputes" | "people" | "bidderSettings" | "work" | "credits" | "billing" | "payments" | "chat" | "help";

const payoutCurrencies = ["USDT", "BTC", "ETH", "LTC", "TRX", "BNB"];
const signupPostCreditAmount = 10;
const postCreditCost = 1;
const postCreditMoneyPrice = 0.1;
const payoutNetworkOptions = [
  { value: "TRON", label: "TRC20 - TRON" },
  { value: "BSC", label: "BEP20 - BSC" },
  { value: "ETH", label: "ERC20 - Ethereum" },
  { value: "BTC", label: "BTC - Bitcoin" },
  { value: "LTC", label: "LTC - Litecoin" },
  { value: "TRX", label: "TRX - TRON" },
];
const depositNetworkOptions = [
  { value: "tron", label: "TRC20 - TRON" },
  { value: "bsc", label: "BEP20 - BSC" },
  { value: "ethereum", label: "ERC20 - Ethereum" },
  { value: "", label: "Any supported network" },
];
const cryptoNetworkLabels: Record<string, string> = {
  TRON: "TRC20 - TRON",
  TRC20: "TRC20 - TRON",
  BSC: "BEP20 - BSC",
  BEP20: "BEP20 - BSC",
  ETH: "ERC20 - Ethereum",
  ERC20: "ERC20 - Ethereum",
  ETHEREUM: "ERC20 - Ethereum",
  BTC: "BTC - Bitcoin",
  BITCOIN: "BTC - Bitcoin",
  LTC: "LTC - Litecoin",
  LITECOIN: "LTC - Litecoin",
  TRX: "TRX - TRON",
};
const paymentFrequencies: { value: PaymentFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];
const contractPaymentStyles: { value: ContractPaymentStyle; label: string }[] = [
  { value: "fixed", label: "Fixed budget" },
  { value: "hourly", label: "Hourly" },
  { value: "per_bid", label: "Per bid" },
  { value: "per_bid_bonus", label: "Per bid + bonus" },
  { value: "regular", label: "Regular monthly" },
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
const helpBaseUrl = (process.env.NEXT_PUBLIC_HELP_BASE_URL || "https://help-bp.digniware.com").replace(/\/$/, "");
const dismissedNoticeStorageKey = "bidderPortalDismissedInfoNotices";
const chatPollIntervalMs = 30000;
const chatAttachmentLimit = 3;
const maxChatAttachmentBytes = 2 * 1024 * 1024;
const maxChatImageDimension = 1280;
const demoPassword = "demo1234";

const demoAccounts = [
  { label: "Super admin", email: "admin@portal.local", name: "Super Admin Owner" },
  { label: "Active client", email: "client@portal.local", name: "Demo Client" },
  { label: "Active bidder", email: "maya.bidder@example.com", name: "Maya Bidder" },
  { label: "Pending review bidder", email: "pending.bidder@example.com", name: "Pending Bidder" },
];
const clientPreferenceOptions = ["Remote", "Startup", "LinkedIn", "Dice", "Indeed", "Glassdoor", "Upwork", "W2", "Contract"];
const jobTitleOptions = [
  "React Developer",
  "Node.js Developer",
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "Python Developer",
  "DevOps Engineer",
  "QA Engineer",
  "Data Engineer",
  "Project Manager",
];
const raceOptions = [
  "",
  "Asian",
  "Black or African American",
  "Hispanic or Latino",
  "Native American or Alaska Native",
  "Native Hawaiian or Pacific Islander",
  "White",
  "Two or more races",
  "Prefer not to answer",
  "Other",
];
const veteranStatusOptions = [
  "",
  "Not a veteran",
  "Protected veteran",
  "Veteran",
  "Prefer not to answer",
];
const disabilityStatusOptions = [
  "",
  "No disability",
  "Has disability",
  "History of disability",
  "Prefer not to answer",
];
const visaStatusOptions = [
  "",
  "US citizen",
  "Green card holder",
  "H-1B",
  "H-4 EAD",
  "L-1",
  "L-2 EAD",
  "TN",
  "OPT",
  "STEM OPT",
  "CPT",
  "EAD",
  "Requires sponsorship",
  "Other",
];
const languageLevelOptions = ["English - native", "English - fluent", "English - conversational", "Spanish - fluent", "French - fluent"];
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
  profile: "/settings",
  clients: "/clients",
  bidders: "/bidders",
  posts: "/posts",
  contracts: "/contracts",
  disputes: "/disputes",
  people: "/people",
  bidderSettings: "/bidder-settings",
  work: "/work",
  credits: "/credits",
  billing: "/billing",
  payments: "/payments",
  chat: "/chat",
  help: "/help",
};
const routeViews: Record<string, PortalView> = {
  "/operations": "overview",
  "/dashboard": "dashboard",
  "/profile": "profile",
  "/settings": "profile",
  "/clients": "clients",
  "/bidders": "bidders",
  "/posts": "posts",
  "/contracts": "contracts",
  "/disputes": "disputes",
  "/people": "people",
  "/bidder-settings": "bidderSettings",
  "/work": "work",
  "/credits": "credits",
  "/billing": "billing",
  "/payments": "payments",
  "/chat": "chat",
  "/help": "help",
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

function postCreditCount(value: number) {
  const count = Math.max(0, Math.floor(Number(value) || 0));
  return `${count.toLocaleString()} ${count === 1 ? "credit" : "credits"}`;
}

function ratingForUser(user?: PortalUser | null) {
  if (!user) {
    return 0;
  }

  if (isClientRole(user.role)) {
    return Number(user.clientStats?.bidderRating ?? user.clientRating ?? 0) || 0;
  }

  return Number(user.bidderRating ?? user.clientRating ?? 0) || 0;
}

function RatingStars({ value }: { value: number }) {
  const normalized = Math.max(0, Math.min(5, Number(value) || 0));
  const filled = Math.round(normalized);
  return (
    <span className="rating-stars" aria-label={`${normalized.toFixed(1)} out of 5`}>
      <span className="star-track" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (index + 1 <= filled ? "\u2605" : "\u2606")).join("")}
      </span>
      <strong>{normalized.toFixed(1)}</strong>
    </span>
  );
}

function MemberAvatar({ user, size = "md" }: { user?: PortalUser | null; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`member-avatar ${size}`}>
      {user?.profileImageDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.profileImageDataUrl} alt={userDisplayName(user)} />
      ) : (
        <span>{initialsForName(userDisplayName(user))}</span>
      )}
    </span>
  );
}

function dismissedNoticeIds() {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const storedIds = JSON.parse(window.localStorage.getItem(dismissedNoticeStorageKey) || "[]");
    return new Set(Array.isArray(storedIds) ? storedIds.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function DismissibleNotice({
  id,
  className = "",
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const [dismissed, setDismissed] = useState(() => dismissedNoticeIds().has(id));

  function dismiss() {
    try {
      const nextIds = dismissedNoticeIds();
      nextIds.add(id);
      window.localStorage.setItem(dismissedNoticeStorageKey, JSON.stringify(Array.from(nextIds)));
    } catch {
      // Still close the notice for this page view if storage is unavailable.
    }
    setDismissed(true);
  }

  if (dismissed) {
    return null;
  }

  return (
    <div className={`status-strip dismissible-notice ${className}`}>
      <button className="notice-dismiss-button" type="button" aria-label="Dismiss notice" onClick={dismiss}>
        x
      </button>
      <div className="dismissible-notice-content">{children}</div>
    </div>
  );
}

function TableMemberCell({ user, subtitle }: { user: PortalUser; subtitle?: string }) {
  return (
    <div className="table-member">
      <MemberAvatar user={user} size="sm" />
      <span>
        <strong>{userDisplayName(user)}</strong>
        <span className="table-subtext">{subtitle || user.email}</span>
      </span>
    </div>
  );
}

function payoutMethodLabel(method: PaymentMethod) {
  const methodParts = method.method.split(/\s+/).filter(Boolean);
  const currency = method.currency || methodParts[0] || method.method;
  const network = method.network || methodParts[1] || "";
  return [currency, cryptoNetworkLabel(network)].filter(Boolean).join(" ");
}

function cryptoNetworkLabel(network?: string) {
  const normalized = (network || "").trim();
  if (!normalized) {
    return "";
  }

  return cryptoNetworkLabels[normalized.toUpperCase()] || normalized;
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

function dateKeyInZone(value: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    }).format(new Date(value));
  } catch {
    return new Date(value).toISOString().slice(0, 10);
  }
}

function messageTimeInZone(value: string, timeZone: string) {
  if (!value) {
    return "";
  }

  try {
    const createdAt = new Date(value);
    const todayKey = dateKeyInZone(new Date().toISOString(), timeZone);
    const messageKey = dateKeyInZone(value, timeZone);
    const timeOptions = {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    } satisfies Intl.DateTimeFormatOptions;

    if (todayKey === messageKey) {
      return new Intl.DateTimeFormat("en-US", timeOptions).format(createdAt);
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      ...timeOptions,
    }).format(createdAt);
  } catch {
    return dateTime(value);
  }
}

function timeZoneDisplay(timeZone?: string, value = new Date().toISOString()) {
  if (!timeZone) {
    return "Not set";
  }

  try {
    return `${timeZone} - ${dateTimeInZone(value, timeZone)}`;
  } catch {
    return timeZone;
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

function collectAttachmentDataUrls(messages: ChatMessage[] = [], cache = new Map<string, string>()) {
  messages.forEach((message) => {
    (message.attachments || []).forEach((attachment) => {
      if (attachment.id && attachment.dataUrl) {
        cache.set(attachment.id, attachment.dataUrl);
      }
    });
  });
  return cache;
}

function knownAttachmentIdsForPortalData(data: PortalData | null) {
  if (!data) {
    return [];
  }

  const knownIds = new Set<string>();
  [...(data.chatMessages || []), ...(data.supportMessages || [])].forEach((message) => {
    (message.attachments || []).forEach((attachment) => {
      if (attachment.id && attachment.dataUrl) {
        knownIds.add(attachment.id);
      }
    });
  });
  return Array.from(knownIds).slice(-500);
}

function restoreAttachmentDataUrls(messages: ChatMessage[] = [], cache: Map<string, string>) {
  return messages.map((message) => {
    const attachments = message.attachments || [];
    if (!attachments.length) {
      return message;
    }

    return {
      ...message,
      attachments: attachments.map((attachment) =>
        !attachment.dataUrl && attachment.id && cache.has(attachment.id)
          ? { ...attachment, dataUrl: cache.get(attachment.id) || "" }
          : attachment
      ),
    };
  });
}

function restorePortalAttachmentDataUrls(nextData: PortalData, previousData: PortalData | null) {
  if (!previousData) {
    return nextData;
  }

  const cache = collectAttachmentDataUrls(previousData.chatMessages || []);
  collectAttachmentDataUrls(previousData.supportMessages || [], cache);
  if (!cache.size) {
    return nextData;
  }

  return {
    ...nextData,
    chatMessages: restoreAttachmentDataUrls(nextData.chatMessages || [], cache),
    supportMessages: restoreAttachmentDataUrls(nextData.supportMessages || [], cache),
  };
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

function normalizeContractPaymentStyle(value?: string): ContractPaymentStyle {
  return contractPaymentStyles.some((style) => style.value === value) ? value as ContractPaymentStyle : "per_bid_bonus";
}

function contractPaymentStyleLabel(value?: string) {
  const style = normalizeContractPaymentStyle(value);
  return contractPaymentStyles.find((item) => item.value === style)?.label || "Per bid + bonus";
}

function contractPayTerms(contract: Pick<ContractRecord, "paymentStyle" | "fixedBudget" | "hourlyRate" | "regularSalary" | "ratePerApplication" | "bonusPerInterview">) {
  const style = normalizeContractPaymentStyle(contract.paymentStyle);
  if (style === "fixed") {
    return `Fixed ${money(contract.fixedBudget || 0)}`;
  }
  if (style === "hourly") {
    return `${money(contract.hourlyRate || 0)} hourly`;
  }
  if (style === "per_bid") {
    return `${money(contract.ratePerApplication || 0)} per bid`;
  }
  if (style === "regular") {
    return `${money(contract.regularSalary || 0)} monthly`;
  }

  return `${money(contract.ratePerApplication || 0)} per bid + ${money(contract.bonusPerInterview || 0)} interview bonus`;
}

function contractTimelineLabel(contract: Pick<ContractRecord, "startDate" | "endDate" | "endedAt">) {
  const endDate = contract.endDate || contract.endedAt?.slice(0, 10) || "";
  return `${shortDate(contract.startDate)} - ${endDate ? shortDate(endDate) : "Open ended"}`;
}

function contractNextPaymentDateDefault(frequencyInput?: string, weekdayInput?: string, startDateInput = today()) {
  return nextPaymentDateFromSchedule(frequencyInput, weekdayInput, startDateInput || today()) || startDateInput || today();
}

function roleLabel(role: Role) {
  if (role === "super_admin") return "Super Admin";
  if (role === "client" || role === "admin") return "Client";
  if (role === "developer") return "Developer";
  return "Bidder";
}

const managedRoleOptions: { value: Role; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "client", label: "Client" },
  { value: "bidder", label: "Bidder" },
  { value: "developer", label: "Developer" },
];
const accountStatusOptions: { value: UserStatus; label: string; actionLabel?: string }[] = [
  { value: "pending_review", label: "Pending Review" },
  { value: "active", label: "Active", actionLabel: "Activate" },
  { value: "temporarily_restricted", label: "Temporarily Restricted", actionLabel: "Temporarily restrict" },
  { value: "suspended", label: "Suspended", actionLabel: "Suspend" },
  { value: "closed", label: "Closed", actionLabel: "Close" },
];
const activeAccountStatuses = new Set<string>(["active", "approved"]);
const pendingReviewAccountStatuses = new Set<string>(["pending_review", "pending"]);
const restrictedAccountStatuses = new Set<string>(["temporarily_restricted", "restricted", "paused"]);

function normalizeAccountStatus(status: string): UserStatus {
  const normalized = status.toLowerCase().trim().replace(/\s+/g, "_");
  if (activeAccountStatuses.has(normalized)) return "active";
  if (pendingReviewAccountStatuses.has(normalized)) return "pending_review";
  if (restrictedAccountStatuses.has(normalized)) return "temporarily_restricted";
  if (normalized === "suspended") return "suspended";
  if (normalized === "closed") return "closed";
  return "pending_review";
}

function isActiveAccount(user: PortalUser) {
  return normalizeAccountStatus(user.status) === "active";
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
  return accountStatusOptions.find((option) => option.value === normalizeAccountStatus(status))?.label || titleCase(status);
}

function viewTitle(view: string, user?: PortalUser) {
  if (user && isSuperAdminRole(user.role) && view === "billing") {
    return "Billing Management";
  }
  if (user && isSuperAdminRole(user.role) && view === "help") {
    return "Help Center";
  }

  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    overview: "Dashboard",
    profile: "Settings",
    clients: "Clients",
    bidders: "Bidders",
    posts: "Posts",
    contracts: "Contracts",
    disputes: "Disputes",
    people: "People",
    bidderSettings: "Bidder Settings",
    work: "Work Logs",
    credits: "Credit Management",
    billing: "Billing",
    payments: "Payments",
    chat: "Inbox",
    help: "Help",
  };
  return titles[view] || "Portal";
}

function viewSubtitle(view: string, isAdmin: boolean, isSuperAdmin = false) {
  if (!isAdmin) {
    if (view === "clients") return "Search client profiles and review payment history signals.";
    if (view === "bidders") return "Search bidder profiles and contracting status.";
    if (view === "posts") return "Review bidder posts, publish bidder availability, and start contracts.";
    if (view === "contracts") return "Review requests, active contracts, criteria, and connected client credit.";
    if (view === "disputes") return "Open and track contract, work, and payment disputes.";
    if (view === "profile") return "Complete your profile, direct-message preference, email, and password.";
    if (view === "chat") return "";
    return "Log your bidder activity and keep payment details current.";
  }

  if (isSuperAdmin) {
    const superAdminSubtitles: Record<string, string> = {
      credits: "Add, deduct, and audit money credit and post credit by client and bidder.",
      billing: "Review pending payout releases and completed payout history.",
      help: "Review platform guidance and handle support messages from users.",
    };

    if (superAdminSubtitles[view]) {
      return superAdminSubtitles[view];
    }
  }

  const subtitles: Record<string, string> = {
    overview: "Review work, clients, payments, and escrow snapshots.",
    profile: "Complete your profile, direct-message preference, email, and password.",
    clients: "Review client profiles and hiring signals.",
    bidders: "Search bidders and see who is available or already contracted.",
    posts: "Review marketplace listings and turn bidder posts into contract requests.",
    contracts: "Manage client-bidder contract requests, active criteria, and assignments.",
    disputes: "Monitor and resolve client-bidder disputes separately from contracts.",
    people: "Manage user accounts, approval status, roles, passwords, and email verification.",
    bidderSettings: "Set bidder rates, interview bonuses, payment dates, and schedules.",
    work: "Review bidder work logs and Google Sheet links.",
    credits: "Add, deduct, and audit user credits.",
    billing: "Deposit credits and release bidder payouts through Cryptomus.",
    payments: "Record payouts, review payment methods, and track client escrow.",
    chat: "",
    help: "Learn how the portal works and contact support.",
  };

  return subtitles[view] || "Manage the bidder portal.";
}

function viewsForUser(user: PortalUser): PortalView[] {
  if (isSuperAdminRole(user.role)) {
    return ["people", "contracts", "disputes", "posts", "credits", "billing", "chat", "help"];
  }

  if (isClientRole(user.role)) {
    return ["overview", "profile", "bidders", "posts", "contracts", "disputes", "work", "billing", "chat", "help"];
  }

  if (user.role === "bidder") {
    return ["dashboard", "profile", "clients", "posts", "contracts", "disputes", "work", "payments", "chat", "help"];
  }

  return ["profile", "contracts", "disputes", "payments", "chat", "help"];
}

function safeViewForUser(user: PortalUser, view: PortalView) {
  if (isActiveAccount(user) && !isProfileComplete(user)) {
    return "profile";
  }

  const availableViews = viewsForUser(user);
  return availableViews.includes(view) ? view : availableViews[0];
}

function viewFromPath(pathname: string): PortalView {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  return routeViews[normalizedPath] || "overview";
}

function estimateForUser(user: PortalUser, logs: WorkLog[]) {
  return logs
    .filter((log) => log.userId === user.id && isWorkLogApproved(log))
    .reduce(
      (total, log) =>
        total +
        log.appliedJobs * user.ratePerApplication +
        log.interviewsScheduled * user.bonusPerInterview,
      0
    );
}

function estimateForUserInRange(user: PortalUser, logs: WorkLog[], periodStart: string, periodEnd: string) {
  return logs
    .filter((log) => log.userId === user.id && isWorkLogApproved(log) && log.workDate >= periodStart && log.workDate <= periodEnd)
    .reduce(
      (total, log) =>
        total +
        log.appliedJobs * user.ratePerApplication +
        log.interviewsScheduled * user.bonusPerInterview,
      0
    );
}

function workLogsForUser(user: PortalUser, logs: WorkLog[]) {
  return logs.filter((log) => log.userId === user.id);
}

function paymentsForUser(user: PortalUser, payments: PaymentRecord[]) {
  return payments.filter((payment) => payment.userId === user.id);
}

function isWithdrawalPayment(payment: PaymentRecord) {
  return payment.paymentType === "withdrawal";
}

function isClientReleasePayment(payment: PaymentRecord) {
  return !isWithdrawalPayment(payment);
}

function isCreditSpentPayment(payment: PaymentRecord) {
  return isClientReleasePayment(payment) && (payment.status === "paid" || payment.status === "processing");
}

function paymentTypeLabel(payment: PaymentRecord) {
  if (isWithdrawalPayment(payment)) {
    return "Withdrawal";
  }

  return "Work credit";
}

function paymentStatusLabel(status: PaymentRecord["status"]) {
  return status === "paid" ? "Completed" : titleCase(status);
}

function paymentStatusClass(status: PaymentRecord["status"]) {
  if (status === "paid") return "bidder";
  if (status === "failed") return "paused";
  return "pending";
}

function paidForUser(userId: string, payments: PaymentRecord[]) {
  return payments
    .filter((payment) => payment.userId === userId && isCreditSpentPayment(payment))
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
    .filter((payment) => payment.clientId === clientId && isCreditSpentPayment(payment))
    .reduce((total, payment) => total + payment.amount, 0);
}

function moneyCreditSpentOnPosts(userId: string, posts: PortalPost[] = []) {
  return posts
    .filter((post) => post.authorId === userId)
    .reduce((total, post) => total + (post.moneyCreditUsed || 0), 0);
}

function creditBalanceForClient(clientId: string, deposits: DepositRecord[], payments: PaymentRecord[], posts: PortalPost[] = []) {
  return Math.max(0, creditsDepositedForClient(clientId, deposits) - creditsSpentForClient(clientId, payments) - moneyCreditSpentOnPosts(clientId, posts));
}

function userCreditBalances(user: PortalUser, data: PortalData) {
  if (user.creditBalances) {
    const postCreditBalance = user.creditBalances.postCreditBalance ?? user.creditBalances.giftCreditBalance ?? 0;
    return {
      ...user.creditBalances,
      postCreditBalance,
      postingCreditBalance: postCreditBalance,
    };
  }

  const moneyCreditBalance = isClientRole(user.role)
    ? creditBalanceForClient(user.id, data.deposits || [], data.payments || [], data.posts || [])
    : 0;
  const postCreditUsed = (data.posts || [])
    .filter((post) => post.authorId === user.id)
    .reduce((total, post) => total + (post.postCreditUsed ?? post.giftCreditUsed ?? 0), 0);
  const postCreditBalance = Math.max(0, signupPostCreditAmount - postCreditUsed);

  return {
    moneyCreditBalance,
    postCreditBalance,
    postingCreditBalance: postCreditBalance,
  };
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

function supportConversationIdForUser(userId: string) {
  return `support__${userId}`;
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
  if (!isWorkerUser(user)) {
    return "-";
  }

  return userById(users, user.assignedAdminId || "")?.name || "Unassigned";
}

function profileSkillsText(user: PortalUser) {
  return (user.profileSkills || []).join(", ");
}

function profileLanguagesText(user: PortalUser) {
  return (user.profileLanguages || []).join(", ");
}

function userDisplayName(user?: PortalUser | null) {
  return user?.name || user?.email || "Unknown member";
}

function isProfileComplete(user: PortalUser) {
  if (isSuperAdminRole(user.role)) {
    return true;
  }

  const hasBaseProfile = Boolean(user.name && (user.country || user.profileLocation) && user.profileTimeZone);
  if (!hasBaseProfile) {
    return false;
  }

  if (isClientRole(user.role)) {
    return Boolean(user.clientPreferences?.length);
  }

  if (isWorkerUser(user)) {
    return Boolean(user.profileSkills?.length && user.profileLanguages?.length);
  }

  return Boolean(user.profileCompletedAt);
}

function clientUsers(users: PortalUser[]) {
  return users.filter((user) => isClientRole(user.role) && isActiveAccount(user));
}

function workerUsers(users: PortalUser[]) {
  return users.filter((user) => isWorkerUser(user) && isActiveAccount(user));
}

function displayUserId(user?: PortalUser | null) {
  return user?.publicId || user?.id || "";
}

function compactUserId(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function userIdMatches(user: PortalUser, query: string) {
  const compactQuery = compactUserId(query);
  if (!compactQuery) {
    return false;
  }

  return [displayUserId(user), user.id]
    .filter(Boolean)
    .some((value) => compactUserId(value) === compactQuery);
}

function contractStatusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "rejected") return "Rejected";
  if (status === "ended") return "Ended";
  return "Requested";
}

function contractStatusClass(status: string) {
  if (status === "active") return "approved";
  if (status === "requested") return "pending";
  return "paused";
}

function postAudienceLabel(post: PortalPost) {
  return post.type === "client" ? "Visible to bidders" : "Visible to clients";
}

function userMatchesSearch(user: PortalUser, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [
    displayUserId(user),
    user.id,
    user.name,
    user.email,
    roleLabel(user.role),
    user.profileTitle,
    user.profileBio,
    user.profileLocation,
    user.companyName,
    user.country,
    ...(user.profileSkills || []),
    ...(user.profileLanguages || []),
    ...(user.clientPreferences || []),
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
        onClick={(event) => {
          event.stopPropagation();
          if (isOpen) {
            setMenuPosition(null);
          } else {
            openMenu();
          }
        }}
      >
        {label}
      </button>
      {menuPosition ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[120] grid w-52 gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/15"
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
            onClick={(event) => {
              event.stopPropagation();
              setMenuPosition(null);
              item.onClick();
            }}
          >
            {item.label}
          </button>
        ))}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

function ModalFrame({
  title,
  subtitle,
  children,
  className = "",
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal-panel ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-x-button" type="button" aria-label="Close modal" onClick={onClose}>
          ×
        </button>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>
        {children}
      </section>
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
  periodStart: string;
  periodEnd: string;
  amount: number;
  daysUntil: number;
  description: string;
  sourceLabel: string;
  sourcePaymentId?: string;
};

type DateRange = {
  startDate: string;
  endDate: string;
  preset?: DatePreset;
};

type DatePreset = "all" | "date" | "today" | "thisWeek" | "lastWeek" | "last7Days" | "last3Days" | "lastMonth" | "yesterday" | "custom";

function startOfWeek(date: Date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

function dateRangeFromPreset(preset: DatePreset, baseDateInput = today()): DateRange {
  const baseDate = dateAtMidnight(baseDateInput) || new Date();
  const currentDate = dateInputValue(baseDate);

  if (preset === "date") {
    return { preset, startDate: currentDate, endDate: "" };
  }

  if (preset === "today") {
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

  if (preset === "last3Days") {
    return { preset, startDate: dateInputValue(addDays(baseDate, -2)), endDate: currentDate };
  }

  if (preset === "lastMonth") {
    return { preset, startDate: dateInputValue(addDays(baseDate, -29)), endDate: currentDate };
  }

  if (preset === "yesterday") {
    const yesterday = dateInputValue(addDays(baseDate, -1));
    return { preset, startDate: yesterday, endDate: "" };
  }

  return { preset, startDate: "", endDate: "" };
}

function workSummary(user: PortalUser, logs: WorkLog[]) {
  const userLogs = workLogsForUser(user, logs);
  return {
    appliedJobs: userLogs.reduce((total, log) => total + log.appliedJobs, 0),
    interviewsScheduled: userLogs.reduce((total, log) => total + log.interviewsScheduled, 0),
    earned: estimateForUser(user, userLogs),
    logCount: userLogs.length,
  };
}

function logMatchesDateRange(log: WorkLog, range: DateRange) {
  if (!range.startDate && !range.endDate) {
    return true;
  }

  if ((range.preset === "date" || range.preset === "today" || range.preset === "yesterday") && range.startDate && !range.endDate) {
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

function recordDateMatchesRange(value: string, range: DateRange) {
  if (!range.startDate && !range.endDate) {
    return true;
  }

  if ((range.preset === "date" || range.preset === "today" || range.preset === "yesterday") && range.startDate && !range.endDate) {
    return value === range.startDate;
  }

  const itemDate = dateAtMidnight(value)?.getTime();
  if (itemDate == null) {
    return false;
  }

  const startDate = range.startDate ? dateAtMidnight(range.startDate)?.getTime() : null;
  const endDate = range.endDate ? dateAtMidnight(range.endDate)?.getTime() : null;

  if (startDate != null && itemDate < startDate) {
    return false;
  }

  if (endDate != null && itemDate > endDate) {
    return false;
  }

  return true;
}

function filterPaymentsByDate(payments: PaymentRecord[], range: DateRange) {
  return payments.filter((payment) => recordDateMatchesRange(payment.scheduledDate, range));
}

function contractCoversWorkDate(contract: ContractRecord, workDate: string) {
  if (contract.status === "rejected") {
    return false;
  }
  if (contract.startDate && contract.startDate > workDate) {
    return false;
  }

  const endedDate = contract.endedAt ? contract.endedAt.slice(0, 10) : "";
  return !endedDate || workDate <= endedDate;
}

function clientIdsForWorkLog(log: WorkLog, contracts: ContractRecord[], payments: PaymentRecord[]) {
  const clientIds = new Set<string>();

  contracts.forEach((contract) => {
    if (contract.workerId === log.userId && contractCoversWorkDate(contract, log.workDate)) {
      clientIds.add(contract.clientId);
    }
  });

  payments.forEach((payment) => {
    if (
      payment.userId === log.userId &&
      payment.clientId &&
      payment.periodStart <= log.workDate &&
      log.workDate <= payment.periodEnd
    ) {
      clientIds.add(payment.clientId);
    }
  });

  return Array.from(clientIds);
}

function clientNamesForWorkLog(log: WorkLog, users: PortalUser[], contracts: ContractRecord[], payments: PaymentRecord[]) {
  const names = clientIdsForWorkLog(log, contracts, payments)
    .map((clientId) => userById(users, clientId)?.name || "")
    .filter(Boolean);

  return names.length ? names.join(", ") : "-";
}

function connectedClientsForWorker(user: PortalUser, users: PortalUser[], contracts: ContractRecord[], payments: PaymentRecord[]) {
  const clientIds = new Set<string>();
  if (user.assignedAdminId) {
    clientIds.add(user.assignedAdminId);
  }

  contracts.forEach((contract) => {
    if (contract.workerId === user.id && contract.status !== "rejected") {
      clientIds.add(contract.clientId);
    }
  });

  payments.forEach((payment) => {
    if (payment.userId === user.id && payment.clientId) {
      clientIds.add(payment.clientId);
    }
  });

  return users
    .filter((candidate) => clientIds.has(candidate.id) && isClientRole(candidate.role))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function workLogBelongsToClient(log: WorkLog, clientId: string, data: PortalData) {
  const relatedClientIds = clientIdsForWorkLog(log, data.contracts || [], data.payments || []);
  if (relatedClientIds.length) {
    return relatedClientIds.includes(clientId);
  }

  const worker = userById(data.users, log.userId);
  return worker?.assignedAdminId === clientId;
}

function clientScopedWorkLogs(client: PortalUser, data: PortalData) {
  return data.workLogs.filter((log) => workLogBelongsToClient(log, client.id, data));
}

function clientScopedPayments(client: PortalUser, data: PortalData) {
  return data.payments.filter((payment) => payment.clientId === client.id && isCreditSpentPayment(payment));
}

function isEmailVerificationError(message: string) {
  return message.toLowerCase().includes("verify your email");
}

function isWorkLogPaid(log: WorkLog, payments: PaymentRecord[]) {
  const logDate = dateAtMidnight(log.workDate)?.getTime();
  if (logDate == null) {
    return false;
  }

  return payments.some((payment) => {
    if (payment.userId !== log.userId || !isCreditSpentPayment(payment)) {
      return false;
    }

    const periodStart = dateAtMidnight(payment.periodStart)?.getTime();
    const periodEnd = dateAtMidnight(payment.periodEnd)?.getTime();
    return periodStart != null && periodEnd != null && periodStart <= logDate && logDate <= periodEnd;
  });
}

function workLogReviewStatus(log: WorkLog, paid = false) {
  if (log.reviewStatus === "approved" || log.reviewStatus === "changes_requested") {
    return log.reviewStatus;
  }

  return paid ? "approved" : "pending";
}

function isWorkLogApproved(log: WorkLog) {
  return log.reviewStatus === "approved";
}

function workLogReviewLabel(log: WorkLog, paid = false) {
  const status = workLogReviewStatus(log, paid);
  if (status === "approved") return "Approved";
  if (status === "changes_requested") return "Edit requested";
  return "Pending review";
}

function workLogReviewClass(log: WorkLog, paid = false) {
  const status = workLogReviewStatus(log, paid);
  if (status === "approved") return "approved";
  if (status === "changes_requested") return "paused";
  return "pending";
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
  const [rememberMe, setRememberMe] = useState(false);
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
  const [chatPostId, setChatPostId] = useState(() => {
    if (typeof window === "undefined" || window.location.pathname !== viewRoutes.chat) {
      return "";
    }

    return new URLSearchParams(window.location.search).get("post") || "";
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [portalNavVisible, setPortalNavVisible] = useState(true);
  const [publicData, setPublicData] = useState<PublicPortalData>({ posts: [], users: [] });
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState("");
  const latestChatMessageIdRef = useRef("");
  const notificationRequestAttemptedRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const dataRef = useRef<PortalData | null>(null);
  const effectiveActiveView = data ? safeViewForUser(data.currentUser, activeView) : activeView;

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const handleEmailVerificationRequired = useCallback((emailValue: string, message?: string) => {
    const nextEmail = emailValue || loginEmail;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("bidderPortalSessionToken");
      if (nextEmail) {
        window.localStorage.setItem("bidderPortalEmail", nextEmail);
      }
      if (window.location.pathname !== "/") {
        window.history.pushState({}, "", "/");
      }
    }

    setData(null);
    setSessionToken("");
    setLoginEmail(nextEmail);
    setLoginPassword("");
    setAuthMode("signIn");
    setVerificationPendingEmail(nextEmail);
    setVerificationSuccessEmail("");
    setAuthNotice(message || "Check your email to verify your account before signing in.");
    setError("");
  }, [loginEmail]);

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
    if (data || sessionToken) {
      return;
    }

    let active = true;

    async function loadPublicPortal() {
      if (active) {
        setPublicLoading(true);
        setPublicError("");
      }

      try {
        const publicPortalUrl = new URL(portalApiUrl);
        publicPortalUrl.searchParams.set("action", "publicPortal");
        const response = await fetch(publicPortalUrl.toString(), { method: "GET" });
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error(`Portal API returned ${contentType || "non-JSON"} from ${portalApiUrl}. Check NEXT_PUBLIC_API_BASE_URL.`);
        }

        const nextData = await response.json();
        if (!response.ok) {
          throw new Error(nextData.error || "Could not load public posts.");
        }

        if (active) {
          setPublicData({
            posts: Array.isArray(nextData.posts) ? nextData.posts : [],
            users: Array.isArray(nextData.users) ? nextData.users : [],
          });
        }
      } catch (loadError) {
        if (active) {
          setPublicError(loadError instanceof Error ? loadError.message : "Could not load public posts.");
        }
      } finally {
        if (active) {
          setPublicLoading(false);
        }
      }
    }

    const timeout = window.setTimeout(() => {
      void loadPublicPortal();
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [data, sessionToken]);

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
      const params = new URLSearchParams(window.location.search);
      setActiveView(viewFromPath(window.location.pathname));
      setChatRecipientId(params.get("recipient") || "");
      setChatPostId(params.get("post") || "");
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
        body: JSON.stringify({
          action: "refreshPortal",
          email,
          sessionToken: token,
          knownAttachmentIds: silent ? knownAttachmentIdsForPortalData(dataRef.current) : [],
        }),
      });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Portal API returned ${contentType || "non-JSON"} from ${portalApiUrl}. Check NEXT_PUBLIC_API_BASE_URL.`);
      }

      const nextData = await response.json();
      if (!response.ok) {
        throw new Error(nextData.error || "Refresh failed.");
      }

      const nextPortalData = nextData as PortalData;
      setData((current) => restorePortalAttachmentDataUrls(nextPortalData, current));
      setLoginEmail(nextData.currentUser.email);
      if (nextData.sessionToken) {
        setSessionToken(nextData.sessionToken);
        window.localStorage.setItem("bidderPortalSessionToken", nextData.sessionToken);
      }
      window.localStorage.setItem("bidderPortalEmail", nextData.currentUser.email);
      return nextData as PortalData;
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : "Refresh failed.";
      if (isEmailVerificationError(message)) {
        handleEmailVerificationRequired(email, message);
        return undefined;
      }
      if (!silent) {
        setError(message);
      }
    } finally {
      if (!silent) {
        setBusy(false);
      }
    }
  }, [handleEmailVerificationRequired]);

  useEffect(() => {
    if (!data?.currentUser.email || !sessionToken) {
      return;
    }

    const email = data.currentUser.email;
    const refreshIfVisible = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      void refreshPortalData(email, sessionToken, true);
    };
    const interval = window.setInterval(refreshIfVisible, chatPollIntervalMs);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
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

    document.title = chatUnreadCount > 0 ? `(${chatUnreadCount}) Bidder Portal` : "Bidder Portal | Digniware";
  }, [chatUnreadCount]);

  useEffect(() => {
    if (!data || typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    if (Notification.permission !== "default" || notificationRequestAttemptedRef.current) {
      return;
    }

    notificationRequestAttemptedRef.current = true;
    void Notification.requestPermission().catch(() => undefined);
  }, [data?.currentUser.id, data]);

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
        if (nextData.needsEmailVerification) {
          const nextEmail = nextData.email || email || loginEmail;
          handleEmailVerificationRequired(nextEmail, nextData.message || "Check your email to verify your account before signing in.");
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
      if (isEmailVerificationError(message)) {
        handleEmailVerificationRequired(data?.currentUser.email || loginEmail, message);
        return;
      }
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
    setChatRecipientId("");
    setChatPostId("");
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

    await postAction(authMode, {
      name: loginName,
      role: authMode === "signUp" ? signupRole : undefined,
      rememberMe: authMode === "signIn" ? rememberMe : undefined,
    });
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
              <h1>Bidder Portal</h1>
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

    const authForm = (
          <form className="login-form public-auth-card" onSubmit={handleLogin}>
            <h2>{authMode === "signUp" ? "Sign up" : authMode === "resetPassword" ? "Reset password" : "Email and password sign-in"}</h2>
            <p>
              {authMode === "signUp"
                ? "New users enter as pending review until a super admin activates the account."
                : authMode === "resetPassword"
                  ? "Create a new password from your reset email."
                  : "Use your active email and password to enter the portal."}
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
              {authMode === "signIn" ? (
                <label className="check-field full">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Remember me for 5 days</span>
                </label>
              ) : null}
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
    );

    return (
      <PublicHomePage
        authForm={authForm}
        publicData={publicData}
        publicLoading={publicLoading}
        publicError={publicError}
      />
    );
  }

  const currentUser = data.currentUser;
  const isSuperAdmin = isSuperAdminRole(currentUser.role);
  const canViewManaged = canViewManagedRecords(currentUser.role);
  const availableViews = viewsForUser(currentUser);
  const navViews = availableViews.filter((view) => view !== "profile" && view !== "help");
  const safeView = safeViewForUser(currentUser, activeView);
  const mustCompleteProfile = isActiveAccount(currentUser) && !isProfileComplete(currentUser);
  const portalNotifications = data.notifications || [];
  const unreadPortalNotifications = portalNotifications.filter((notification) => !notification.readAt).length;
  const pendingApprovalCount = isSuperAdmin ? data.users.filter((user) => normalizeAccountStatus(user.status) === "pending_review").length : 0;

  function goToView(view: PortalView) {
    const nextPath = viewRoutes[view];

    if (typeof window !== "undefined" && window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }

    setActiveView(view);
    setChatRecipientId("");
    setChatPostId("");
    if (view === "chat") {
      setChatUnreadCount(0);
    }
    setNotificationMenuOpen(false);
    setPortalNavVisible(true);
  }

  function navigateToView(event: ReactMouseEvent<HTMLAnchorElement>, view: PortalView) {
    event.preventDefault();
    goToView(view);
  }

  function openHelpCenter() {
    const hashParams = new URLSearchParams();
    if (currentUser.email && sessionToken) {
      hashParams.set("email", currentUser.email);
      hashParams.set("sessionToken", sessionToken);
    }
    const url = `${helpBaseUrl}/help${hashParams.toString() ? `#${hashParams.toString()}` : ""}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openInboxForUser(userId: string, relatedPostId = "") {
    const params = new URLSearchParams({ recipient: userId });
    if (relatedPostId) {
      params.set("post", relatedPostId);
    }
    const nextPath = `${viewRoutes.chat}?${params.toString()}`;

    if (typeof window !== "undefined") {
      window.history.pushState({}, "", nextPath);
    }

    setChatRecipientId(userId);
    setChatPostId(relatedPostId);
    setActiveView("chat");
    setChatUnreadCount(0);
    setPortalNavVisible(true);
  }

  function openNotification(notification: PortalNotification) {
    const type = notification.type.toLowerCase();

    if (type.includes("approval")) {
      goToView("people");
      return;
    }

    if (notification.relatedPostId) {
      goToView("posts");
      return;
    }

    if (notification.relatedContractId) {
      goToView("contracts");
      return;
    }

    if (notification.relatedDisputeId) {
      goToView("disputes");
      return;
    }

    if (notification.relatedWorkLogId) {
      goToView("work");
      return;
    }

    if (
      notification.relatedPaymentId ||
      notification.relatedDepositId ||
      type.includes("payment") ||
      type.includes("credit") ||
      type.includes("withdrawal")
    ) {
      goToView("billing");
      return;
    }

    if (notification.relatedMessageId || type.includes("message") || type.includes("chat")) {
      if (notification.actorUserId && notification.actorUserId !== currentUser.id) {
        openInboxForUser(notification.actorUserId, notification.relatedPostId || "");
        return;
      }

      goToView("chat");
      return;
    }

    goToView(isSuperAdmin ? "people" : "dashboard");
  }

  async function markPortalNotificationsRead(notificationIds?: string[]) {
    await postAction("markNotificationsRead", {
      notificationIds: notificationIds?.length ? notificationIds : portalNotifications.filter((notification) => !notification.readAt).map((notification) => notification.id),
    });
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
            {navViews.map((view) => (
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
                <span>{viewTitle(view, currentUser)}</span>
                {view === "chat" && chatUnreadCount > 0 ? <span className="nav-badge">{chatUnreadCount}</span> : null}
                {view === "people" && pendingApprovalCount > 0 ? <span className="nav-badge">{pendingApprovalCount}</span> : null}
              </a>
            ))}
          </nav>

          <div className="portal-account">
            <AdminNotificationMenu
              notifications={portalNotifications}
              unreadCount={unreadPortalNotifications}
              open={notificationMenuOpen}
              busy={busy}
              onToggle={() => setNotificationMenuOpen((open) => !open)}
              onClose={() => setNotificationMenuOpen(false)}
              onMarkRead={markPortalNotificationsRead}
              onOpenNotification={openNotification}
            />
            <AccountMenu
              user={currentUser}
              showAccountSettings={!isSuperAdmin}
              onProfileSettings={() => goToView("profile")}
              onSecurity={() => goToView("profile")}
              onHelp={openHelpCenter}
              onSignOut={signOut}
            />
          </div>
        </div>
      </header>

      <section className={`content ${safeView === "chat" ? "chat-content" : ""}`}>
        {safeView !== "chat" ? (
          <header className="topbar">
            <div>
              <h1>{viewTitle(safeView, currentUser)}</h1>
              {viewSubtitle(safeView, canViewManaged, isSuperAdmin) ? (
                <p>{viewSubtitle(safeView, canViewManaged, isSuperAdmin)}</p>
              ) : null}
            </div>
            <div className="badge-row">
              <span className={`badge ${currentUser.role}`}>{roleLabel(currentUser.role)}</span>
              <span className={`badge ${normalizeAccountStatus(currentUser.status)}`}>{statusLabel(currentUser.status)}</span>
            </div>
          </header>
        ) : null}

        {error ? <div className="error" style={{ marginBottom: 16 }}>{error}</div> : null}
        {mustCompleteProfile ? (
          <div className="status-strip compact" style={{ marginBottom: 16 }}>
            Complete your required profile fields before using the portal.
          </div>
        ) : null}

        {!isActiveAccount(currentUser) ? (
          <PendingView data={data} busy={busy} onSaveMethod={postAction} />
        ) : (
          <>
            {safeView === "overview" && canViewManaged ? <AdminOverview data={data} /> : null}
            {safeView === "profile" ? <ProfileView data={data} busy={busy} onSave={postAction} /> : null}
            {safeView === "clients" ? <ClientDirectoryView data={data} onMessageClient={openInboxForUser} /> : null}
            {safeView === "bidders" ? <BiddersDirectoryView data={data} onMessageBidder={openInboxForUser} /> : null}
            {safeView === "posts" ? <PostsView data={data} busy={busy} onAction={postAction} onMessageUser={openInboxForUser} /> : null}
            {safeView === "contracts" ? <ContractsView data={data} busy={busy} onAction={postAction} onMessageUser={openInboxForUser} /> : null}
            {safeView === "disputes" ? <DisputesView data={data} busy={busy} onAction={postAction} /> : null}
            {safeView === "people" && isSuperAdmin ? <PeopleView data={data} busy={busy} onSave={postAction} /> : null}
            {safeView === "bidderSettings" && isSuperAdmin ? <BidderSettingsView data={data} busy={busy} onSave={postAction} /> : null}
            {safeView === "dashboard" && currentUser.role === "bidder" ? <BidderDashboard data={data} /> : null}
            {safeView === "work" ? <WorkView data={data} busy={busy} onSave={postAction} /> : null}
            {safeView === "credits" && isSuperAdmin ? <SuperAdminCreditManagementView data={data} busy={busy} onAction={postAction} /> : null}
            {safeView === "billing" || safeView === "payments" ? <PaymentsView data={data} busy={busy} onAction={postAction} /> : null}
            {safeView === "help" ? <HelpView data={data} busy={busy} onSend={postAction} /> : null}
            {safeView === "chat" ? (
              <ChatView
                data={data}
                busy={busy}
                onSend={postAction}
                requestedRecipientId={chatRecipientId}
                requestedPostId={chatPostId}
              />
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

function PublicHomePage({
  authForm,
  publicData,
  publicLoading,
  publicError,
}: {
  authForm: ReactNode;
  publicData: PublicPortalData;
  publicLoading: boolean;
  publicError: string;
}) {
  const [selectedPost, setSelectedPost] = useState<PortalPost | null>(null);
  const activePosts = (publicData.posts || []).filter((post) => post.status === "active");
  const clientPostCount = activePosts.filter((post) => post.type === "client").length;
  const bidderPostCount = activePosts.filter((post) => post.type === "bidder").length;
  const featuredUsers = publicData.users.slice(0, 4);
  const selectedPostAuthor = selectedPost ? userById(publicData.users, selectedPost.authorId) : undefined;

  return (
    <main className="app public-home">
      <header className="public-nav">
        <div className="public-brand">
          <DigniwareLogo className="brand-logo sidebar-logo" />
          <div>
            <strong>Bidder Portal</strong>
            <span>by Digniware LLC</span>
          </div>
        </div>
        <div className="public-nav-links">
          <a href="https://digniware.com/" target="_blank" rel="noreferrer">digniware.com</a>
          <a href="#public-posts">Posts</a>
          <a href="#portal-access">Log in / sign up</a>
        </div>
      </header>

      <section className="public-hero">
        <div className="public-copy">
          <span className="public-eyebrow">High skill. Equal respect.</span>
          <h1>Bidder Portal developed by Digniware LLC</h1>
          <p>
            Digniware builds reliable digital products with remote-first global software teams.
            This portal brings that operating style into one place for clients, bidders, contracts,
            posts, work logs, credits, and monitored communication.
          </p>
          <div className="public-actions">
            <a className="primary-button" href="#portal-access">Get started</a>
            <a className="ghost-button" href="https://digniware.com/" target="_blank" rel="noreferrer">Visit Digniware</a>
          </div>
        </div>
        <div id="portal-access" className="public-auth">
          {authForm}
        </div>
      </section>

      <section className="public-feature-grid" aria-label="Portal overview">
        <article className="metric">
          <span>Open posts</span>
          <strong>{activePosts.length}</strong>
          <p>Browse client needs and bidder availability before creating an account.</p>
        </article>
        <article className="metric">
          <span>Client posts</span>
          <strong>{clientPostCount}</strong>
          <p>Clients can publish requirements, review bidder profiles, and start contracts.</p>
        </article>
        <article className="metric">
          <span>Bidder posts</span>
          <strong>{bidderPostCount}</strong>
          <p>Bidders can promote availability, share skills, and connect through contracts.</p>
        </article>
      </section>

      <section id="public-posts" className="panel public-posts-card">
        <div className="panel-header">
          <div>
            <h2>Public Posts</h2>
            <p>Active marketplace posts are visible without signing in. Sign up to message, contract, or manage work.</p>
          </div>
          <span className="badge approved">{publicLoading ? "Loading" : `${activePosts.length} open`}</span>
        </div>
        {publicError ? <div className="error">{publicError}</div> : null}
        <PostTable
          posts={activePosts}
          users={publicData.users}
          emptyMessage={publicLoading ? "Loading public posts..." : "No public posts are open yet."}
          onSelect={setSelectedPost}
        />
      </section>

      {featuredUsers.length ? (
        <section className="panel public-members-card">
          <div className="panel-header">
            <div>
              <h2>Featured Members</h2>
              <p>Active public profiles connected to currently open posts.</p>
            </div>
          </div>
          <div className="public-member-grid">
            {featuredUsers.map((user) => (
              <article className="public-member-card" key={user.id}>
                <MemberAvatar user={user} />
                <div>
                  <strong>{userDisplayName(user)}</strong>
                  <span>{roleLabel(user.role)} - {user.profileTitle || user.companyName || "Profile available"}</span>
                  <RatingStars value={ratingForUser(user)} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {selectedPost ? (
        <ModalFrame
          title={selectedPost.title}
          subtitle={selectedPostAuthor ? `${userDisplayName(selectedPostAuthor)} - ${roleLabel(selectedPostAuthor.role)}` : postAudienceLabel(selectedPost)}
          onClose={() => setSelectedPost(null)}
        >
          <div className="profile-detail-grid">
            <article className="profile-card">
              <h3>Post Details</h3>
              <p>{selectedPost.criteria || "No details added."}</p>
              <div className="mini-metrics">
                <span><strong>{money(selectedPost.budgetAmount || 0)}</strong> budget</span>
                <span><strong>{money(selectedPost.preferredRate || 0)}</strong> preferred rate</span>
                <span><strong>{money(selectedPost.bonusPerInterview || 0)}</strong> interview bonus</span>
                <span><strong>{paymentScheduleLabel(selectedPost.paymentFrequency, selectedPost.paymentWeekday) || "Flexible"}</strong> schedule</span>
              </div>
            </article>
            <article className="profile-card">
              <h3>Access</h3>
              <p>Create an active account to message the author, send or accept contracts, and manage work through the portal.</p>
              <a className="primary-button compact-button" href="#portal-access" onClick={() => setSelectedPost(null)}>
                Sign in or sign up
              </a>
            </article>
          </div>
        </ModalFrame>
      ) : null}
    </main>
  );
}

function AdminNotificationMenu({
  notifications,
  unreadCount,
  open,
  busy,
  onToggle,
  onClose,
  onMarkRead,
  onOpenNotification,
}: {
  notifications: PortalNotification[];
  unreadCount: number;
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onClose: () => void;
  onMarkRead: (notificationIds?: string[]) => Promise<void>;
  onOpenNotification: (notification: PortalNotification) => void;
}) {
  const latestNotifications = notifications.slice(0, 8);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (wrapRef.current?.contains(target)) {
        return;
      }

      onClose();
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  return (
    <div className="notification-menu-wrap" ref={wrapRef}>
      <button
        className={`notification-trigger ${unreadCount ? "has-unread" : ""}`}
        type="button"
        aria-label="Notification center"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>Notifications</span>
        {unreadCount ? <span className="nav-badge">{unreadCount}</span> : null}
      </button>
      {open ? (
        <div className="notification-popover" role="menu">
          <div className="notification-popover-header">
            <div>
              <strong>Notification center</strong>
              <span>{unreadCount ? `${unreadCount} unread` : "All caught up"}</span>
            </div>
            <button className="ghost-button compact-button" type="button" disabled={busy || !unreadCount} onClick={() => void onMarkRead()}>
              Mark read
            </button>
          </div>
          <div className="notification-list">
            {latestNotifications.map((notification) => (
              <button
                className={`notification-item ${notification.readAt ? "" : "unread"}`}
                key={notification.id}
                type="button"
                onClick={() => {
                  if (!notification.readAt) {
                    void onMarkRead([notification.id]);
                  }
                  onOpenNotification(notification);
                }}
              >
                <strong>{notification.title}</strong>
                <span>{notification.body}</span>
                <small>{dateTime(notification.createdAt)}</small>
              </button>
            ))}
            {!latestNotifications.length ? <div className="empty-state compact">No notifications yet.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AccountMenu({
  user,
  showAccountSettings,
  onProfileSettings,
  onSecurity,
  onHelp,
  onSignOut,
}: {
  user: PortalUser;
  showAccountSettings: boolean;
  onProfileSettings: () => void;
  onSecurity: () => void;
  onHelp: () => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeMenu() {
      setOpen(false);
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (wrapRef.current?.contains(target)) {
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
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function choose(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className="account-menu-wrap" ref={wrapRef}>
      <button
        className="portal-user account-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((nextOpen) => !nextOpen)}
      >
        <strong>{user.name}</strong>
        <span className={`badge ${user.role}`}>{roleLabel(user.role)}</span>
        <span className="account-caret" aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="account-menu" role="menu">
          {showAccountSettings ? (
            <>
              <button type="button" role="menuitem" onClick={() => choose(onProfileSettings)}>
                Profile settings
              </button>
              <button type="button" role="menuitem" onClick={() => choose(onSecurity)}>
                Security
              </button>
            </>
          ) : null}
          <button type="button" role="menuitem" onClick={() => choose(onHelp)}>
            Help
          </button>
          <button type="button" role="menuitem" className="danger" onClick={() => choose(onSignOut)}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AdminOverview({ data }: { data: PortalData }) {
  const currentUser = data.currentUser;
  const [dateRange, setDateRange] = useState<DateRange>(() => dateRangeFromPreset("last7Days"));
  const clientLogs = filterWorkLogsByDate(clientScopedWorkLogs(currentUser, data), dateRange);
  const clientPayments = filterPaymentsByDate(clientScopedPayments(currentUser, data), dateRange);
  const clientContracts = (data.contracts || []).filter((contract) => contract.clientId === currentUser.id);
  const bidderIds = new Set<string>([
    ...clientContracts.map((contract) => contract.workerId),
    ...clientLogs.map((log) => log.userId),
    ...clientPayments.map((payment) => payment.userId),
  ]);
  const clientBidders = data.users.filter((user) => bidderIds.has(user.id) && isWorkerUser(user));
  const totalApplied = clientLogs.reduce((total, log) => total + log.appliedJobs, 0);
  const totalInterviews = clientLogs.reduce((total, log) => total + log.interviewsScheduled, 0);
  const paid = clientPayments.reduce((total, payment) => total + payment.amount, 0);
  const activeContracts = clientContracts.filter((contract) => contract.status === "active").length;
  const bidderSummaries = clientBidders
    .map((bidder) => {
      const bidderLogs = clientLogs.filter((log) => log.userId === bidder.id);
      const bidderPayments = clientPayments.filter((payment) => payment.userId === bidder.id);
      return {
        id: bidder.id,
        name: bidder.name,
        profileTitle: bidder.profileTitle || roleLabel(bidder.role),
        appliedJobs: bidderLogs.reduce((total, log) => total + log.appliedJobs, 0),
        interviewsScheduled: bidderLogs.reduce((total, log) => total + log.interviewsScheduled, 0),
        moneyPaid: bidderPayments.reduce((total, payment) => total + payment.amount, 0),
        logCount: bidderLogs.length,
      };
    })
    .sort((left, right) => right.appliedJobs - left.appliedJobs || right.moneyPaid - left.moneyPaid);
  const bidProfileSummaries = (data.bidProfiles || [])
    .filter((profile) => profile.clientId === currentUser.id)
    .map((profile) => {
      const assignedIds = new Set(profile.assignedBidderIds || []);
      const profileLogs = clientLogs.filter((log) => assignedIds.has(log.userId));
      const profilePayments = clientPayments.filter((payment) => assignedIds.has(payment.userId));
      return {
        id: profile.id,
        name: profile.profileName,
        assignedCount: assignedIds.size,
        appliedJobs: profileLogs.reduce((total, log) => total + log.appliedJobs, 0),
        interviewsScheduled: profileLogs.reduce((total, log) => total + log.interviewsScheduled, 0),
        moneyPaid: profilePayments.reduce((total, payment) => total + payment.amount, 0),
      };
    })
    .sort((left, right) => right.appliedJobs - left.appliedJobs || left.name.localeCompare(right.name));
  const recentLogs = [...clientLogs].sort((left, right) => right.workDate.localeCompare(left.workDate)).slice(0, 8);

  return (
    <div>
      <section className="panel dashboard-filter-panel">
        <div className="panel-header">
          <div>
            <h2>Client Analytics</h2>
            <p>Only work, contracts, and payments connected to your client account are counted.</p>
          </div>
        </div>
        <DateRangeFilter range={dateRange} onChange={setDateRange} />
      </section>

      <div className="metric-grid">
        <div className="metric">
          <span>Money paid</span>
          <strong>{money(paid)}</strong>
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
          <span>Active contracts</span>
          <strong>{activeContracts}</strong>
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Performance Chart</h2>
            <p>Compare money paid, applied jobs, and interviews by bidder.</p>
          </div>
        </div>
        <ClientAnalyticsChart rows={bidderSummaries} />
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Bidder Breakdown</h2>
              <p>Filtered totals grouped by bidder.</p>
            </div>
          </div>
          <ClientBidderBreakdownTable rows={bidderSummaries} />
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Bid Profile Breakdown</h2>
              <p>Filtered totals grouped by assigned client bid profile.</p>
            </div>
          </div>
          <ClientProfileBreakdownTable rows={bidProfileSummaries} />
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Recent Client Work</h2>
            <p>Latest Google Sheet logs connected to your contracts.</p>
          </div>
        </div>
        <WorkLogTable
          logs={recentLogs}
          users={data.users}
          payments={data.payments}
          showPaymentStatus
          emptyMessage="No work logs match this date filter."
        />
      </section>
    </div>
  );
}

function ClientAnalyticsChart({
  rows,
}: {
  rows: Array<{ id: string; name: string; appliedJobs: number; interviewsScheduled: number; moneyPaid: number }>;
}) {
  if (!rows.length) {
    return <div className="empty-state compact">No bidder activity matches this date filter.</div>;
  }

  const maxApplied = Math.max(...rows.map((row) => row.appliedJobs), 1);
  const maxInterviews = Math.max(...rows.map((row) => row.interviewsScheduled), 1);
  const maxPaid = Math.max(...rows.map((row) => row.moneyPaid), 1);

  return (
    <div className="analytics-bars">
      {rows.map((row) => (
        <div className="analytics-row" key={row.id}>
          <div className="analytics-row-title">
            <strong>{row.name}</strong>
            <span>{money(row.moneyPaid)} paid</span>
          </div>
          <AnalyticsBar label="Applied" value={row.appliedJobs} max={maxApplied} />
          <AnalyticsBar label="Interviews" value={row.interviewsScheduled} max={maxInterviews} />
          <AnalyticsBar label="Paid" value={row.moneyPaid} max={maxPaid} formatter={money} />
        </div>
      ))}
    </div>
  );
}

function BidderEarningsChart({
  rows,
}: {
  rows: Array<{ id: string; date: string; clientName: string; amount: number }>;
}) {
  if (!rows.length) {
    return <div className="empty-state compact">No released earnings match this date filter.</div>;
  }

  const maxEarned = Math.max(...rows.map((row) => row.amount), 1);

  return (
    <div className="analytics-bars">
      {rows.map((row) => (
        <div className="analytics-row" key={row.id}>
          <div className="analytics-row-title">
            <strong>{shortDate(row.date)}</strong>
            <span>{row.clientName}</span>
          </div>
          <AnalyticsBar label="Earned" value={row.amount} max={maxEarned} formatter={money} />
        </div>
      ))}
    </div>
  );
}

function AnalyticsBar({
  label,
  value,
  max,
  formatter = (nextValue: number) => String(nextValue),
}: {
  label: string;
  value: number;
  max: number;
  formatter?: (value: number) => string;
}) {
  const width = Math.max(4, Math.min(100, (value / Math.max(max, 1)) * 100));

  return (
    <div className="analytics-bar">
      <span>{label}</span>
      <div className="bar-track" aria-hidden="true">
        <div className="bar-fill" style={{ width: `${width}%` }} />
      </div>
      <strong>{formatter(value)}</strong>
    </div>
  );
}

function ClientBidderBreakdownTable({
  rows,
}: {
  rows: Array<{ id: string; name: string; profileTitle: string; appliedJobs: number; interviewsScheduled: number; moneyPaid: number; logCount: number }>;
}) {
  if (!rows.length) {
    return <div className="empty-state compact">No bidder totals match this filter.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Bidder</th>
            <th>Logs</th>
            <th>Applied</th>
            <th>Interviews</th>
            <th>Money paid</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <strong>{row.name}</strong>
                <span className="table-subtext">{row.profileTitle}</span>
              </td>
              <td>{row.logCount}</td>
              <td>{row.appliedJobs}</td>
              <td>{row.interviewsScheduled}</td>
              <td>{money(row.moneyPaid)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientProfileBreakdownTable({
  rows,
}: {
  rows: Array<{ id: string; name: string; assignedCount: number; appliedJobs: number; interviewsScheduled: number; moneyPaid: number }>;
}) {
  if (!rows.length) {
    return <div className="empty-state compact">No bid profiles have activity in this date range.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Bid profile</th>
            <th>Bidders</th>
            <th>Applied</th>
            <th>Interviews</th>
            <th>Money paid</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td><strong>{row.name}</strong></td>
              <td>{row.assignedCount}</td>
              <td>{row.appliedJobs}</td>
              <td>{row.interviewsScheduled}</td>
              <td>{money(row.moneyPaid)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
    name: user.name || "",
    companyName: user.companyName || "",
    country: user.country || user.profileLocation || "",
    profileTitle: user.profileTitle || "",
    profileBio: user.profileBio || "",
    profileImageDataUrl: user.profileImageDataUrl || "",
    profileSkills: profileSkillsText(user),
    profileLanguages: profileLanguagesText(user),
    profileLocation: user.profileLocation || "",
    profileTimeZone: user.profileTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    clientPreferences: user.clientPreferences || [],
    allowDirectMessages: user.allowDirectMessages !== false,
  });
  const [emailDraft, setEmailDraft] = useState({
    newEmail: user.email || "",
    currentPassword: "",
  });
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [accountNotice, setAccountNotice] = useState("");
  const [accountError, setAccountError] = useState("");
  const isClientProfile = isClientRole(user.role);
  const isWorkerProfile = isWorkerUser(user);
  const profileTimeZoneOptions = timeZoneOptions.includes(draft.profileTimeZone)
    ? timeZoneOptions
    : [draft.profileTimeZone, ...timeZoneOptions].filter(Boolean);

  function toggleClientPreference(preference: string) {
    setDraft((current) => {
      const exists = current.clientPreferences.includes(preference);
      return {
        ...current,
        clientPreferences: exists
          ? current.clientPreferences.filter((item) => item !== preference)
          : [...current.clientPreferences, preference],
      };
    });
  }

  async function handleProfileImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setAccountError("");
    try {
      const profileImageDataUrl = await resizeProfileImage(file);
      setDraft((current) => ({ ...current, profileImageDataUrl }));
    } catch (imageError) {
      setAccountError(imageError instanceof Error ? imageError.message : "Profile image could not be saved.");
    } finally {
      event.target.value = "";
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave("saveProfile", {
      ...draft,
      profileSkills: parseListInput(draft.profileSkills),
      profileLanguages: parseListInput(draft.profileLanguages),
      profileLocation: draft.profileLocation || draft.country,
    });
  }

  async function submitEmail(event: FormEvent) {
    event.preventDefault();
    setAccountNotice("");
    setAccountError("");
    const nextData = await onSave("updateOwnEmail", {
      newEmail: emailDraft.newEmail,
      currentPassword: emailDraft.currentPassword,
    });
    if (nextData) {
      setEmailDraft({ newEmail: nextData.currentUser.email, currentPassword: "" });
      setAccountNotice("Email settings saved.");
    }
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    setAccountNotice("");
    setAccountError("");
    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      setAccountError("New passwords do not match.");
      return;
    }

    const nextData = await onSave("updateOwnPassword", {
      currentPassword: passwordDraft.currentPassword,
      newPassword: passwordDraft.newPassword,
    });
    if (nextData) {
      setPasswordDraft({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setAccountNotice("Password updated.");
    }
  }

  return (
    <div className="dashboard-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Profile Settings</h2>
            <p>Complete the profile that matched clients and bidders can view.</p>
          </div>
          <div className="badge-row">
            <span className="badge">User ID: {displayUserId(user)}</span>
            <span className={`badge ${isProfileComplete(user) ? "approved" : "pending"}`}>
              {isProfileComplete(user) ? "Complete" : "Incomplete"}
            </span>
          </div>
        </div>

        <form className="form-grid" onSubmit={submit}>
          <div className="profile-image-field full">
            <MemberAvatar user={{ ...user, profileImageDataUrl: draft.profileImageDataUrl }} size="lg" />
            <div>
              <strong>Profile image</strong>
              <p>Shown beside your inbox messages and profile cards. The image is resized before saving.</p>
              <div className="actions compact-actions">
                <label className="ghost-button compact-button">
                  Upload image
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleProfileImageChange} hidden />
                </label>
                {draft.profileImageDataUrl ? (
                  <button className="ghost-button compact-button" type="button" onClick={() => setDraft({ ...draft, profileImageDataUrl: "" })}>
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <label className="field">
            <span>Name *</span>
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Your public name"
              required
            />
          </label>
          {isClientProfile ? (
            <label className="field">
              <span>Company</span>
              <input
                value={draft.companyName}
                onChange={(event) => setDraft({ ...draft, companyName: event.target.value })}
                placeholder="Company or agency name"
              />
            </label>
          ) : null}
          <label className="field">
            <span>Country *</span>
            <input
              value={draft.country}
              onChange={(event) => setDraft({ ...draft, country: event.target.value, profileLocation: event.target.value })}
              placeholder="Country"
              required
            />
          </label>
          <label className="field">
            <span>Timezone *</span>
            <select
              value={draft.profileTimeZone}
              onChange={(event) => setDraft({ ...draft, profileTimeZone: event.target.value })}
              required
            >
              {profileTimeZoneOptions.map((timeZone) => (
                <option key={timeZone} value={timeZone}>{timeZoneDisplay(timeZone)}</option>
              ))}
            </select>
          </label>
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
          {isWorkerProfile ? (
            <>
              <label className="field">
                <span>Skills *</span>
                <input
                  value={draft.profileSkills}
                  onChange={(event) => setDraft({ ...draft, profileSkills: event.target.value })}
                  placeholder="Upwork, LinkedIn, React, Backend"
                  required
                />
              </label>
              <label className="field">
                <span>Languages & level *</span>
                <input
                  value={draft.profileLanguages}
                  onChange={(event) => setDraft({ ...draft, profileLanguages: event.target.value })}
                  placeholder={languageLevelOptions.slice(0, 3).join(", ")}
                  required
                />
              </label>
            </>
          ) : (
            <label className="field">
              <span>Focus</span>
              <input
                value={draft.profileSkills}
                onChange={(event) => setDraft({ ...draft, profileSkills: event.target.value })}
                placeholder="Remote hiring, SaaS, web agencies"
              />
            </label>
          )}
          {isClientProfile ? (
            <div className="field full">
              <span>Preferences *</span>
              <div className="checkbox-grid">
                {clientPreferenceOptions.map((preference) => (
                  <label className="check-field" key={preference}>
                    <input
                      type="checkbox"
                      checked={draft.clientPreferences.includes(preference)}
                      onChange={() => toggleClientPreference(preference)}
                    />
                    <span>{preference}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
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
        <div className="panel-header">
          <div>
            <h2>Security</h2>
            <p>Update the email used for sign-in and manage your password.</p>
          </div>
          <div className="badge-row">
            <span className={`badge ${user.emailVerifiedAt ? "approved" : "pending"}`}>
              {user.emailVerifiedAt ? "Email verified" : "Email not verified"}
            </span>
            <span className="badge">{user.passwordSet ? "Password set" : "Password needed"}</span>
          </div>
        </div>

        {accountNotice ? <div className="status-strip compact success">{accountNotice}</div> : null}
        {accountError ? <div className="error">{accountError}</div> : null}

        <div className="settings-grid">
          <form className="form-grid account-settings-form" onSubmit={submitEmail}>
            <label className="field full">
              <span>Email</span>
              <input
                type="email"
                value={emailDraft.newEmail}
                onChange={(event) => setEmailDraft({ ...emailDraft, newEmail: event.target.value })}
                required
              />
            </label>
            <label className="field full">
              <span>Current password</span>
              <input
                type="password"
                value={emailDraft.currentPassword}
                onChange={(event) => setEmailDraft({ ...emailDraft, currentPassword: event.target.value })}
                placeholder={user.passwordSet ? "Required to change email" : "Only needed if password is set"}
              />
            </label>
            <div className="actions full">
              <button className="primary-button" type="submit" disabled={busy || emailDraft.newEmail === user.email}>
                Save email
              </button>
            </div>
          </form>

          <form className="form-grid account-settings-form" onSubmit={submitPassword}>
            <label className="field">
              <span>Current password</span>
              <input
                type="password"
                value={passwordDraft.currentPassword}
                onChange={(event) => setPasswordDraft({ ...passwordDraft, currentPassword: event.target.value })}
                placeholder={user.passwordSet ? "Current password" : "Only needed if password is set"}
              />
            </label>
            <label className="field">
              <span>New password</span>
              <input
                type="password"
                minLength={8}
                value={passwordDraft.newPassword}
                onChange={(event) => setPasswordDraft({ ...passwordDraft, newPassword: event.target.value })}
                placeholder="At least 8 characters"
                required
              />
            </label>
            <label className="field">
              <span>Confirm password</span>
              <input
                type="password"
                minLength={8}
                value={passwordDraft.confirmPassword}
                onChange={(event) => setPasswordDraft({ ...passwordDraft, confirmPassword: event.target.value })}
                placeholder="Repeat new password"
                required
              />
            </label>
            <div className="actions">
              <button className="primary-button" type="submit" disabled={busy}>
                Save password
              </button>
            </div>
          </form>
        </div>
      </section>

      {isClientProfile ? <ClientBidProfilesManager data={data} busy={busy} onSave={onSave} /> : null}
    </div>
  );
}

function parseListInput(value: string | string[] | undefined) {
  const parts = Array.isArray(value) ? value : String(value || "").split(",");
  return parts.map((part) => part.trim()).filter(Boolean);
}

function parseExtraFieldsInput(value: string) {
  return value
    .split("\n")
    .map((line) => {
      const [label, ...valueParts] = line.split(":");
      return {
        label: (label || "").trim(),
        value: valueParts.join(":").trim(),
      };
    })
    .filter((field) => field.label || field.value);
}

function extraFieldsInput(fields: BidProfileRecord["extraFields"] = []) {
  return fields.map((field) => `${field.label}: ${field.value}`).join("\n");
}

function splitLegalName(value = "") {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return { firstName: "", middleName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: "", lastName: "" };
  }

  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function bidProfileFullName(profile: BidProfileRecord) {
  return [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ") || profile.fullLegalName;
}

function bidProfileIdentityLines(profile: BidProfileRecord) {
  return [
    { label: "First name", value: profile.firstName },
    { label: "Middle name", value: profile.middleName },
    { label: "Last name", value: profile.lastName },
    { label: "Full legal name", value: bidProfileFullName(profile) },
    { label: "Email", value: profile.contactEmail },
    { label: "Phone", value: profile.phone },
    { label: "DOB", value: profile.dateOfBirth ? shortDate(profile.dateOfBirth) : "" },
    { label: "Last 4 SSN", value: profile.lastFourSsn },
  ];
}

function bidProfileJobLines(profile: BidProfileRecord) {
  return [
    { label: "Target salary", value: profile.targetSalary },
    { label: "Visa status", value: profile.visaStatus },
    { label: "Resume", value: profile.resumeUrl },
    { label: "LinkedIn", value: profile.linkedinUrl },
    { label: "Portfolio", value: profile.portfolioUrl },
  ];
}

function bidProfileComplianceLines(profile: BidProfileRecord) {
  return [
    { label: "Race", value: profile.race },
    { label: "Veteran status", value: profile.veteranStatus },
    { label: "Disability", value: profile.disabilityStatus },
  ];
}

function BidProfileDetailGrid({ rows }: { rows: { label: string; value?: string }[] }) {
  return (
    <div className="profile-detail-list">
      {rows.map((row) => (
        <span key={row.label}>
          <strong>{row.label}</strong>
          {row.value || "Not set"}
        </span>
      ))}
    </div>
  );
}

function BidProfileCard({
  profile,
  assignedNames = [],
  actions,
  onOpen,
}: {
  profile: BidProfileRecord;
  assignedNames?: string[];
  actions?: ActionMenuItem[];
  onOpen: () => void;
}) {
  return (
    <article
      className="profile-card bid-profile-card selectable-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onOpen();
        }
      }}
    >
      <div className="person-title">
        <div>
          <h3>{profile.profileName}</h3>
          <span className="table-subtext">{bidProfileFullName(profile)} - {profile.contactEmail}</span>
          <span className="table-subtext">
            {assignedNames.length ? `Shared with ${assignedNames.join(", ")}` : "Not shared with bidders"}
          </span>
        </div>
        {actions?.length ? (
          <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
            <ActionMenu items={actions} />
          </span>
        ) : null}
      </div>
      <div className="badge-row">
        {profile.jobTitles.slice(0, 3).map((title) => (
          <span className="badge" key={title}>{title}</span>
        ))}
        {profile.jobTitles.length > 3 ? <span className="badge">+{profile.jobTitles.length - 3}</span> : null}
      </div>
      <p>{profile.resumeUrl || profile.linkedinUrl || profile.portfolioUrl || profile.notes || "Open to view bidding details."}</p>
    </article>
  );
}

function BidProfileDetailModal({
  profile,
  assignedNames = [],
  onClose,
}: {
  profile: BidProfileRecord;
  assignedNames?: string[];
  onClose: () => void;
}) {
  return (
    <ModalFrame title={profile.profileName} subtitle="Client bid profile for job bidding." className="client-detail-modal" onClose={onClose}>
      <div className="detail-stack">
        <DismissibleNotice id="bid-profile-sharing-info" className="compact">
          {assignedNames.length
            ? `Shared with ${assignedNames.join(", ")}`
            : "This profile is not shared with bidders yet."}
        </DismissibleNotice>
        <section className="detail-section">
          <h3>Identity</h3>
          <BidProfileDetailGrid rows={bidProfileIdentityLines(profile)} />
        </section>
        <section className="detail-section">
          <h3>Job bidding</h3>
          <div className="badge-row">
            {profile.jobTitles.map((title) => (
              <span className="badge" key={title}>{title}</span>
            ))}
            {!profile.jobTitles.length ? <span className="muted">No job titles added.</span> : null}
          </div>
          <BidProfileDetailGrid rows={bidProfileJobLines(profile)} />
        </section>
        <section className="detail-section">
          <h3>Optional EEO details</h3>
          <BidProfileDetailGrid rows={bidProfileComplianceLines(profile)} />
        </section>
        {profile.extraFields?.length ? (
          <section className="detail-section">
            <h3>Additional fields</h3>
            <BidProfileDetailGrid rows={profile.extraFields} />
          </section>
        ) : null}
        <section className="detail-section">
          <h3>Notes</h3>
          <p>{profile.notes || "No notes added."}</p>
        </section>
      </div>
    </ModalFrame>
  );
}

function bidProfileDraft(profile: BidProfileRecord | null, user: PortalUser) {
  const derivedName = splitLegalName(profile?.fullLegalName || user.name || "");
  return {
    bidProfileId: profile?.id || "",
    profileName: profile?.profileName || "",
    firstName: profile?.firstName || derivedName.firstName,
    middleName: profile?.middleName || derivedName.middleName,
    lastName: profile?.lastName || derivedName.lastName,
    contactEmail: profile?.contactEmail || user.email || "",
    phone: profile?.phone || "",
    dateOfBirth: profile?.dateOfBirth || "",
    lastFourSsn: profile?.lastFourSsn || "",
    targetSalary: profile?.targetSalary || "",
    visaStatus: profile?.visaStatus || "",
    jobTitles: (profile?.jobTitles || []).join(", "),
    resumeUrl: profile?.resumeUrl || "",
    linkedinUrl: profile?.linkedinUrl || "",
    portfolioUrl: profile?.portfolioUrl || "",
    race: profile?.race || "",
    veteranStatus: profile?.veteranStatus || "",
    disabilityStatus: profile?.disabilityStatus || "",
    assignedBidderIds: profile?.assignedBidderIds || [],
    notifyAssignedBidders: false,
    extraFieldsText: extraFieldsInput(profile?.extraFields || []),
    notes: profile?.notes || "",
  };
}

function ClientBidProfilesManager({
  data,
  busy,
  onSave,
}: {
  data: PortalData;
  busy: boolean;
  onSave: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const user = data.currentUser;
  const profiles = (data.bidProfiles || []).filter((profile) => profile.clientId === user.id);
  const attachableBidders = data.users
    .filter((candidate) => candidate.role === "bidder" && isActiveAccount(candidate) && candidate.assignedAdminId === user.id)
    .sort((left, right) => left.name.localeCompare(right.name));
  const [editingProfile, setEditingProfile] = useState<BidProfileRecord | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<BidProfileRecord | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [draft, setDraft] = useState(() => bidProfileDraft(null, user));
  const draftVisaStatusOptions = visaStatusOptions.includes(draft.visaStatus)
    ? visaStatusOptions
    : [draft.visaStatus, ...visaStatusOptions].filter(Boolean);

  function addProfile() {
    setEditingProfile(null);
    setDraft(bidProfileDraft(null, user));
    setProfileModalOpen(true);
  }

  function editProfile(profile: BidProfileRecord) {
    setEditingProfile(profile);
    setDraft(bidProfileDraft(profile, user));
    setProfileModalOpen(true);
  }

  function resetDraft() {
    setEditingProfile(null);
    setDraft(bidProfileDraft(null, user));
    setProfileModalOpen(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextData = await onSave("saveBidProfile", {
      clientId: user.id,
      bidProfileId: draft.bidProfileId,
      profileName: draft.profileName,
      firstName: draft.firstName,
      middleName: draft.middleName,
      lastName: draft.lastName,
      fullLegalName: [draft.firstName, draft.middleName, draft.lastName].filter(Boolean).join(" "),
      contactEmail: draft.contactEmail,
      phone: draft.phone,
      dateOfBirth: draft.dateOfBirth,
      lastFourSsn: draft.lastFourSsn,
      targetSalary: draft.targetSalary,
      visaStatus: draft.visaStatus,
      jobTitles: parseListInput(draft.jobTitles),
      resumeUrl: draft.resumeUrl,
      linkedinUrl: draft.linkedinUrl,
      portfolioUrl: draft.portfolioUrl,
      race: draft.race,
      veteranStatus: draft.veteranStatus,
      disabilityStatus: draft.disabilityStatus,
      assignedBidderIds: draft.assignedBidderIds,
      notifyAssignedBidders: draft.notifyAssignedBidders,
      extraFields: parseExtraFieldsInput(draft.extraFieldsText),
      notes: draft.notes,
    });
    if (nextData) {
      resetDraft();
    }
  }

  function toggleAssignedBidder(bidderId: string) {
    setDraft((currentDraft) => {
      const assigned = new Set(currentDraft.assignedBidderIds);
      if (assigned.has(bidderId)) {
        assigned.delete(bidderId);
      } else {
        assigned.add(bidderId);
      }
      return { ...currentDraft, assignedBidderIds: Array.from(assigned) };
    });
  }

  function attachedBidderNames(profile: BidProfileRecord) {
    const assigned = new Set(profile.assignedBidderIds || []);
    return attachableBidders.filter((bidder) => assigned.has(bidder.id)).map((bidder) => bidder.name);
  }

  async function deleteProfile(profile: BidProfileRecord) {
    if (!window.confirm(`Delete bid profile "${profile.profileName}"?`)) {
      return;
    }
    const nextData = await onSave("deleteBidProfile", { bidProfileId: profile.id });
    if (nextData && editingProfile?.id === profile.id) {
      resetDraft();
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Bid Profiles</h2>
          <p>Create reusable client bid profiles. Shared bidders get notified and can view them from contract details.</p>
        </div>
        <div className="actions">
          <span className="badge bidder">{profiles.length} profiles</span>
          <button className="primary-button compact-button" type="button" disabled={busy} onClick={addProfile}>
            Add bid profile
          </button>
        </div>
      </div>

      {profileModalOpen ? (
        <ModalFrame title={editingProfile ? "Edit Bid Profile" : "Add Bid Profile"} subtitle="Share this profile with assigned bidders." className="client-detail-modal" onClose={resetDraft}>
      <form className="form-grid" onSubmit={submit}>
        <label className="field">
          <span>Profile name *</span>
          <input value={draft.profileName} onChange={(event) => setDraft({ ...draft, profileName: event.target.value })} placeholder="React frontend profile" required />
        </label>
        <label className="field">
          <span>First name *</span>
          <input value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} required />
        </label>
        <label className="field">
          <span>Middle name</span>
          <input value={draft.middleName} onChange={(event) => setDraft({ ...draft, middleName: event.target.value })} />
        </label>
        <label className="field">
          <span>Last name *</span>
          <input value={draft.lastName} onChange={(event) => setDraft({ ...draft, lastName: event.target.value })} required />
        </label>
        <label className="field">
          <span>Email *</span>
          <input type="email" value={draft.contactEmail} onChange={(event) => setDraft({ ...draft, contactEmail: event.target.value })} required />
        </label>
        <label className="field">
          <span>Phone</span>
          <input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
        </label>
        <label className="field">
          <span>DOB</span>
          <input type="date" value={draft.dateOfBirth} onChange={(event) => setDraft({ ...draft, dateOfBirth: event.target.value })} />
        </label>
        <label className="field">
          <span>Last 4 SSN</span>
          <input
            value={draft.lastFourSsn}
            onChange={(event) => setDraft({ ...draft, lastFourSsn: event.target.value.replace(/\D/g, "").slice(0, 4) })}
            inputMode="numeric"
            maxLength={4}
            placeholder="1234"
          />
        </label>
        <label className="field">
          <span>Target salary</span>
          <input value={draft.targetSalary} onChange={(event) => setDraft({ ...draft, targetSalary: event.target.value })} placeholder="$120,000" />
        </label>
        <label className="field">
          <span>Visa status</span>
          <select value={draft.visaStatus} onChange={(event) => setDraft({ ...draft, visaStatus: event.target.value })}>
            {draftVisaStatusOptions.map((option) => (
              <option key={option || "blank"} value={option}>{option || "Not set"}</option>
            ))}
          </select>
        </label>
        <label className="field full">
          <span>Job titles *</span>
          <input value={draft.jobTitles} onChange={(event) => setDraft({ ...draft, jobTitles: event.target.value })} placeholder={jobTitleOptions.slice(0, 4).join(", ")} required />
        </label>
        <label className="field">
          <span>Resume link</span>
          <input value={draft.resumeUrl} onChange={(event) => setDraft({ ...draft, resumeUrl: event.target.value })} placeholder="https://..." />
        </label>
        <label className="field">
          <span>LinkedIn</span>
          <input value={draft.linkedinUrl} onChange={(event) => setDraft({ ...draft, linkedinUrl: event.target.value })} placeholder="https://linkedin.com/in/..." />
        </label>
        <label className="field">
          <span>Portfolio</span>
          <input value={draft.portfolioUrl} onChange={(event) => setDraft({ ...draft, portfolioUrl: event.target.value })} placeholder="https://..." />
        </label>
        <label className="field">
          <span>Race</span>
          <select value={draft.race} onChange={(event) => setDraft({ ...draft, race: event.target.value })}>
            {raceOptions.map((option) => (
              <option key={option || "blank"} value={option}>{option || "Not set"}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Veteran status</span>
          <select value={draft.veteranStatus} onChange={(event) => setDraft({ ...draft, veteranStatus: event.target.value })}>
            {veteranStatusOptions.map((option) => (
              <option key={option || "blank"} value={option}>{option || "Not set"}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Disability</span>
          <select value={draft.disabilityStatus} onChange={(event) => setDraft({ ...draft, disabilityStatus: event.target.value })}>
            {disabilityStatusOptions.map((option) => (
              <option key={option || "blank"} value={option}>{option || "Not set"}</option>
            ))}
          </select>
        </label>
        <div className="field full">
          <span>Share with bidders</span>
          {attachableBidders.length ? (
            <div className="checkbox-grid compact-checkbox-grid">
              {attachableBidders.map((bidder) => (
                <label className="check-field" key={bidder.id}>
                  <input
                    type="checkbox"
                    checked={draft.assignedBidderIds.includes(bidder.id)}
                    onChange={() => toggleAssignedBidder(bidder.id)}
                  />
                  <span>{bidder.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <span className="muted">No assigned bidders are available yet.</span>
          )}
        </div>
        {editingProfile ? (
          <label className="check-field full">
            <input
              type="checkbox"
              checked={draft.notifyAssignedBidders}
              onChange={(event) => setDraft({ ...draft, notifyAssignedBidders: event.target.checked })}
            />
            <span>Notify shared bidders about this profile update</span>
          </label>
        ) : null}
        <label className="field full">
          <span>Additional fields</span>
          <textarea value={draft.extraFieldsText} onChange={(event) => setDraft({ ...draft, extraFieldsText: event.target.value })} placeholder="Portfolio: https://example.com" />
        </label>
        <label className="field full">
          <span>Notes</span>
          <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        </label>
        <div className="actions full">
          <button className="primary-button" type="submit" disabled={busy}>
            {editingProfile ? "Save bid profile" : "Add bid profile"}
          </button>
          {editingProfile ? (
            <button className="ghost-button" type="button" onClick={resetDraft}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
        </ModalFrame>
      ) : null}

      <div className="bid-profile-grid">
        {profiles.map((profile) => {
          const assignedNames = attachedBidderNames(profile);
          return (
          <BidProfileCard
            key={profile.id}
            profile={profile}
            assignedNames={assignedNames}
            onOpen={() => setSelectedProfile(profile)}
            actions={[
              { label: "View details", onClick: () => setSelectedProfile(profile) },
              { label: "Edit", onClick: () => editProfile(profile) },
              { label: "Delete", danger: true, onClick: () => void deleteProfile(profile) },
            ]}
          />
          );
        })}
        {!profiles.length ? <div className="empty-state">No bid profiles yet.</div> : null}
      </div>
      {selectedProfile ? (
        <BidProfileDetailModal
          profile={selectedProfile}
          assignedNames={attachedBidderNames(selectedProfile)}
          onClose={() => setSelectedProfile(null)}
        />
      ) : null}
    </section>
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
  const [selectedBidProfile, setSelectedBidProfile] = useState<BidProfileRecord | null>(null);
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
  const selectedClientBidProfiles = selectedClient
    ? (data.bidProfiles || []).filter((profile) => profile.clientId === selectedClient.id)
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
                    <TableMemberCell user={client} subtitle={client.profileTitle || client.email} />
                  </td>
                  <td>{shortDate(client.createdAt.slice(0, 10))}</td>
                  <td>{money(stats?.moneyPaid || 0)}</td>
                  <td><RatingStars value={ratingForUser(client)} /></td>
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
        <ModalFrame title={selectedClient.name} subtitle={selectedClient.email} className="client-detail-modal" onClose={() => setSelectedClient(null)}>
            <div className="profile-detail-grid">
              <article className="profile-card">
                <h3>Profile Info</h3>
                <strong>{selectedClient.profileTitle || "Profile title not set"}</strong>
                <p>{selectedClient.profileBio || "No profile bio yet."}</p>
                <p className="muted">
                  {selectedClient.companyName ? `${selectedClient.companyName} - ` : ""}
                  {selectedClient.country || selectedClient.profileLocation || "Country not set"} - {selectedClient.profileTimeZone || "Timezone not set"}
                </p>
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
                <div className="badge-row">
                  {(selectedClient.clientPreferences || []).map((preference) => (
                    <span className="badge bidder" key={preference}>{preference}</span>
                  ))}
                </div>
              </article>

              <article className="profile-card">
                <h3>Client Signals</h3>
                <div className="mini-metrics">
                  <span><strong>{money(selectedClient.clientStats?.moneyPaid || 0)}</strong> paid</span>
                  <span><RatingStars value={ratingForUser(selectedClient)} /> rating</span>
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

              <article className="profile-card">
                <h3>Reviews</h3>
                <div className="mini-metrics">
                  <span><RatingStars value={ratingForUser(selectedClient)} /> bidder rating</span>
                  <span><strong>{selectedClient.clientStats?.assignedBidderCount || 0}</strong> hired bidders</span>
                </div>
                <p>No written reviews yet.</p>
              </article>

              {selectedClient.creditBalances ? (
                <article className="profile-card">
                  <h3>Client Credit Balance</h3>
                  <p>Visible because you are connected with this client.</p>
                  <CreditBalanceStrip balances={selectedClient.creditBalances} />
                </article>
              ) : null}
            </div>

            {selectedClientBidProfiles.length ? (
              <section className="panel nested-panel" style={{ marginBottom: 18 }}>
                <div className="panel-header">
                  <div>
                    <h2>Bid Profiles</h2>
                    <p>Client-provided profiles bidders can use for outreach.</p>
                  </div>
                </div>
                <div className="bid-profile-grid">
                  {selectedClientBidProfiles.map((profile) => (
                    <BidProfileCard
                      key={profile.id}
                      profile={profile}
                      assignedNames={(profile.assignedBidderIds || [])
                        .map((bidderId) => userById(data.users, bidderId)?.name || "")
                        .filter(Boolean)}
                      onOpen={() => setSelectedBidProfile(profile)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="panel nested-panel">
              <div className="panel-header">
                <div>
                  <h2>Worked With</h2>
                  <p>Only collaboration totals, pay rate, and contract timeline are shown.</p>
                </div>
              </div>
              <CollaborationSummaryList user={selectedClient} data={data} />
            </section>
        </ModalFrame>
      ) : null}
      {selectedBidProfile ? (
        <BidProfileDetailModal
          profile={selectedBidProfile}
          assignedNames={(selectedBidProfile.assignedBidderIds || [])
            .map((bidderId) => userById(data.users, bidderId)?.name || "")
            .filter(Boolean)}
          onClose={() => setSelectedBidProfile(null)}
        />
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
  const [selectedBidder, setSelectedBidder] = useState<PortalUser | null>(null);
  const bidders = data.users
    .filter((user) => user.role === "bidder" && isActiveAccount(user))
    .filter((user) => userMatchesSearch(user, query))
    .sort((left, right) => {
      const leftActiveCount = contractsForBidder(left).filter((contract) => contract.status === "active").length;
      const rightActiveCount = contractsForBidder(right).filter((contract) => contract.status === "active").length;
      if (leftActiveCount !== rightActiveCount) return leftActiveCount - rightActiveCount;
      return left.name.localeCompare(right.name);
    });

  function contractsForBidder(user: PortalUser) {
    return (data.contracts || []).filter((contract) => contract.workerId === user.id);
  }

  function contractStatus(user: PortalUser) {
    const activeContracts = contractsForBidder(user).filter((contract) => contract.status === "active");
    if (!activeContracts.length) {
      return { label: "Available", className: "approved" };
    }
    if (activeContracts.some((contract) => contract.clientId === data.currentUser.id)) {
      return { label: `Working with you (${activeContracts.length})`, className: "bidder" };
    }
    return { label: `Currently working (${activeContracts.length})`, className: "pending" };
  }

  const selectedBidderContracts = selectedBidder
    ? contractsForBidder(selectedBidder)
    : [];
  const selectedBidderCurrentContracts = selectedBidderContracts.filter((contract) => ["requested", "active"].includes(contract.status));
  const selectedBidderPastContracts = selectedBidderContracts.filter((contract) => ["rejected", "ended"].includes(contract.status));

  function messageSelectedBidder(bidder: PortalUser) {
    setSelectedBidder(null);
    onMessageBidder(bidder.id);
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
                <tr className="clickable-row" key={bidder.id} onClick={() => setSelectedBidder(bidder)}>
                  <td>
                    <TableMemberCell user={bidder} subtitle={bidder.email} />
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
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedBidder(bidder);
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
      {!bidders.length ? <div className="empty-state">No bidders match this search.</div> : null}

      {selectedBidder ? (
        <ModalFrame title={selectedBidder.name} subtitle={selectedBidder.email} className="client-detail-modal" onClose={() => setSelectedBidder(null)}>
            <div className="profile-detail-grid">
              <article className="profile-card">
                <h3>Profile Info</h3>
                <strong>{selectedBidder.profileTitle || "Profile title not set"}</strong>
                <p>{selectedBidder.profileBio || "No profile bio yet."}</p>
                <p className="muted">{selectedBidder.country || selectedBidder.profileLocation || "Country not set"} - {selectedBidder.profileTimeZone || "Timezone not set"}</p>
                <div className="badge-row">
                  {(selectedBidder.profileSkills || []).map((skill) => (
                    <span className="badge" key={skill}>{skill}</span>
                  ))}
                  {!selectedBidder.profileSkills?.length ? <span className="badge">No skills listed</span> : null}
                </div>
                <div className="badge-row">
                  {(selectedBidder.profileLanguages || []).map((language) => (
                    <span className="badge bidder" key={language}>{language}</span>
                  ))}
                </div>
              </article>

              <article className="profile-card">
                <h3>Work Summary</h3>
                <div className="mini-metrics">
                  <span><strong>{selectedBidder.bidderStats?.totalApplied || 0}</strong> applied</span>
                  <span><strong>{selectedBidder.bidderStats?.totalInterviews || 0}</strong> interviews</span>
                  <span><strong>{money(selectedBidder.bidderStats?.totalEarned || 0)}</strong> earned</span>
                  <span><strong>{contractStatus(selectedBidder).label}</strong> status</span>
                </div>
                <button
                  className="primary-button"
                  type="button"
                  disabled={selectedBidder.allowDirectMessages === false}
                  onClick={() => messageSelectedBidder(selectedBidder)}
                >
                  {selectedBidder.allowDirectMessages === false ? "Messages off" : "Message bidder"}
                </button>
              </article>

              <article className="profile-card">
                <h3>Reviews</h3>
                <RatingStars value={ratingForUser(selectedBidder)} />
                <p>No written reviews yet.</p>
              </article>
              <article className="profile-card">
                <h3>Contract History</h3>
                <div className="mini-metrics">
                  <span><strong>{selectedBidderCurrentContracts.length}</strong> current</span>
                  <span><strong>{selectedBidderPastContracts.length}</strong> past</span>
                </div>
                <div className="payment-method-list compact-list">
                  {selectedBidderCurrentContracts.slice(0, 4).map((contract) => {
                    const client = userById(data.users, contract.clientId);
                    return (
                      <div className="payment-row compact" key={contract.id}>
                        <div>
                          <strong>{contract.title}</strong>
                          <span className="table-subtext">Contract ID: {contract.id}</span>
                          <span className="muted">{client?.name || "Client"} - {contractStatusLabel(contract.status)} - next payday {shortDate(contract.nextPaymentDate)}</span>
                        </div>
                      </div>
                    );
                  })}
                  {!selectedBidderCurrentContracts.length ? <div className="empty-state compact">No current contracts.</div> : null}
                </div>
              </article>
            </div>

            <section className="panel nested-panel">
              <div className="panel-header">
                <div>
                  <h2>Worked With</h2>
                  <p>Only collaboration totals, pay rate, and contract timeline are shown.</p>
                </div>
              </div>
              <CollaborationSummaryList user={selectedBidder} data={data} />
            </section>
        </ModalFrame>
      ) : null}
    </section>
  );
}

function CreditBalanceStrip({ balances }: { balances: { moneyCreditBalance: number; postCreditBalance: number; giftCreditBalance?: number; postingCreditBalance?: number } }) {
  const postCreditBalance = balances.postCreditBalance ?? balances.giftCreditBalance ?? 0;
  return (
    <div className="credit-strip">
      <span>
        <strong>{money(balances.moneyCreditBalance)}</strong>
        Money credit
      </span>
      <span>
        <strong>{postCreditCount(postCreditBalance)}</strong>
        Post credit
      </span>
    </div>
  );
}

type ContractTermDraft = {
  paymentStyle: ContractPaymentStyle;
  fixedBudget: string;
  hourlyRate: string;
  regularSalary: string;
  ratePerApplication: string;
  bonusPerInterview: string;
};

function ContractPaymentFields({
  draft,
  onChange,
}: {
  draft: ContractTermDraft;
  onChange: (updates: Partial<ContractTermDraft>) => void;
}) {
  return (
    <>
      <label className="field">
        <span>Payment style</span>
        <select value={draft.paymentStyle} onChange={(event) => onChange({ paymentStyle: event.target.value as ContractPaymentStyle })}>
          {contractPaymentStyles.map((style) => (
            <option key={style.value} value={style.value}>{style.label}</option>
          ))}
        </select>
      </label>
      {draft.paymentStyle === "fixed" ? (
        <label className="field">
          <span>Fixed budget</span>
          <input type="number" min="0" step="0.01" value={draft.fixedBudget} onChange={(event) => onChange({ fixedBudget: event.target.value })} />
        </label>
      ) : null}
      {draft.paymentStyle === "hourly" ? (
        <label className="field">
          <span>Hourly rate</span>
          <input type="number" min="0" step="0.01" value={draft.hourlyRate} onChange={(event) => onChange({ hourlyRate: event.target.value })} />
        </label>
      ) : null}
      {draft.paymentStyle === "regular" ? (
        <label className="field">
          <span>Monthly salary</span>
          <input type="number" min="0" step="0.01" value={draft.regularSalary} onChange={(event) => onChange({ regularSalary: event.target.value })} />
        </label>
      ) : null}
      {["per_bid", "per_bid_bonus"].includes(draft.paymentStyle) ? (
        <label className="field">
          <span>Price per bid</span>
          <input type="number" min="0" step="0.01" value={draft.ratePerApplication} onChange={(event) => onChange({ ratePerApplication: event.target.value })} />
        </label>
      ) : null}
      {draft.paymentStyle === "per_bid_bonus" ? (
        <label className="field">
          <span>Bonus per interview</span>
          <input type="number" min="0" step="0.01" value={draft.bonusPerInterview} onChange={(event) => onChange({ bonusPerInterview: event.target.value })} />
        </label>
      ) : null}
    </>
  );
}

function collaborationSummariesForUser(user: PortalUser, data: PortalData) {
  return (data.contracts || [])
    .filter((contract) => contract.clientId === user.id || contract.workerId === user.id)
    .map((contract) => {
      const otherUserId = contract.clientId === user.id ? contract.workerId : contract.clientId;
      const otherUser = userById(data.users, otherUserId);
      const released = (data.payments || [])
        .filter(
          (payment) =>
            isCreditSpentPayment(payment) &&
            payment.clientId === contract.clientId &&
            payment.userId === contract.workerId
        )
        .reduce((total, payment) => total + payment.amount, 0);

      return { contract, otherUser, released };
    })
    .sort((left, right) => right.contract.updatedAt.localeCompare(left.contract.updatedAt));
}

function contractHasReleasedPayment(contract: ContractRecord, payments: PaymentRecord[]) {
  return payments.some(
    (payment) =>
      isCreditSpentPayment(payment) &&
      payment.clientId === contract.clientId &&
      payment.userId === contract.workerId &&
      payment.amount > 0,
  );
}

function CollaborationSummaryList({
  user,
  data,
  emptyMessage = "No collaboration history yet.",
}: {
  user: PortalUser;
  data: PortalData;
  emptyMessage?: string;
}) {
  const rows = collaborationSummariesForUser(user, data);
  const moneyLabel = isClientRole(user.role) ? "Paid" : "Earned";

  if (!rows.length) {
    return <div className="empty-state compact">{emptyMessage}</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Worked with</th>
            <th>{moneyLabel}</th>
            <th>Pay rate</th>
            <th>Contract</th>
            <th>Timeline</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ contract, otherUser, released }) => (
            <tr key={contract.id}>
              <td>
                <strong>{otherUser?.name || "Member"}</strong>
                <span className="table-subtext">{roleLabel(otherUser?.role || "bidder")}</span>
              </td>
              <td>{money(released)}</td>
              <td>
                <strong>{contractPayTerms(contract)}</strong>
                <span className="table-subtext">{contractPaymentStyleLabel(contract.paymentStyle)}</span>
              </td>
              <td>
                {contract.title}
                <span className="table-subtext">Contract ID: {contract.id}</span>
              </td>
              <td>
                {contractTimelineLabel(contract)}
                <span className={`badge ${contractStatusClass(contract.status)}`}>{contractStatusLabel(contract.status)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PostsView({
  data,
  busy,
  onAction,
  onMessageUser,
}: {
  data: PortalData;
  busy: boolean;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
  onMessageUser: (userId: string, relatedPostId?: string) => void;
}) {
  const currentUser = data.currentUser;
  const isSuperAdmin = isSuperAdminRole(currentUser.role);
  const balances = userCreditBalances(currentUser, data);
  const canPublish = currentUser.role === "bidder" || isClientRole(currentUser.role);
  const canAffordPost = balances.postCreditBalance >= postCreditCost || balances.moneyCreditBalance >= postCreditMoneyPrice;
  const [query, setQuery] = useState("");
  const [postAuthorFilter, setPostAuthorFilter] = useState("");
  const [postTypeFilter, setPostTypeFilter] = useState<"all" | PortalPost["type"]>("all");
  const [postStatusFilter, setPostStatusFilter] = useState<"all" | PostStatus>("all");
  const [bidRateMin, setBidRateMin] = useState("");
  const [bidRateMax, setBidRateMax] = useState("");
  const [bonusRateMin, setBonusRateMin] = useState("");
  const [bonusRateMax, setBonusRateMax] = useState("");
  const [minRatingFilter, setMinRatingFilter] = useState("0");
  const [minHiredCountFilter, setMinHiredCountFilter] = useState("");
  const [minClientAverageRateFilter, setMinClientAverageRateFilter] = useState("");
  const [minBidderEarningsFilter, setMinBidderEarningsFilter] = useState("");
  const [postLocationFilter, setPostLocationFilter] = useState("");
  const [postTimeZoneFilter, setPostTimeZoneFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PortalPost | null>(null);
  const [editingPost, setEditingPost] = useState<PortalPost | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    criteria: "",
    budgetAmount: "",
    preferredRate: "",
    bonusPerInterview: "",
    paymentFrequency: "weekly" as PaymentFrequency,
    paymentWeekday: "friday" as PaymentWeekday,
    });
  const posts = data.posts || [];
  const myPosts = posts.filter((post) => post.authorId === currentUser.id);
  const availablePostPool = posts
    .filter((post) => post.authorId !== currentUser.id)
    .filter((post) => isSuperAdmin || post.status === "active")
    .filter((post) => {
      if (isSuperAdmin) return true;
      if (isClientRole(currentUser.role)) return post.type === "bidder";
      if (currentUser.role === "bidder") return post.type === "client";
      return false;
    });
  const postAuthorOptions = data.users
    .filter((user) => availablePostPool.some((post) => post.authorId === user.id))
    .sort((left, right) => left.name.localeCompare(right.name));
  const postTimeZoneOptions = Array.from(
    new Set([
      ...timeZoneOptions,
      ...availablePostPool
        .map((post) => userById(data.users, post.authorId)?.profileTimeZone || "")
        .filter(Boolean),
    ]),
  ).sort();
  const postRateCeiling = Math.max(1, Math.ceil(Math.max(10, ...availablePostPool.map((post) => post.preferredRate || 0))));
  const postBonusCeiling = Math.max(1, Math.ceil(Math.max(10, ...availablePostPool.map((post) => post.bonusPerInterview || 0))));
  const bidRateMinValue = Math.min(Number(bidRateMin || 0), postRateCeiling);
  const bidRateMaxValue = Math.max(bidRateMinValue, Math.min(Number(bidRateMax || postRateCeiling), postRateCeiling));
  const bonusRateMinValue = Math.min(Number(bonusRateMin || 0), postBonusCeiling);
  const bonusRateMaxValue = Math.max(bonusRateMinValue, Math.min(Number(bonusRateMax || postBonusCeiling), postBonusCeiling));
  const minRatingValue = Math.min(5, Math.max(0, Number(minRatingFilter || 0)));
  const minHiredCountValue = Number(minHiredCountFilter || 0);
  const minClientAverageRateValue = Number(minClientAverageRateFilter || 0);
  const minBidderEarningsValue = Number(minBidderEarningsFilter || 0);
  const normalizedPostQuery = query.trim().toLowerCase();
  const availablePosts = availablePostPool.filter((post) => {
      const author = userById(data.users, post.authorId);
      const authorRating = ratingForUser(author);
      const authorHiredCount = author
        ? isClientRole(author.role)
          ? author.clientStats?.assignedBidderCount || 0
          : (data.contracts || []).filter((contract) => contract.workerId === author.id && ["active", "ended"].includes(contract.status)).length
        : 0;
      const authorClientAverageRate = author?.clientStats?.averageBidRate || 0;
      const authorBidderEarnings = author?.bidderStats?.totalEarned || 0;
      const authorLocationText = `${author?.country || ""} ${author?.profileLocation || ""}`.toLowerCase();
      const search = [
        post.id,
        post.title,
        post.criteria,
        post.status,
        postAudienceLabel(post),
        author?.name,
        author?.email,
        displayUserId(author),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalizedPostQuery || search.includes(normalizedPostQuery);
      const matchesAuthor = !postAuthorFilter || post.authorId === postAuthorFilter;
      const matchesType = postTypeFilter === "all" || post.type === postTypeFilter;
      const matchesStatus = postStatusFilter === "all" || post.status === postStatusFilter;
      const matchesBidRate = (!bidRateMin || (post.preferredRate || 0) >= bidRateMinValue) && (!bidRateMax || (post.preferredRate || 0) <= bidRateMaxValue);
      const matchesBonusRate = (!bonusRateMin || (post.bonusPerInterview || 0) >= bonusRateMinValue) && (!bonusRateMax || (post.bonusPerInterview || 0) <= bonusRateMaxValue);
      const matchesRating = authorRating >= minRatingValue;
      const matchesHiredCount = !minHiredCountFilter || authorHiredCount >= minHiredCountValue;
      const matchesClientAverageRate = !minClientAverageRateFilter || authorClientAverageRate >= minClientAverageRateValue;
      const matchesBidderEarnings = !minBidderEarningsFilter || authorBidderEarnings >= minBidderEarningsValue;
      const matchesLocation = !postLocationFilter.trim() || authorLocationText.includes(postLocationFilter.trim().toLowerCase());
      const matchesTimeZone = !postTimeZoneFilter || author?.profileTimeZone === postTimeZoneFilter;
      return (
        matchesQuery &&
        matchesAuthor &&
        matchesType &&
        matchesStatus &&
        matchesBidRate &&
        matchesBonusRate &&
        matchesRating &&
        matchesHiredCount &&
        matchesClientAverageRate &&
        matchesBidderEarnings &&
        matchesLocation &&
        matchesTimeZone
      );
    });
  const hasPostFilters = Boolean(
    query.trim() ||
    postAuthorFilter ||
    postTypeFilter !== "all" ||
    postStatusFilter !== "all" ||
    bidRateMin ||
    bidRateMax ||
    bonusRateMin ||
    bonusRateMax ||
    minRatingValue > 0 ||
    minHiredCountFilter ||
    minClientAverageRateFilter ||
    minBidderEarningsFilter ||
    postLocationFilter.trim() ||
    postTimeZoneFilter,
  );

  async function submitPost(event: FormEvent) {
    event.preventDefault();
    const nextData = await onAction("createPost", {
      title: draft.title,
      criteria: draft.criteria,
      budgetAmount: Number(draft.budgetAmount),
      preferredRate: Number(draft.preferredRate),
      bonusPerInterview: Number(draft.bonusPerInterview),
      paymentFrequency: draft.paymentFrequency,
      paymentWeekday: draft.paymentWeekday,
    });
    if (nextData) {
      setDraft({
        title: "",
        criteria: "",
        budgetAmount: "",
        preferredRate: "",
        bonusPerInterview: "",
        paymentFrequency: "weekly",
        paymentWeekday: "friday",
      });
      setShowCreateModal(false);
    }
  }

  async function setPostStatus(post: PortalPost, status: PostStatus) {
    const nextData = await onAction("updatePostStatus", { postId: post.id, status });
    if (nextData) {
      setSelectedPost(null);
    }
  }

  async function saveEditedPost(post: PortalPost, payload: Record<string, unknown>) {
    const nextData = await onAction("updatePost", { postId: post.id, ...payload });
    if (nextData) {
      setEditingPost(null);
      setSelectedPost(null);
    }
  }

  async function deletePost(post: PortalPost) {
    if (!window.confirm(`Delete post "${post.title}"? This removes it from marketplace moderation.`)) {
      return;
    }

    const nextData = await onAction("deletePost", { postId: post.id });
    if (nextData) {
      setEditingPost(null);
      setSelectedPost(null);
    }
  }

  async function startContractFromPost(post: PortalPost) {
    const author = userById(data.users, post.authorId);
    if (!author) {
      return;
    }

    const nextData = await onAction("createContract", {
      targetUserId: author.id,
      title: post.title,
      criteria: post.criteria,
      paymentStyle: post.bonusPerInterview ? "per_bid_bonus" : "per_bid",
      fixedBudget: 0,
      hourlyRate: 0,
      regularSalary: 0,
      ratePerApplication: post.preferredRate || author.ratePerApplication || 0,
      bonusPerInterview: post.bonusPerInterview || author.bonusPerInterview || 0,
      paymentFrequency: post.paymentFrequency || "weekly",
      paymentWeekday: post.paymentWeekday || "friday",
      nextPaymentDate: contractNextPaymentDateDefault(post.paymentFrequency || "weekly", post.paymentWeekday || "friday", today()),
      startDate: today(),
      endDate: "",
      sourcePostId: post.id,
    });
    if (nextData) {
      setSelectedPost(null);
    }
  }

  function canStartContractFromPost(post: PortalPost) {
    if (isSuperAdminRole(currentUser.role)) {
      return false;
    }
    return (isClientRole(currentUser.role) && post.type === "bidder") || (currentUser.role === "bidder" && post.type === "client");
  }

  function postActionItems(post: PortalPost): ActionMenuItem[] {
    const isOwner = post.authorId === currentUser.id;
    return [
      { label: "Review", onClick: () => setSelectedPost(post) },
      ...(isOwner || isSuperAdmin ? [{ label: "Edit", disabled: busy, onClick: () => setEditingPost(post) }] : []),
      ...(isOwner || isSuperAdmin
        ? [{
          label: post.status === "active" ? "Close" : "Reopen",
          disabled: busy,
          onClick: () => void setPostStatus(post, post.status === "active" ? "closed" : "active"),
        }]
        : []),
      ...(isOwner || isSuperAdmin ? [{ label: "Delete", danger: true, disabled: busy, onClick: () => void deletePost(post) }] : []),
    ];
  }

  return (
    <div className="dashboard-stack">
      {canPublish ? (
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Post Credit</h2>
            <p>Posts cost 1 post credit. If post credit is empty, money credit can cover it at $0.10 per post credit.</p>
          </div>
          <div className="actions">
            <span className="badge approved">1 credit per post</span>
            {canPublish ? (
              <button
                className="primary-button compact-button"
                type="button"
                disabled={busy || !canAffordPost}
                onClick={() => setShowCreateModal(true)}
              >
                Create post
              </button>
            ) : null}
          </div>
        </div>
        <CreditBalanceStrip balances={balances} />
      </section>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{isSuperAdmin ? "Post Moderation" : "Available Posts"}</h2>
            <p>{isSuperAdmin ? "Review every marketplace post, edit details, or delete posts." : isClientRole(currentUser.role) ? "Review bidder posts, start contracts, or close posts from the detail modal." : "All visible marketplace posts."}</p>
          </div>
        </div>
        <div className="filter-bar">
          <label className="field">
            <span>Search posts</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Post ID, title, criteria, author" />
          </label>
          <label className="field">
            <span>Author</span>
            <select value={postAuthorFilter} onChange={(event) => setPostAuthorFilter(event.target.value)}>
              <option value="">All authors</option>
              {postAuthorOptions.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name} - {displayUserId(author)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Post type</span>
            <select value={postTypeFilter} onChange={(event) => setPostTypeFilter(event.target.value as "all" | PortalPost["type"])}>
              <option value="all">All post types</option>
              <option value="client">Client posts</option>
              <option value="bidder">Bidder posts</option>
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={postStatusFilter} onChange={(event) => setPostStatusFilter(event.target.value as "all" | PostStatus)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label className="field range-field">
            <span>Bid rate range</span>
            <div className="range-pair">
              <input
                aria-label="Minimum bid rate"
                type="range"
                min="0"
                max={postRateCeiling}
                step="0.01"
                value={bidRateMinValue}
                onChange={(event) => setBidRateMin(String(Math.min(Number(event.target.value), bidRateMaxValue)))}
              />
              <input
                aria-label="Maximum bid rate"
                type="range"
                min="0"
                max={postRateCeiling}
                step="0.01"
                value={bidRateMaxValue}
                onChange={(event) => setBidRateMax(String(Math.max(Number(event.target.value), bidRateMinValue)))}
              />
            </div>
            <small className="range-value">{money(bidRateMinValue)} - {money(bidRateMaxValue)}</small>
          </label>
          <label className="field range-field">
            <span>Bonus rate range</span>
            <div className="range-pair">
              <input
                aria-label="Minimum bonus rate"
                type="range"
                min="0"
                max={postBonusCeiling}
                step="0.01"
                value={bonusRateMinValue}
                onChange={(event) => setBonusRateMin(String(Math.min(Number(event.target.value), bonusRateMaxValue)))}
              />
              <input
                aria-label="Maximum bonus rate"
                type="range"
                min="0"
                max={postBonusCeiling}
                step="0.01"
                value={bonusRateMaxValue}
                onChange={(event) => setBonusRateMax(String(Math.max(Number(event.target.value), bonusRateMinValue)))}
              />
            </div>
            <small className="range-value">{money(bonusRateMinValue)} - {money(bonusRateMaxValue)}</small>
          </label>
          <label className="field range-field">
            <span>Min review stars</span>
            <input
              aria-label="Minimum review stars"
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={minRatingValue}
              onChange={(event) => setMinRatingFilter(event.target.value)}
            />
            <small className="range-value">{minRatingValue.toFixed(1)} stars</small>
          </label>
          <label className="field">
            <span>Min hired count</span>
            <input type="number" min="0" value={minHiredCountFilter} onChange={(event) => setMinHiredCountFilter(event.target.value)} placeholder="Any" />
          </label>
          <label className="field">
            <span>Min client avg rate</span>
            <input type="number" min="0" step="0.01" value={minClientAverageRateFilter} onChange={(event) => setMinClientAverageRateFilter(event.target.value)} placeholder="Any" />
          </label>
          <label className="field">
            <span>Min bidder earnings</span>
            <input type="number" min="0" step="0.01" value={minBidderEarningsFilter} onChange={(event) => setMinBidderEarningsFilter(event.target.value)} placeholder="Any" />
          </label>
          <label className="field">
            <span>Location</span>
            <input value={postLocationFilter} onChange={(event) => setPostLocationFilter(event.target.value)} placeholder="Country or city" />
          </label>
          <label className="field">
            <span>Timezone</span>
            <select value={postTimeZoneFilter} onChange={(event) => setPostTimeZoneFilter(event.target.value)}>
              <option value="">All timezones</option>
              {postTimeZoneOptions.map((timeZone) => (
                <option key={timeZone} value={timeZone}>{timeZoneDisplay(timeZone)}</option>
              ))}
            </select>
          </label>
          <button
            className="ghost-button compact-button"
            type="button"
            disabled={!hasPostFilters}
            onClick={() => {
              setQuery("");
              setPostAuthorFilter("");
              setPostTypeFilter("all");
              setPostStatusFilter("all");
              setBidRateMin("");
              setBidRateMax("");
              setBonusRateMin("");
              setBonusRateMax("");
              setMinRatingFilter("0");
              setMinHiredCountFilter("");
              setMinClientAverageRateFilter("");
              setMinBidderEarningsFilter("");
              setPostLocationFilter("");
              setPostTimeZoneFilter("");
            }}
          >
            Clear filters
          </button>
        </div>
        <div className="table-toolbar">
          <span>Filter by user stats, rate ranges, stars, location, timezone, and post status.</span>
          <span>{availablePosts.length} of {availablePostPool.length} posts shown</span>
        </div>
        <PostTable
          posts={availablePosts}
          users={data.users}
          emptyMessage={hasPostFilters ? "No posts match these filters." : "No posts are available for this view."}
          onSelect={setSelectedPost}
          actionItemsForPost={postActionItems}
        />
      </section>

      {myPosts.length || canPublish ? (
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>My Posts</h2>
            <p>Your published posts and posting-credit usage.</p>
          </div>
        </div>
        <PostTable
          posts={myPosts}
          users={data.users}
          emptyMessage="No posts published yet."
          onSelect={setSelectedPost}
          actionItemsForPost={postActionItems}
        />
      </section>
      ) : null}

      {showCreateModal ? (
        <ModalFrame
          title="Create Post"
          subtitle={isClientRole(currentUser.role) ? "Client posts are visible to bidders." : "Bidder posts are visible to clients."}
          onClose={() => setShowCreateModal(false)}
        >
          <form className="form-grid" onSubmit={submitPost}>
            <label className="field">
              <span>Post title</span>
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="What you offer" required />
            </label>
            <label className="field">
              <span>Preferred rate</span>
              <input type="number" min="0" step="0.01" value={draft.preferredRate} onChange={(event) => setDraft({ ...draft, preferredRate: event.target.value })} placeholder="Per applied job" />
            </label>
            <label className="field">
              <span>Interview bonus</span>
              <input type="number" min="0" step="0.01" value={draft.bonusPerInterview} onChange={(event) => setDraft({ ...draft, bonusPerInterview: event.target.value })} placeholder="Per interview" />
            </label>
            <label className="field">
              <span>Frequency</span>
              <select value={draft.paymentFrequency} onChange={(event) => setDraft({ ...draft, paymentFrequency: event.target.value as PaymentFrequency })}>
                {paymentFrequencies.filter((frequency) => frequency.value).map((frequency) => (
                  <option key={frequency.value} value={frequency.value}>{frequency.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Weekday</span>
              <select value={draft.paymentWeekday} onChange={(event) => setDraft({ ...draft, paymentWeekday: event.target.value as PaymentWeekday })}>
                {paymentWeekdays.filter((weekday) => weekday.value).map((weekday) => (
                  <option key={weekday.value} value={weekday.value}>{weekday.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Post credit cost</span>
              <input value={`${postCreditCount(postCreditCost)} or ${money(postCreditMoneyPrice)} money credit`} readOnly />
            </label>
            <label className="field full">
              <span>Specific criteria</span>
              <textarea value={draft.criteria} onChange={(event) => setDraft({ ...draft, criteria: event.target.value })} placeholder="Describe your skills, availability, work expectations, and preferred client criteria." required />
            </label>
            <div className="actions full">
              <button className="primary-button" type="submit" disabled={busy || !canAffordPost}>
                Publish post
              </button>
            </div>
          </form>
        </ModalFrame>
      ) : null}

      {selectedPost ? (
        <PostReviewModal
          post={selectedPost}
          author={userById(data.users, selectedPost.authorId)}
          busy={busy}
          canStartContract={canStartContractFromPost(selectedPost)}
          canClosePost={isSuperAdmin || selectedPost.authorId === currentUser.id || (isClientRole(currentUser.role) && selectedPost.type === "bidder")}
          canEditPost={isSuperAdmin || selectedPost.authorId === currentUser.id}
          canDeletePost={isSuperAdmin || selectedPost.authorId === currentUser.id}
          onClose={() => setSelectedPost(null)}
          onMessage={(userId) => {
            setSelectedPost(null);
            onMessageUser(userId, selectedPost.id);
          }}
          onStartContract={() => startContractFromPost(selectedPost)}
          onClosePost={() => setPostStatus(selectedPost, "closed")}
          onEditPost={() => setEditingPost(selectedPost)}
          onDeletePost={() => deletePost(selectedPost)}
        />
      ) : null}

      {editingPost ? (
        <PostEditModal
          post={editingPost}
          busy={busy}
          onClose={() => setEditingPost(null)}
          onSave={(payload) => saveEditedPost(editingPost, payload)}
        />
      ) : null}
    </div>
  );
}

function PostTable({
  posts,
  users,
  emptyMessage,
  onSelect,
  actionItemsForPost,
}: {
  posts: PortalPost[];
  users: PortalUser[];
  emptyMessage: string;
  onSelect: (post: PortalPost) => void;
  actionItemsForPost?: (post: PortalPost) => ActionMenuItem[];
}) {
  if (!posts.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Post</th>
            <th>Author</th>
            <th>Audience</th>
            <th>Budget</th>
            <th>Rate</th>
            <th>Bonus</th>
            <th>Schedule</th>
            <th>Status</th>
            <th>Created</th>
            {actionItemsForPost ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => {
            const author = userById(users, post.authorId);
            const actionItems = actionItemsForPost?.(post) || [];
            return (
              <tr
                className="clickable-row"
                key={post.id}
                tabIndex={0}
                onClick={() => onSelect(post)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onSelect(post);
                  }
                }}
              >
                <td>
                  <strong>{post.title}</strong>
                  <span className="table-subtext">{post.criteria}</span>
                </td>
                <td>{author?.name || "Unknown"}</td>
                <td>{postAudienceLabel(post)}</td>
                <td>{money(post.budgetAmount || 0)}</td>
                <td>{money(post.preferredRate || 0)}</td>
                <td>{money(post.bonusPerInterview || 0)}</td>
                <td>{paymentScheduleLabel(post.paymentFrequency, post.paymentWeekday) || "Flexible"}</td>
                <td><span className={`badge ${post.status === "active" ? "approved" : "paused"}`}>{titleCase(post.status)}</span></td>
                <td>{dateTime(post.createdAt)}</td>
                {actionItemsForPost ? (
                  <td>
                    {actionItems.length ? <ActionMenu items={actionItems} /> : "-"}
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

function PostReviewModal({
  post,
  author,
  busy,
  canStartContract,
  canClosePost,
  canEditPost,
  canDeletePost,
  onClose,
  onMessage,
  onStartContract,
  onClosePost,
  onEditPost,
  onDeletePost,
}: {
  post: PortalPost;
  author?: PortalUser;
  busy: boolean;
  canStartContract: boolean;
  canClosePost: boolean;
  canEditPost: boolean;
  canDeletePost: boolean;
  onClose: () => void;
  onMessage: (userId: string, relatedPostId?: string) => void;
  onStartContract: () => void;
  onClosePost: () => void;
  onEditPost: () => void;
  onDeletePost: () => void;
}) {
  return (
    <ModalFrame title={post.title} subtitle={`${author?.name || "Unknown"} - ${postAudienceLabel(post)}`} className="client-detail-modal" onClose={onClose}>
      <div className="profile-detail-grid">
        <article className="profile-card">
          <h3>Post Details</h3>
          <p>{post.criteria}</p>
          <div className="mini-metrics">
            <span><strong>{money(post.preferredRate || 0)}</strong> rate</span>
            <span><strong>{money(post.bonusPerInterview || 0)}</strong> bonus</span>
            <span><strong>{paymentScheduleLabel(post.paymentFrequency, post.paymentWeekday) || "Flexible"}</strong> schedule</span>
            <span><strong>{titleCase(post.status)}</strong> status</span>
          </div>
        </article>
        <article className="profile-card">
          <h3>Author</h3>
          <strong>{author?.name || "Unknown member"}</strong>
          {author ? <RatingStars value={ratingForUser(author)} /> : null}
          <p>{author?.profileTitle || author?.email || "No profile details available."}</p>
          <div className="actions">
            {author && author.allowDirectMessages !== false ? (
              <button className="ghost-button compact-button" type="button" onClick={() => onMessage(author.id, post.id)}>
                Message
              </button>
            ) : null}
            {canStartContract ? (
              <button className="primary-button compact-button" type="button" disabled={busy} onClick={onStartContract}>
                Start contract
              </button>
            ) : null}
            {canClosePost && post.status === "active" ? (
              <button className="ghost-button compact-button" type="button" disabled={busy} onClick={onClosePost}>
                Close post
              </button>
            ) : null}
            {canEditPost ? (
              <button className="ghost-button compact-button" type="button" disabled={busy} onClick={onEditPost}>
                Edit post
              </button>
            ) : null}
            {canDeletePost ? (
              <button className="ghost-button danger compact-button" type="button" disabled={busy} onClick={onDeletePost}>
                Delete post
              </button>
            ) : null}
          </div>
        </article>
      </div>
    </ModalFrame>
  );
}

function PostEditModal({
  post,
  busy,
  onClose,
  onSave,
}: {
  post: PortalPost;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    title: post.title,
    criteria: post.criteria,
    budgetAmount: String(post.budgetAmount || 0),
    preferredRate: String(post.preferredRate || 0),
    bonusPerInterview: String(post.bonusPerInterview || 0),
    paymentFrequency: (post.paymentFrequency || "weekly") as PaymentFrequency,
    paymentWeekday: (post.paymentWeekday || "friday") as PaymentWeekday,
    status: post.status,
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({
      title: draft.title,
      criteria: draft.criteria,
      budgetAmount: Number(draft.budgetAmount),
      preferredRate: Number(draft.preferredRate),
      bonusPerInterview: Number(draft.bonusPerInterview),
      paymentFrequency: draft.paymentFrequency,
      paymentWeekday: draft.paymentWeekday,
      status: draft.status,
    });
  }

  return (
    <ModalFrame title="Edit Post" subtitle="Update post details and status." onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <label className="field full">
          <span>Post title</span>
          <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
        </label>
        <label className="field">
          <span>Budget</span>
          <input type="number" min="0" step="0.01" value={draft.budgetAmount} onChange={(event) => setDraft({ ...draft, budgetAmount: event.target.value })} />
        </label>
        <label className="field">
          <span>Preferred rate</span>
          <input type="number" min="0" step="0.01" value={draft.preferredRate} onChange={(event) => setDraft({ ...draft, preferredRate: event.target.value })} />
        </label>
        <label className="field">
          <span>Interview bonus</span>
          <input type="number" min="0" step="0.01" value={draft.bonusPerInterview} onChange={(event) => setDraft({ ...draft, bonusPerInterview: event.target.value })} />
        </label>
        <label className="field">
          <span>Status</span>
          <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as PostStatus })}>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label className="field">
          <span>Frequency</span>
          <select value={draft.paymentFrequency} onChange={(event) => setDraft({ ...draft, paymentFrequency: event.target.value as PaymentFrequency })}>
            {paymentFrequencies.filter((frequency) => frequency.value).map((frequency) => (
              <option key={frequency.value} value={frequency.value}>{frequency.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Weekday</span>
          <select value={draft.paymentWeekday} onChange={(event) => setDraft({ ...draft, paymentWeekday: event.target.value as PaymentWeekday })}>
            {paymentWeekdays.filter((weekday) => weekday.value).map((weekday) => (
              <option key={weekday.value} value={weekday.value}>{weekday.label}</option>
            ))}
          </select>
        </label>
        <label className="field full">
          <span>Specific criteria</span>
          <textarea value={draft.criteria} onChange={(event) => setDraft({ ...draft, criteria: event.target.value })} required />
        </label>
        <div className="actions full">
          <button className="primary-button" type="submit" disabled={busy}>
            Save post
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

function ContractsView({
  data,
  busy,
  onAction,
  onMessageUser,
}: {
  data: PortalData;
  busy: boolean;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
  onMessageUser: (userId: string) => void;
}) {
  const currentUser = data.currentUser;
  const canCreateContract = !isSuperAdminRole(currentUser.role) && (isClientRole(currentUser.role) || isWorkerUser(currentUser));
  const targets = isClientRole(currentUser.role)
    ? workerUsers(data.users)
    : clientUsers(data.users);
  const [draft, setDraft] = useState({
    targetUserPublicId: "",
    title: "",
    criteria: "",
    paymentStyle: "per_bid_bonus" as ContractPaymentStyle,
    fixedBudget: "",
    hourlyRate: "",
    regularSalary: "",
    ratePerApplication: "",
    bonusPerInterview: "",
    paymentFrequency: "weekly" as PaymentFrequency,
    paymentWeekday: "friday" as PaymentWeekday,
    nextPaymentDate: contractNextPaymentDateDefault("weekly", "friday", today()),
    startDate: today(),
    endDate: "",
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractRecord | null>(null);
  const [editingContract, setEditingContract] = useState<ContractRecord | null>(null);
  const [endingContract, setEndingContract] = useState<ContractRecord | null>(null);
  const [paydayContract, setPaydayContract] = useState<ContractRecord | null>(null);
  const [paydayDate, setPaydayDate] = useState("");
  const [contractQuery, setContractQuery] = useState("");
  const [contractStatusFilter, setContractStatusFilter] = useState<"all" | ContractStatus>("all");
  const [contractClientFilter, setContractClientFilter] = useState("");
  const [contractBidderFilter, setContractBidderFilter] = useState("");
  const contracts = isSuperAdminRole(currentUser.role)
    ? data.contracts || []
    : (data.contracts || []).filter((contract) => contract.clientId === currentUser.id || contract.workerId === currentUser.id);
  const contractClientOptions = data.users
    .filter((user) => contracts.some((contract) => contract.clientId === user.id))
    .sort((left, right) => userDisplayName(left).localeCompare(userDisplayName(right)));
  const contractBidderOptions = data.users
    .filter((user) => contracts.some((contract) => contract.workerId === user.id))
    .sort((left, right) => userDisplayName(left).localeCompare(userDisplayName(right)));
  const normalizedContractQuery = contractQuery.trim().toLowerCase();
  const filteredContracts = contracts.filter((contract) => {
    const client = userById(data.users, contract.clientId);
    const worker = userById(data.users, contract.workerId);
    const queryMatches = !normalizedContractQuery || [
      contract.id,
      contract.title,
      contract.criteria,
      contractStatusLabel(contract.status),
      contractPaymentStyleLabel(contract.paymentStyle),
      contractPayTerms(contract),
      paymentScheduleLabel(contract.paymentFrequency, contract.paymentWeekday),
      client?.name,
      client?.email,
      displayUserId(client),
      worker?.name,
      worker?.email,
      displayUserId(worker),
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedContractQuery));

    return (
      queryMatches &&
      (contractStatusFilter === "all" || contract.status === contractStatusFilter) &&
      (!contractClientFilter || contract.clientId === contractClientFilter) &&
      (!contractBidderFilter || contract.workerId === contractBidderFilter)
    );
  });
  const hasContractFilters = Boolean(
    contractQuery ||
    contractStatusFilter !== "all" ||
    contractClientFilter ||
    contractBidderFilter
  );
  const targetLabel = isClientRole(currentUser.role) ? "Bidder" : "Client";
  const matchedTarget = targets.find((target) => userIdMatches(target, draft.targetUserPublicId));

  async function submitContract(event: FormEvent) {
    event.preventDefault();
    const nextTargetPublicId = draft.targetUserPublicId.trim();
    const nextData = await onAction("createContract", {
      targetUserPublicId: nextTargetPublicId,
      targetUserId: matchedTarget?.id || "",
      title: draft.title,
      criteria: draft.criteria,
      paymentStyle: draft.paymentStyle,
      fixedBudget: Number(draft.fixedBudget),
      hourlyRate: Number(draft.hourlyRate),
      regularSalary: Number(draft.regularSalary),
      ratePerApplication: Number(draft.ratePerApplication),
      bonusPerInterview: Number(draft.bonusPerInterview),
      paymentFrequency: draft.paymentFrequency,
      paymentWeekday: draft.paymentWeekday,
      nextPaymentDate: draft.nextPaymentDate,
      startDate: draft.startDate,
      endDate: draft.endDate,
    });
    if (nextData) {
      setDraft({
        ...draft,
        targetUserPublicId: "",
        title: "",
        criteria: "",
        paymentStyle: "per_bid_bonus",
        fixedBudget: "",
        hourlyRate: "",
        regularSalary: "",
        ratePerApplication: "",
        bonusPerInterview: "",
        nextPaymentDate: contractNextPaymentDateDefault(draft.paymentFrequency, draft.paymentWeekday, draft.startDate),
        endDate: "",
      });
      setShowCreateModal(false);
    }
  }

  function updateContractScheduleDraft(updates: Partial<typeof draft>) {
    const nextDraft = { ...draft, ...updates };
    setDraft({
      ...nextDraft,
      nextPaymentDate: contractNextPaymentDateDefault(nextDraft.paymentFrequency, nextDraft.paymentWeekday, nextDraft.startDate),
    });
  }

  function contractCounterparty(contract: ContractRecord) {
    return currentUser.id === contract.clientId ? userById(data.users, contract.workerId) : userById(data.users, contract.clientId);
  }

  function canAcceptContract(contract: ContractRecord) {
    return contract.status === "requested" && (isSuperAdminRole(currentUser.role) || contract.requestedByUserId !== currentUser.id);
  }

  function canRejectContract(contract: ContractRecord) {
    return canAcceptContract(contract);
  }

  function canEndContract(contract: ContractRecord) {
    return contract.status === "active";
  }

  function canSetContractPayday(contract: ContractRecord) {
    return (isSuperAdminRole(currentUser.role) || currentUser.id === contract.clientId) && ["requested", "active"].includes(contract.status);
  }

  function canEditContract(contract: ContractRecord) {
    return canSetContractPayday(contract);
  }

  async function updateContract(contract: ContractRecord, status: "active" | "rejected" | "ended", payload: Record<string, unknown> = {}) {
    const nextData = await onAction("updateContractStatus", { contractId: contract.id, status, ...payload });
    if (nextData) {
      setSelectedContract(null);
      if (status === "ended") {
        setEndingContract(null);
      }
    }
  }

  function openEndContractModal(contract: ContractRecord) {
    setSelectedContract(null);
    setEndingContract(contract);
  }

  function contractActionItems(contract: ContractRecord): ActionMenuItem[] {
    const counterparty = contractCounterparty(contract);
    return [
      ...(!isSuperAdminRole(currentUser.role) && counterparty?.allowDirectMessages !== false
        ? [{ label: "Message", onClick: () => {
          if (counterparty) {
            setSelectedContract(null);
            onMessageUser(counterparty.id);
          }
        } }]
        : []),
      ...(canAcceptContract(contract)
        ? [{ label: "Accept", disabled: busy, onClick: () => void updateContract(contract, "active") }]
        : []),
      ...(canEditContract(contract)
        ? [{ label: "Edit", disabled: busy, onClick: () => {
          setSelectedContract(null);
          setEditingContract(contract);
        } }]
        : []),
      ...(canSetContractPayday(contract)
        ? [{ label: "Set payday", disabled: busy, onClick: () => openPaydayModal(contract) }]
        : []),
      ...(canRejectContract(contract)
        ? [{ label: "Reject", disabled: busy, onClick: () => void updateContract(contract, "rejected") }]
        : []),
      ...(canEndContract(contract)
        ? [{ label: "End contract", disabled: busy, onClick: () => openEndContractModal(contract) }]
        : []),
    ];
  }

  function openPaydayModal(contract: ContractRecord) {
    setSelectedContract(null);
    setPaydayContract(contract);
    setPaydayDate(contract.nextPaymentDate || contractNextPaymentDateDefault(contract.paymentFrequency, contract.paymentWeekday, contract.startDate));
  }

  async function submitPayday(event: FormEvent) {
    event.preventDefault();
    if (!paydayContract) {
      return;
    }

    const nextData = await onAction("updateContractPayday", {
      contractId: paydayContract.id,
      nextPaymentDate: paydayDate,
    });
    if (nextData) {
      setPaydayContract(null);
      setPaydayDate("");
    }
  }

  return (
    <div className="dashboard-stack">
      {canCreateContract ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Start Contract</h2>
              <p>Create a client-bidder request with specific criteria, rate, bonus, and payment schedule.</p>
            </div>
            <button className="primary-button compact-button" type="button" disabled={busy || !targets.length} onClick={() => setShowCreateModal(true)}>
              Start contract
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Contract Management</h2>
            <p>Requested, active, rejected, and ended contracts between clients and bidders.</p>
          </div>
          <span className="badge">{filteredContracts.length} of {contracts.length} contracts</span>
        </div>
        <div className="filter-bar">
          <label className="field">
            <span>Search contracts</span>
            <input value={contractQuery} onChange={(event) => setContractQuery(event.target.value)} placeholder="Contract ID, title, client, bidder" />
          </label>
          <label className="field">
            <span>Client</span>
            <select value={contractClientFilter} onChange={(event) => setContractClientFilter(event.target.value)}>
              <option value="">All clients</option>
              {contractClientOptions.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} - {displayUserId(client)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Bidder</span>
            <select value={contractBidderFilter} onChange={(event) => setContractBidderFilter(event.target.value)}>
              <option value="">All bidders</option>
              {contractBidderOptions.map((bidder) => (
                <option key={bidder.id} value={bidder.id}>
                  {bidder.name} - {displayUserId(bidder)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={contractStatusFilter} onChange={(event) => setContractStatusFilter(event.target.value as "all" | ContractStatus)}>
              <option value="all">All statuses</option>
              <option value="requested">Requested</option>
              <option value="active">Active</option>
              <option value="rejected">Rejected</option>
              <option value="ended">Ended</option>
            </select>
          </label>
          <button
            className="ghost-button compact-button"
            type="button"
            disabled={!hasContractFilters}
            onClick={() => {
              setContractQuery("");
              setContractStatusFilter("all");
              setContractClientFilter("");
              setContractBidderFilter("");
            }}
          >
            Clear filters
          </button>
        </div>
        <div className="table-toolbar">
          <span>Search by contract ID, client, bidder, title, criteria, or payment terms.</span>
          <span>{filteredContracts.length} shown</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Contract ID</th>
                <th>Contract</th>
                <th>Client</th>
                <th>Bidder</th>
                <th>Status</th>
                <th>Payment terms</th>
                <th>Schedule</th>
                <th>Timeline</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((contract) => {
                const client = userById(data.users, contract.clientId);
                const worker = userById(data.users, contract.workerId);
                return (
                  <tr
                    className="clickable-row"
                    key={contract.id}
                    tabIndex={0}
                    onClick={() => setSelectedContract(contract)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        setSelectedContract(contract);
                      }
                    }}
                  >
                    <td><span className="table-subtext">{contract.id}</span></td>
                    <td>
                      <strong>{contract.title}</strong>
                      <span className="table-subtext">{contract.criteria || "No criteria"}</span>
                    </td>
                    <td>{client?.name || "Client"}</td>
                    <td>{worker?.name || "Bidder"}</td>
                    <td><span className={`badge ${contractStatusClass(contract.status)}`}>{contractStatusLabel(contract.status)}</span></td>
                    <td>
                      <strong>{contractPayTerms(contract)}</strong>
                      <span className="table-subtext">{contractPaymentStyleLabel(contract.paymentStyle)}</span>
                    </td>
                    <td>
                      {paymentScheduleLabel(contract.paymentFrequency, contract.paymentWeekday) || "Not set"}
                      <span className="table-subtext">Next {shortDate(contract.nextPaymentDate)}</span>
                    </td>
                    <td>{contractTimelineLabel(contract)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!contracts.length ? <div className="empty-state">No contracts yet.</div> : null}
        {contracts.length && !filteredContracts.length ? <div className="empty-state">No contracts match these filters.</div> : null}
      </section>
      {selectedContract ? (
        <ContractDetailModal
          contract={selectedContract}
          client={userById(data.users, selectedContract.clientId)}
          worker={userById(data.users, selectedContract.workerId)}
          requester={userById(data.users, selectedContract.requestedByUserId)}
          endedBy={userById(data.users, selectedContract.endedByUserId || "") || (currentUser.id === selectedContract.endedByUserId ? currentUser : null)}
          currentUser={currentUser}
          assignedBidProfiles={(data.bidProfiles || []).filter(
            (profile) => profile.clientId === selectedContract.clientId && (profile.assignedBidderIds || []).includes(selectedContract.workerId)
          )}
          actions={contractActionItems(selectedContract)}
          onClose={() => setSelectedContract(null)}
        />
      ) : null}
      {endingContract ? (
        <ContractEndModal
          contract={endingContract}
          client={userById(data.users, endingContract.clientId)}
          worker={userById(data.users, endingContract.workerId)}
          paidBeforeEnding={contractHasReleasedPayment(endingContract, data.payments || [])}
          busy={busy}
          onClose={() => setEndingContract(null)}
          onSubmit={(payload) => updateContract(endingContract, "ended", payload)}
        />
      ) : null}
      {showCreateModal ? (
        <ModalFrame title="Start Contract" subtitle={`Send a contract request by entering the ${targetLabel.toLowerCase()}'s User ID.`} onClose={() => setShowCreateModal(false)}>
          <form className="form-grid" onSubmit={submitContract}>
            <label className="field">
              <span>{targetLabel} User ID</span>
              <input
                list="contract-target-user-ids"
                value={draft.targetUserPublicId}
                onChange={(event) => setDraft({ ...draft, targetUserPublicId: event.target.value })}
                placeholder="BP-7K2M9Q"
                autoComplete="off"
                required
              />
              <datalist id="contract-target-user-ids">
                {targets.map((target) => (
                  <option key={target.id} value={displayUserId(target)}>
                    {target.name} - {roleLabel(target.role)}
                  </option>
                ))}
              </datalist>
              <span className="table-subtext">
                {matchedTarget
                  ? `Matched ${matchedTarget.name} - ${roleLabel(matchedTarget.role)}`
                  : draft.targetUserPublicId.trim()
                    ? "No exact User ID match yet."
                    : `Enter the short User ID shown on the ${targetLabel.toLowerCase()} profile.`}
              </span>
            </label>
            <label className="field">
              <span>Contract title</span>
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Weekly bidder support" required />
            </label>
            <ContractPaymentFields draft={draft} onChange={(updates) => setDraft({ ...draft, ...updates })} />
            <label className="field">
              <span>Frequency</span>
              <select value={draft.paymentFrequency} onChange={(event) => updateContractScheduleDraft({ paymentFrequency: event.target.value as PaymentFrequency })}>
                {paymentFrequencies.filter((frequency) => frequency.value).map((frequency) => (
                  <option key={frequency.value} value={frequency.value}>{frequency.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Weekday</span>
              <select value={draft.paymentWeekday} onChange={(event) => updateContractScheduleDraft({ paymentWeekday: event.target.value as PaymentWeekday })}>
                {paymentWeekdays.filter((weekday) => weekday.value).map((weekday) => (
                  <option key={weekday.value} value={weekday.value}>{weekday.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Next payday</span>
              <input type="date" value={draft.nextPaymentDate} onChange={(event) => setDraft({ ...draft, nextPaymentDate: event.target.value })} required />
            </label>
            <label className="field">
              <span>Start date</span>
              <input type="date" value={draft.startDate} onChange={(event) => updateContractScheduleDraft({ startDate: event.target.value })} />
            </label>
            <label className="field">
              <span>End date</span>
              <input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} />
            </label>
            <label className="field full">
              <span>Specific criteria</span>
              <textarea value={draft.criteria} onChange={(event) => setDraft({ ...draft, criteria: event.target.value })} placeholder="Define the work, required logs, reporting cadence, target jobs, and acceptance criteria." required />
            </label>
            <div className="actions full">
              <button className="primary-button" type="submit" disabled={busy || !targets.length || !draft.targetUserPublicId.trim()}>
                Send contract request
              </button>
            </div>
          </form>
        </ModalFrame>
      ) : null}
      {editingContract ? (
        <ContractEditModal
          contract={editingContract}
          busy={busy}
          onClose={() => setEditingContract(null)}
          onSave={async (payload) => {
            const nextData = await onAction("updateContract", payload);
            if (nextData) {
              setEditingContract(null);
            }
          }}
        />
      ) : null}
      {paydayContract ? (
        <ModalFrame title="Set Next Payday" subtitle={paydayContract.title} onClose={() => setPaydayContract(null)}>
          <form className="form-grid" onSubmit={submitPayday}>
            <label className="field full">
              <span>Next payday</span>
              <input type="date" value={paydayDate} onChange={(event) => setPaydayDate(event.target.value)} required />
            </label>
            <div className="actions full">
              <button className="primary-button" type="submit" disabled={busy || !paydayDate}>
                Save next payday
              </button>
              <button className="ghost-button" type="button" onClick={() => setPaydayContract(null)}>
                Cancel
              </button>
            </div>
          </form>
        </ModalFrame>
      ) : null}
    </div>
  );
}

function ContractEndModal({
  contract,
  client,
  worker,
  paidBeforeEnding,
  busy,
  onClose,
  onSubmit,
}: {
  contract: ContractRecord;
  client?: PortalUser | null;
  worker?: PortalUser | null;
  paidBeforeEnding: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    endType: "completed",
    endFeedback: "",
    endReason: "",
  });
  const requiredNote = paidBeforeEnding ? draft.endFeedback.trim() : draft.endReason.trim();

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({
      endType: draft.endType,
      endFeedback: paidBeforeEnding ? draft.endFeedback : "",
      endReason: paidBeforeEnding ? "" : draft.endReason,
    });
  }

  return (
    <ModalFrame
      title="End Contract"
      subtitle={`${contract.title} between ${client?.name || "Client"} and ${worker?.name || "Bidder"}`}
      onClose={onClose}
    >
      <form className="form-grid" onSubmit={submit}>
        <DismissibleNotice id={`contract-end-${paidBeforeEnding ? "paid" : "unpaid"}-guidance`} className="compact full">
          {paidBeforeEnding
            ? "A payment was released for this contract pair. Add a short work-feedback note before ending."
            : "No released payment was found for this contract pair. Select the end result and add the reason."}
        </DismissibleNotice>
        <label className="field">
          <span>End result</span>
          <select value={draft.endType} onChange={(event) => setDraft({ ...draft, endType: event.target.value })}>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="field">
          <span>Payment state</span>
          <input value={paidBeforeEnding ? "Paid before ending" : "Not paid before ending"} readOnly />
        </label>
        {paidBeforeEnding ? (
          <label className="field full">
            <span>How did the work go?</span>
            <textarea
              value={draft.endFeedback}
              onChange={(event) => setDraft({ ...draft, endFeedback: event.target.value })}
              placeholder="Summarize how the work went. This is saved on the contract only."
              required
            />
          </label>
        ) : (
          <label className="field full">
            <span>Reason</span>
            <textarea
              value={draft.endReason}
              onChange={(event) => setDraft({ ...draft, endReason: event.target.value })}
              placeholder="Explain why this unpaid contract is being completed or cancelled."
              required
            />
          </label>
        )}
        <p className="muted full">This note does not rate the bidder or client and does not change profile stars.</p>
        <div className="actions full">
          <button className="primary-button" type="submit" disabled={busy || !requiredNote}>
            End contract
          </button>
          <button className="ghost-button" type="button" onClick={onClose}>
            Keep contract active
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

function ContractDetailModal({
  contract,
  client,
  worker,
  requester,
  endedBy,
  currentUser,
  assignedBidProfiles,
  actions,
  onClose,
}: {
  contract: ContractRecord;
  client?: PortalUser | null;
  worker?: PortalUser | null;
  requester?: PortalUser | null;
  endedBy?: PortalUser | null;
  currentUser: PortalUser;
  assignedBidProfiles: BidProfileRecord[];
  actions: ActionMenuItem[];
  onClose: () => void;
}) {
  const connectedClientBalances = currentUser.id === worker?.id ? client?.creditBalances : null;
  const [selectedBidProfile, setSelectedBidProfile] = useState<BidProfileRecord | null>(null);
  const assignedProfileNames = worker?.name ? [worker.name] : [];

  return (
    <ModalFrame title="Contract Details" subtitle={contract.title} onClose={onClose}>
      <div className="detail-stack">
        <div className="status-strip compact">
          Contract ID: {contract.id}
        </div>
        <div className="profile-grid">
          <div className="metric">
            <span>Client</span>
            <strong>{client?.name || "Client"}</strong>
          </div>
          <div className="metric">
            <span>Bidder</span>
            <strong>{worker?.name || "Bidder"}</strong>
          </div>
          <div className="metric">
            <span>Status</span>
            <strong>{contractStatusLabel(contract.status)}</strong>
          </div>
          <div className="metric">
            <span>Requested by</span>
            <strong>{requester?.name || "Unknown"}</strong>
          </div>
        </div>
        <div className="mini-metrics">
          <span><strong>{contractPaymentStyleLabel(contract.paymentStyle)}</strong> style</span>
          <span><strong>{contractPayTerms(contract)}</strong> pay terms</span>
          <span><strong>{paymentScheduleLabel(contract.paymentFrequency, contract.paymentWeekday) || "Not set"}</strong> schedule</span>
          <span><strong>{shortDate(contract.nextPaymentDate)}</strong> next payday</span>
          <span><strong>{contractTimelineLabel(contract)}</strong> timeline</span>
        </div>
        <section className="detail-section">
          <h3>Criteria</h3>
          <p>{contract.criteria || "No criteria added."}</p>
        </section>
        {contract.status === "ended" ? (
          <section className="detail-section">
            <h3>End Summary</h3>
            <div className="mini-metrics">
              <span><strong>{titleCase(contract.endType || "completed")}</strong> result</span>
              <span><strong>{contract.paidBeforeEnding ? "Paid" : "Not paid"}</strong> payment state</span>
              <span><strong>{endedBy?.name || "Unknown"}</strong> ended by</span>
            </div>
            {contract.endFeedback ? <p><strong>Work feedback:</strong> {contract.endFeedback}</p> : null}
            {contract.endReason ? <p><strong>Reason:</strong> {contract.endReason}</p> : null}
            <p className="muted">End notes are saved on this contract only and do not affect bidder or client ratings.</p>
          </section>
        ) : null}
        {assignedBidProfiles.length ? (
          <section className="detail-section">
            <h3>Assigned Bid Profile</h3>
            <div className="bid-profile-mini-list">
              {assignedBidProfiles.map((profile) => (
                <BidProfileCard
                  key={profile.id}
                  profile={profile}
                  assignedNames={assignedProfileNames}
                  onOpen={() => setSelectedBidProfile(profile)}
                />
              ))}
            </div>
          </section>
        ) : null}
        <p className="muted">
          Created {dateTime(contract.createdAt)}
          {contract.acceptedAt ? ` - accepted ${dateTime(contract.acceptedAt)}` : ""}
        </p>
        {connectedClientBalances ? (
          <div className="connected-credit">
            <strong>Connected client credit</strong>
            <CreditBalanceStrip balances={connectedClientBalances} />
          </div>
        ) : null}
        <div className="actions">
          {actions.length ? actions.map((item) => (
            <button
              className={item.danger ? "ghost-button danger" : "ghost-button"}
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={item.onClick}
            >
              {item.label}
            </button>
          )) : <span className="muted">No actions available.</span>}
        </div>
      </div>
      {selectedBidProfile ? (
        <BidProfileDetailModal
          profile={selectedBidProfile}
          assignedNames={assignedProfileNames}
          onClose={() => setSelectedBidProfile(null)}
        />
      ) : null}
    </ModalFrame>
  );
}

function ContractEditModal({
  contract,
  busy,
  onClose,
  onSave,
}: {
  contract: ContractRecord;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    title: contract.title,
    criteria: contract.criteria,
    paymentStyle: normalizeContractPaymentStyle(contract.paymentStyle),
    fixedBudget: String(contract.fixedBudget || 0),
    hourlyRate: String(contract.hourlyRate || 0),
    regularSalary: String(contract.regularSalary || 0),
    ratePerApplication: String(contract.ratePerApplication || 0),
    bonusPerInterview: String(contract.bonusPerInterview || 0),
    paymentFrequency: (contract.paymentFrequency || "weekly") as PaymentFrequency,
    paymentWeekday: (contract.paymentWeekday || "friday") as PaymentWeekday,
    nextPaymentDate: contract.nextPaymentDate || contractNextPaymentDateDefault(contract.paymentFrequency, contract.paymentWeekday, contract.startDate),
    startDate: contract.startDate || today(),
    endDate: contract.endDate || "",
  });

  function updateSchedule(updates: Partial<typeof draft>) {
    const nextDraft = { ...draft, ...updates };
    setDraft({
      ...nextDraft,
      nextPaymentDate: updates.nextPaymentDate ?? contractNextPaymentDateDefault(nextDraft.paymentFrequency, nextDraft.paymentWeekday, nextDraft.startDate),
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({
      contractId: contract.id,
      title: draft.title,
      criteria: draft.criteria,
      paymentStyle: draft.paymentStyle,
      fixedBudget: Number(draft.fixedBudget),
      hourlyRate: Number(draft.hourlyRate),
      regularSalary: Number(draft.regularSalary),
      ratePerApplication: Number(draft.ratePerApplication),
      bonusPerInterview: Number(draft.bonusPerInterview),
      paymentFrequency: draft.paymentFrequency,
      paymentWeekday: draft.paymentWeekday,
      nextPaymentDate: draft.nextPaymentDate,
      startDate: draft.startDate,
      endDate: draft.endDate,
    });
  }

  return (
    <ModalFrame title="Edit Contract" subtitle="Update criteria, payment terms, schedule, and contract timeline." onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <label className="field">
          <span>Contract title</span>
          <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
        </label>
        <ContractPaymentFields draft={draft} onChange={(updates) => setDraft({ ...draft, ...updates })} />
        <label className="field">
          <span>Frequency</span>
          <select value={draft.paymentFrequency} onChange={(event) => updateSchedule({ paymentFrequency: event.target.value as PaymentFrequency })}>
            {paymentFrequencies.filter((frequency) => frequency.value).map((frequency) => (
              <option key={frequency.value} value={frequency.value}>{frequency.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Weekday</span>
          <select value={draft.paymentWeekday} onChange={(event) => updateSchedule({ paymentWeekday: event.target.value as PaymentWeekday })}>
            {paymentWeekdays.filter((weekday) => weekday.value).map((weekday) => (
              <option key={weekday.value} value={weekday.value}>{weekday.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Next payday</span>
          <input type="date" value={draft.nextPaymentDate} onChange={(event) => updateSchedule({ nextPaymentDate: event.target.value })} required />
        </label>
        <label className="field">
          <span>Start date</span>
          <input type="date" value={draft.startDate} onChange={(event) => updateSchedule({ startDate: event.target.value })} />
        </label>
        <label className="field">
          <span>End date</span>
          <input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} />
        </label>
        <label className="field full">
          <span>Specific criteria</span>
          <textarea value={draft.criteria} onChange={(event) => setDraft({ ...draft, criteria: event.target.value })} required />
        </label>
        <div className="actions full">
          <button className="primary-button" type="submit" disabled={busy}>
            Save contract
          </button>
          <button className="ghost-button" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

function disputeStatusClass(status: string) {
  if (status === "resolved") return "approved";
  if (status === "closed") return "paused";
  if (status === "reviewing") return "pending";
  return "bidder";
}

function DisputesView({
  data,
  busy,
  onAction,
}: {
  data: PortalData;
  busy: boolean;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const currentUser = data.currentUser;
  const canCreateDispute = isClientRole(currentUser.role);
  const canResolveDisputes = isSuperAdminRole(currentUser.role);
  const clientWorkers = data.users.filter((user) => isWorkerUser(user) && user.assignedAdminId === currentUser.id);
  const clientPayments = data.payments.filter((payment) => payment.clientId === currentUser.id);
  const clientContracts = data.contracts.filter((contract) => contract.clientId === currentUser.id);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<DisputeRecord | null>(null);
  const [editingDispute, setEditingDispute] = useState<DisputeRecord | null>(null);
  const [draft, setDraft] = useState({
    targetUserId: clientWorkers[0]?.id || "",
    contractId: "",
    paymentId: "",
    subject: "",
    body: "",
  });
  const [resolutionDraft, setResolutionDraft] = useState({
    status: "reviewing" as DisputeStatus,
    resolution: "",
    winnerUserId: "",
  });
  const [disputeQuery, setDisputeQuery] = useState("");
  const [disputeClientFilter, setDisputeClientFilter] = useState("");
  const [disputeBidderFilter, setDisputeBidderFilter] = useState("");
  const [disputeStatusFilter, setDisputeStatusFilter] = useState<"all" | DisputeStatus>("all");
  const [disputeContractFilter, setDisputeContractFilter] = useState("");
  const disputes = data.disputes || [];
  const disputeClientOptions = data.users
    .filter((user) => disputes.some((dispute) => dispute.clientId === user.id))
    .sort((left, right) => left.name.localeCompare(right.name));
  const disputeBidderOptions = data.users
    .filter((user) => disputes.some((dispute) => dispute.targetUserId === user.id))
    .sort((left, right) => left.name.localeCompare(right.name));
  const disputeContractOptions = data.contracts
    .filter((contract) => disputes.some((dispute) => dispute.contractId === contract.id))
    .sort((left, right) => left.title.localeCompare(right.title));
  const normalizedDisputeQuery = disputeQuery.trim().toLowerCase();
  const filteredDisputes = disputes.filter((dispute) => {
    const client = userById(data.users, dispute.clientId);
    const target = userById(data.users, dispute.targetUserId);
    const contract = data.contracts.find((item) => item.id === dispute.contractId);
    const payment = data.payments.find((item) => item.id === dispute.paymentId);
    const search = [
      dispute.id,
      dispute.subject,
      dispute.body,
      dispute.status,
      dispute.resolution,
      userById(data.users, dispute.winnerUserId || "")?.name,
      client?.name,
      client?.email,
      displayUserId(client),
      target?.name,
      target?.email,
      displayUserId(target),
      contract?.id,
      contract?.title,
      contract?.criteria,
      payment?.id,
      payment ? money(payment.amount) : "",
      payment?.scheduledDate,
      ...(dispute.updates || []).map((update) => update.body),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      (!normalizedDisputeQuery || search.includes(normalizedDisputeQuery)) &&
      (!disputeClientFilter || dispute.clientId === disputeClientFilter) &&
      (!disputeBidderFilter || dispute.targetUserId === disputeBidderFilter) &&
      (disputeStatusFilter === "all" || dispute.status === disputeStatusFilter) &&
      (!disputeContractFilter || dispute.contractId === disputeContractFilter)
    );
  });
  const hasDisputeFilters = Boolean(disputeQuery.trim() || disputeClientFilter || disputeBidderFilter || disputeStatusFilter !== "all" || disputeContractFilter);

  async function submitDispute(event: FormEvent) {
    event.preventDefault();
    const nextData = await onAction("createDispute", draft);
    if (nextData) {
      setDraft({ targetUserId: clientWorkers[0]?.id || "", contractId: "", paymentId: "", subject: "", body: "" });
      setShowCreateModal(false);
    }
  }

  function startResolve(dispute: DisputeRecord) {
    setSelectedDispute(null);
    setEditingDispute(dispute);
    setResolutionDraft({
      status: dispute.status === "open" ? "reviewing" : dispute.status,
      resolution: dispute.resolution || "",
      winnerUserId: dispute.winnerUserId || "",
    });
  }

  async function submitResolution(event: FormEvent) {
    event.preventDefault();
    if (!editingDispute) {
      return;
    }

    const nextData = await onAction("updateDispute", {
      disputeId: editingDispute.id,
      status: resolutionDraft.status,
      resolution: resolutionDraft.resolution,
      winnerUserId: resolutionDraft.winnerUserId,
    });
    if (nextData) {
      setEditingDispute(null);
    }
  }

  async function addDisputeUpdate(dispute: DisputeRecord, payload: Record<string, unknown>) {
    const nextData = await onAction("addDisputeUpdate", { disputeId: dispute.id, ...payload });
    if (nextData) {
      setSelectedDispute(nextData.disputes.find((item) => item.id === dispute.id) || null);
    }
  }

  return (
    <div className="dashboard-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Dispute Resolution Center</h2>
            <p>{canCreateDispute ? "Open and track issues related to bidder work, contracts, or payments." : "Review and resolve client dispute requests."}</p>
          </div>
          {canCreateDispute ? (
            <button className="primary-button compact-button" type="button" onClick={() => setShowCreateModal(true)}>
              Open dispute
            </button>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Disputes</h2>
            <p>Resolution requests are tracked here with status and notes.</p>
          </div>
          <div className="actions">
            <span className="badge">{filteredDisputes.length} of {disputes.length} total</span>
          </div>
        </div>
        <div className="filter-bar">
          <label className="field">
            <span>Search disputes</span>
            <input value={disputeQuery} onChange={(event) => setDisputeQuery(event.target.value)} placeholder="Dispute ID, subject, client, bidder" />
          </label>
          <label className="field">
            <span>Client</span>
            <select value={disputeClientFilter} onChange={(event) => setDisputeClientFilter(event.target.value)}>
              <option value="">All clients</option>
              {disputeClientOptions.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} - {displayUserId(client)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Bidder</span>
            <select value={disputeBidderFilter} onChange={(event) => setDisputeBidderFilter(event.target.value)}>
              <option value="">All bidders</option>
              {disputeBidderOptions.map((bidder) => (
                <option key={bidder.id} value={bidder.id}>
                  {bidder.name} - {displayUserId(bidder)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={disputeStatusFilter} onChange={(event) => setDisputeStatusFilter(event.target.value as "all" | DisputeStatus)}>
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="reviewing">Reviewing</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label className="field">
            <span>Contract</span>
            <select value={disputeContractFilter} onChange={(event) => setDisputeContractFilter(event.target.value)}>
              <option value="">All contracts</option>
              {disputeContractOptions.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.title} - {contract.id}
                </option>
              ))}
            </select>
          </label>
          <button
            className="ghost-button compact-button"
            type="button"
            disabled={!hasDisputeFilters}
            onClick={() => {
              setDisputeQuery("");
              setDisputeClientFilter("");
              setDisputeBidderFilter("");
              setDisputeStatusFilter("all");
              setDisputeContractFilter("");
            }}
          >
            Clear filters
          </button>
        </div>
        <div className="table-toolbar">
          <span>Search by dispute ID, client, bidder, contract, payment, status, or notes.</span>
          <span>{filteredDisputes.length} disputes shown</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Client</th>
                <th>Bidder</th>
                <th>Contract</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Winner</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredDisputes.map((dispute) => {
                const client = userById(data.users, dispute.clientId);
                const target = userById(data.users, dispute.targetUserId);
                const winner = userById(data.users, dispute.winnerUserId || "");
                const contract = data.contracts.find((item) => item.id === dispute.contractId);
                const payment = data.payments.find((item) => item.id === dispute.paymentId);
                return (
                  <tr
                    className="clickable-row"
                    key={dispute.id}
                    tabIndex={0}
                    onClick={() => setSelectedDispute(dispute)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        setSelectedDispute(dispute);
                      }
                    }}
                  >
                    <td>
                      <strong>{dispute.subject}</strong>
                      <span className="table-subtext">{dispute.body}</span>
                    </td>
                    <td>{client?.name || "Unknown client"}</td>
                    <td>{target?.name || "-"}</td>
                    <td>{contract?.title || "-"}</td>
                    <td>{payment ? `${money(payment.amount)} - ${shortDate(payment.scheduledDate)}` : "-"}</td>
                    <td><span className={`badge ${disputeStatusClass(dispute.status)}`}>{titleCase(dispute.status)}</span></td>
                    <td>{winner?.name || "-"}</td>
                    <td>{dateTime(dispute.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!disputes.length ? <div className="empty-state">No disputes yet.</div> : null}
        {disputes.length && !filteredDisputes.length ? <div className="empty-state">No disputes match these filters.</div> : null}
      </section>

      {selectedDispute ? (
        <DisputeDetailModal
          dispute={selectedDispute}
          client={userById(data.users, selectedDispute.clientId)}
          target={userById(data.users, selectedDispute.targetUserId)}
          winner={userById(data.users, selectedDispute.winnerUserId || "")}
          contract={data.contracts.find((item) => item.id === selectedDispute.contractId)}
          payment={data.payments.find((item) => item.id === selectedDispute.paymentId)}
          busy={busy}
          canResolve={canResolveDisputes}
          onAddUpdate={(payload) => addDisputeUpdate(selectedDispute, payload)}
          onResolve={() => startResolve(selectedDispute)}
          onClose={() => setSelectedDispute(null)}
        />
      ) : null}

      {showCreateModal ? (
        <ModalFrame title="Open Dispute" subtitle="Describe the issue for super admin review." onClose={() => setShowCreateModal(false)}>
          <form className="form-grid" onSubmit={submitDispute}>
            <label className="field">
              <span>Bidder</span>
              <select value={draft.targetUserId} onChange={(event) => setDraft({ ...draft, targetUserId: event.target.value })}>
                <option value="">General issue</option>
                {clientWorkers.map((worker) => (
                  <option key={worker.id} value={worker.id}>{worker.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Contract</span>
              <select value={draft.contractId} onChange={(event) => setDraft({ ...draft, contractId: event.target.value })}>
                <option value="">No contract selected</option>
                {clientContracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>{contract.title}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Payment</span>
              <select value={draft.paymentId} onChange={(event) => setDraft({ ...draft, paymentId: event.target.value })}>
                <option value="">No payment selected</option>
                {clientPayments.map((payment) => {
                  const worker = userById(data.users, payment.userId);
                  return (
                    <option key={payment.id} value={payment.id}>
                      {worker?.name || "Bidder"} - {money(payment.amount)} - {shortDate(payment.scheduledDate)}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="field full">
              <span>Subject</span>
              <input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} required />
            </label>
            <label className="field full">
              <span>Details</span>
              <textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} required />
            </label>
            <div className="actions full">
              <button className="primary-button" type="submit" disabled={busy}>
                Submit dispute
              </button>
            </div>
          </form>
        </ModalFrame>
      ) : null}

      {editingDispute ? (
        <ModalFrame title="Resolve Dispute" subtitle={editingDispute.subject} onClose={() => setEditingDispute(null)}>
          <form className="form-grid" onSubmit={submitResolution}>
            <label className="field">
              <span>Status</span>
              <select
                value={resolutionDraft.status}
                onChange={(event) => {
                  const status = event.target.value as DisputeStatus;
                  setResolutionDraft({
                    ...resolutionDraft,
                    status,
                    winnerUserId: status === "resolved" ? resolutionDraft.winnerUserId : "",
                  });
                }}
              >
                <option value="open">Open</option>
                <option value="reviewing">Reviewing</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <label className="field">
              <span>Winner</span>
              <select
                value={resolutionDraft.winnerUserId}
                disabled={resolutionDraft.status !== "resolved"}
                required={resolutionDraft.status === "resolved"}
                onChange={(event) => setResolutionDraft({ ...resolutionDraft, winnerUserId: event.target.value })}
              >
                <option value="">{resolutionDraft.status === "resolved" ? "Select winner" : "Only required when resolved"}</option>
                <option value={editingDispute.clientId}>Client - {userById(data.users, editingDispute.clientId)?.name || "Client"}</option>
                {editingDispute.targetUserId ? (
                  <option value={editingDispute.targetUserId}>Bidder - {userById(data.users, editingDispute.targetUserId)?.name || "Bidder"}</option>
                ) : null}
              </select>
            </label>
            <label className="field full">
              <span>Resolution note</span>
              <textarea value={resolutionDraft.resolution} onChange={(event) => setResolutionDraft({ ...resolutionDraft, resolution: event.target.value })} />
            </label>
            <div className="actions full">
              <button className="primary-button" type="submit" disabled={busy || (resolutionDraft.status === "resolved" && !resolutionDraft.winnerUserId)}>
                Save resolution
              </button>
            </div>
          </form>
        </ModalFrame>
      ) : null}
    </div>
  );
}

function DisputeDetailModal({
  dispute,
  client,
  target,
  winner,
  contract,
  payment,
  busy,
  canResolve,
  onAddUpdate,
  onResolve,
  onClose,
}: {
  dispute: DisputeRecord;
  client?: PortalUser | null;
  target?: PortalUser | null;
  winner?: PortalUser | null;
  contract?: ContractRecord | null;
  payment?: PaymentRecord | null;
  busy: boolean;
  canResolve: boolean;
  onAddUpdate: (payload: Record<string, unknown>) => Promise<void>;
  onResolve: () => void;
  onClose: () => void;
}) {
  const [updateBody, setUpdateBody] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachmentDraft[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canAddUpdate = dispute.status !== "closed";

  async function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    setAttachmentError("");
    if (!files.length) {
      return;
    }

    const nextAttachments: ChatAttachmentDraft[] = [];
    for (const file of files) {
      if (file.size > maxChatAttachmentBytes) {
        setAttachmentError(`${file.name} is larger than ${formatBytes(maxChatAttachmentBytes)}.`);
        continue;
      }
      nextAttachments.push({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: await readFileAsDataUrl(file),
      });
    }

    setAttachments((currentAttachments) => [...currentAttachments, ...nextAttachments].slice(0, chatAttachmentLimit));
    event.target.value = "";
  }

  async function submitUpdate(event: FormEvent) {
    event.preventDefault();
    await onAddUpdate({
      body: updateBody,
      attachments,
    });
    setUpdateBody("");
    setAttachments([]);
    setAttachmentError("");
  }

  return (
    <ModalFrame title="Dispute Details" subtitle={dispute.subject} onClose={onClose}>
      <div className="detail-stack">
        <div className="profile-grid">
          <div className="metric">
            <span>Client</span>
            <strong>{client?.name || "Unknown client"}</strong>
          </div>
          <div className="metric">
            <span>Bidder</span>
            <strong>{target?.name || "-"}</strong>
          </div>
          <div className="metric">
            <span>Status</span>
            <strong>{titleCase(dispute.status)}</strong>
          </div>
          <div className="metric">
            <span>Winner</span>
            <strong>{winner?.name || (dispute.status === "resolved" ? "Not selected" : "-")}</strong>
          </div>
          <div className="metric">
            <span>Updated</span>
            <strong>{dateTime(dispute.updatedAt)}</strong>
          </div>
        </div>
        <div className="mini-metrics">
          <span><strong>{contract?.title || "-"}</strong> contract</span>
          <span><strong>{payment ? money(payment.amount) : "-"}</strong> payment</span>
          <span><strong>{payment ? shortDate(payment.scheduledDate) : "-"}</strong> payment date</span>
        </div>
        <section className="detail-section">
          <h3>Issue</h3>
          <p>{dispute.body}</p>
        </section>
        <section className="detail-section">
          <h3>Updates</h3>
          <div className="dispute-updates">
            <div className="dispute-update-row">
              <strong>{client?.name || "Client"}</strong>
              <span>{dateTime(dispute.createdAt)}</span>
              <p>{dispute.body}</p>
            </div>
            {(dispute.updates || []).map((update) => (
              <div className="dispute-update-row" key={update.id}>
                <strong>{update.authorName || roleLabel(update.authorRole)}</strong>
                <span>{dateTime(update.createdAt)}</span>
                {update.body ? <p>{update.body}</p> : null}
                <ChatAttachments attachments={update.attachments || []} />
              </div>
            ))}
            {!dispute.updates?.length ? <div className="empty-state compact">No follow-up updates yet.</div> : null}
          </div>
        </section>
        {canAddUpdate ? (
          <form className="form-grid" onSubmit={submitUpdate}>
            <label className="field full">
              <span>Add details or screenshots</span>
              <textarea value={updateBody} onChange={(event) => setUpdateBody(event.target.value)} placeholder="Add more details, context, or what needs to happen next." />
            </label>
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" onChange={handleAttachmentChange} hidden />
            {attachments.length ? (
              <div className="full attachment-preview-list">
                <ChatAttachments attachments={attachments} />
              </div>
            ) : null}
            {attachmentError ? <div className="error full">{attachmentError}</div> : null}
            <div className="actions full">
              <button className="ghost-button" type="button" onClick={() => fileInputRef.current?.click()}>
                Attach screenshots
              </button>
              <button className="primary-button" type="submit" disabled={busy || (!updateBody.trim() && !attachments.length)}>
                Add update
              </button>
            </div>
          </form>
        ) : (
          <div className="status-strip compact">Closed disputes cannot be updated.</div>
        )}
        <section className="detail-section">
          <h3>Resolution</h3>
          {dispute.status === "resolved" ? <p><strong>Winner:</strong> {winner?.name || "Not selected"}</p> : null}
          <p>{dispute.resolution || "No resolution note yet."}</p>
        </section>
        <div className="actions">
          {canResolve ? (
            <button className="primary-button compact-button" type="button" onClick={onResolve}>
              Resolve dispute
            </button>
          ) : null}
        </div>
      </div>
    </ModalFrame>
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
  const [creatingUser, setCreatingUser] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const canManageRoles = data.currentUser.role === "super_admin";
  const adminUsers = data.users.filter((user) => isClientRole(user.role) && isActiveAccount(user));
  const statusRank: Record<UserStatus, number> = {
    pending_review: 0,
    active: 1,
    temporarily_restricted: 2,
    suspended: 3,
    closed: 4,
  };
  const visibleUsers = (canManageRoles ? data.users : data.users.filter(isWorkerUser))
    .filter((user) => userMatchesSearch(user, query))
    .filter((user) => roleFilter === "all" || user.role === roleFilter)
    .filter((user) => statusFilter === "all" || normalizeAccountStatus(user.status) === statusFilter)
    .filter((user) => {
      if (assignmentFilter === "all") {
        return true;
      }
      if (!isWorkerUser(user)) {
        return assignmentFilter === "unassigned";
      }
      return assignmentFilter === "assigned" ? Boolean(user.assignedAdminId) : !user.assignedAdminId;
    })
    .sort((left, right) => {
      const statusDelta = statusRank[normalizeAccountStatus(left.status)] - statusRank[normalizeAccountStatus(right.status)];
      if (statusDelta) {
        return statusDelta;
      }
      return userDisplayName(left).localeCompare(userDisplayName(right));
    });
  const hasPeopleFilters = Boolean(query || roleFilter !== "all" || statusFilter !== "all" || assignmentFilter !== "all");

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
        <button className="primary-button compact-button" type="button" disabled={busy} onClick={() => setCreatingUser(true)}>
          Add person
        </button>
      </div>

      <div className="filter-bar">
        <label className="field">
          <span>Search people</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, user ID" />
        </label>
        <label className="field">
          <span>Role filter</span>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "all" | Role)}>
            <option value="all">All roles</option>
            {managedRoleOptions.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Status filter</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | UserStatus)}>
            <option value="all">All statuses</option>
            {accountStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Assignment</span>
          <select value={assignmentFilter} onChange={(event) => setAssignmentFilter(event.target.value as "all" | "assigned" | "unassigned")}>
            <option value="all">All users</option>
            <option value="assigned">Assigned bidders</option>
            <option value="unassigned">Free users</option>
          </select>
        </label>
        <button
          className="ghost-button compact-button"
          type="button"
          disabled={!hasPeopleFilters}
          onClick={() => {
            setQuery("");
            setRoleFilter("all");
            setStatusFilter("all");
            setAssignmentFilter("all");
          }}
        >
          Clear filters
        </button>
      </div>
      <div className="table-toolbar">
        <span>{visibleUsers.length} of {canManageRoles ? data.users.length : data.users.filter(isWorkerUser).length} users shown</span>
        <span>{data.users.filter((user) => normalizeAccountStatus(user.status) === "pending_review").length} pending review</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>User ID</th>
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
                  <TableMemberCell user={user} subtitle={user.email} />
                </td>
                <td><span className="table-subtext">{displayUserId(user)}</span></td>
                <td><span className={`badge ${user.role}`}>{roleLabel(user.role)}</span></td>
                <td><span className={`badge ${normalizeAccountStatus(user.status)}`}>{statusLabel(user.status)}</span></td>
                <td>{assignedClientName(data.users, user)}</td>
                <td>{user.passwordSet ? "Set" : "Not set"}</td>
                <td>{user.emailVerifiedAt ? "Verified" : "Not verified"}</td>
                <td>{optionalDateTime(user.passwordUpdatedAt)}</td>
                <td>
                  <ActionMenu
                    items={[
                      { label: "Edit", onClick: () => setEditingUser(user) },
                      {
                        label: "Move to pending review",
                        disabled: busy || normalizeAccountStatus(user.status) === "pending_review",
                        onClick: () => updateUser(user, { status: "pending_review" }),
                      },
                      {
                        label: "Activate",
                        disabled: busy || normalizeAccountStatus(user.status) === "active",
                        onClick: () => updateUser(user, { status: "active" }),
                      },
                      {
                        label: "Temporarily restrict",
                        disabled: busy || normalizeAccountStatus(user.status) === "temporarily_restricted",
                        onClick: () => updateUser(user, { status: "temporarily_restricted" }),
                      },
                      {
                        label: "Suspend",
                        disabled: busy || normalizeAccountStatus(user.status) === "suspended",
                        onClick: () => updateUser(user, { status: "suspended" }),
                      },
                      {
                        label: "Close",
                        disabled: busy || normalizeAccountStatus(user.status) === "closed",
                        onClick: () => updateUser(user, { status: "closed" }),
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
      {!visibleUsers.length ? <div className="empty-state compact">No people match this search.</div> : null}

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

      {creatingUser ? (
        <UserCreateModal
          admins={adminUsers}
          busy={busy}
          onClose={() => setCreatingUser(false)}
          onSave={async (payload) => {
            const nextData = await onSave("createUser", payload);
            if (nextData) {
              setCreatingUser(false);
            }
            return nextData;
          }}
        />
      ) : null}
    </section>
  );
}

function UserCreateModal({
  admins,
  busy,
  onClose,
  onSave,
}: {
  admins: PortalUser[];
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    role: "bidder" as Role,
    status: "pending_review" as UserStatus,
    assignedAdminId: "",
    password: "",
    emailVerified: false,
    sendVerificationEmail: true,
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({
      name: draft.name,
      email: draft.email,
      role: draft.role,
      status: draft.status,
      assignedAdminId: draft.role === "bidder" ? draft.assignedAdminId : "",
      password: draft.password,
      emailVerified: draft.emailVerified,
      sendVerificationEmail: !draft.emailVerified && draft.sendVerificationEmail,
    });
  }

  return (
    <ModalFrame title="Add Person" subtitle="Create a portal account manually." onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <label className="field">
          <span>Name</span>
          <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Full name" required />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="name@example.com" required />
        </label>
        <label className="field">
          <span>Role</span>
          <select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as Role, assignedAdminId: "" })}>
            {managedRoleOptions.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as UserStatus })}>
            {accountStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </label>
        {draft.role === "bidder" ? (
          <label className="field">
            <span>Assigned client</span>
            <select value={draft.assignedAdminId} onChange={(event) => setDraft({ ...draft, assignedAdminId: event.target.value })}>
              <option value="">Unassigned</option>
              {admins.map((adminUser) => (
                <option key={adminUser.id} value={adminUser.id}>{adminUser.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="field">
          <span>Temporary password</span>
          <input
            type="password"
            value={draft.password}
            minLength={8}
            onChange={(event) => setDraft({ ...draft, password: event.target.value })}
            placeholder="At least 8 characters"
            required
          />
        </label>
        <label className="checkbox-row full">
          <input
            type="checkbox"
            checked={draft.emailVerified}
            onChange={(event) => setDraft({ ...draft, emailVerified: event.target.checked })}
          />
          <span>Mark email verified</span>
        </label>
        {!draft.emailVerified ? (
          <label className="checkbox-row full">
            <input
              type="checkbox"
              checked={draft.sendVerificationEmail}
              onChange={(event) => setDraft({ ...draft, sendVerificationEmail: event.target.checked })}
            />
            <span>Send verification email</span>
          </label>
        ) : null}
        <div className="actions full">
          <button className="primary-button" type="submit" disabled={busy || draft.password.length < 8}>
            Add person
          </button>
        </div>
      </form>
    </ModalFrame>
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
    status: normalizeAccountStatus(user.status),
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
    <ModalFrame title="Edit User" subtitle={user.email} onClose={onClose}>
      <div className="account-meta">
        <span>Password: {user.passwordSet ? "Set" : "Not set"}</span>
        <span>Updated: {optionalDateTime(user.passwordUpdatedAt)}</span>
        <span>Email: {user.emailVerifiedAt ? "Verified" : "Not verified"}</span>
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
              {managedRoleOptions.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
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
              {accountStatusOptions.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
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
    </ModalFrame>
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
                  <td><span className={`badge ${normalizeAccountStatus(user.status)}`}>{statusLabel(user.status)}</span></td>
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
    <ModalFrame title="Edit Bidder Settings" subtitle={`${user.name} - ${user.email}`} onClose={onClose}>

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
    </ModalFrame>
  );
}

function BidderDashboard({ data }: { data: PortalData }) {
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: "", endDate: "" });
  const user = data.currentUser;
  const allLogs = workLogsForUser(user, data.workLogs);
  const userPayments = paymentsForUser(user, data.payments);
  const balances = userCreditBalances(user, data);
  const filteredLogs = filterWorkLogsByDate(allLogs, dateRange);
  const filteredEarningPayments = filterPaymentsByDate(userPayments.filter(isCreditSpentPayment), dateRange);
  const unpaidFilteredLogs = filteredLogs.filter((log) => !isWorkLogPaid(log, userPayments));
  const summary = workSummary(user, filteredLogs);
  const openEstimate = estimateForUser(user, unpaidFilteredLogs);
  const pendingWithdrawal = userPayments
    .filter((payment) => isWithdrawalPayment(payment) && payment.status === "processing")
    .reduce((total, payment) => total + payment.amount, 0);
  const earningsByDateClient = Array.from(
    filteredEarningPayments.reduce((map, payment) => {
      const date = payment.scheduledDate || payment.updatedAt?.slice(0, 10) || payment.createdAt?.slice(0, 10) || today();
      const clientName = userById(data.users, payment.clientId || "")?.name || "Client";
      const key = `${date}-${payment.clientId || "client"}`;
      const existing = map.get(key) || { id: key, date, clientName, amount: 0 };
      map.set(key, { ...existing, amount: existing.amount + payment.amount });
      return map;
    }, new Map<string, { id: string; date: string; clientName: string; amount: number }>())
      .values()
  ).sort((left, right) => right.date.localeCompare(left.date) || right.amount - left.amount);

  return (
    <div className="dashboard-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Wallet Balance</h2>
            <p>Your current money credit, post credit, and pending withdrawal.</p>
          </div>
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span>Money balance</span>
            <strong>{money(balances.moneyCreditBalance)}</strong>
          </div>
          <div className="metric">
            <span>Post credit</span>
            <strong>{postCreditCount(balances.postCreditBalance)}</strong>
          </div>
          <div className="metric">
            <span>Released earnings</span>
            <strong>{money(filteredEarningPayments.reduce((total, payment) => total + payment.amount, 0))}</strong>
          </div>
          <div className="metric">
            <span>Pending withdrawal</span>
            <strong>{money(pendingWithdrawal)}</strong>
          </div>
        </div>
      </section>

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
        <div className="panel-header">
          <div>
            <h2>Earnings Chart</h2>
            <p>Released money grouped by date and client.</p>
          </div>
        </div>
        <BidderEarningsChart rows={earningsByDateClient} />
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
          payments={userPayments}
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
    return <AdminWorkLogs data={data} busy={busy} onAction={onSave} />;
  }

  if (data.currentUser.role === "developer") {
    return (
      <DismissibleNotice id="developer-work-log-planned" className="compact developer-note">
        Developer work logging is planned for the next phase. Payment details and chat remain available.
      </DismissibleNotice>
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWorkLog, setEditingWorkLog] = useState<WorkLog | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: "", endDate: "" });
  const [selectedClientId, setSelectedClientId] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");

  const user = data.currentUser;
  const allLogs = workLogsForUser(user, data.workLogs);
  const userPayments = paymentsForUser(user, data.payments);
  const clientOptions = connectedClientsForWorker(user, data.users, data.contracts || [], data.payments || []);
  const clientFilteredLogs = selectedClientId === "all"
    ? allLogs
    : allLogs.filter((log) => {
      const relatedClientIds = clientIdsForWorkLog(log, data.contracts || [], data.payments || []);
      return relatedClientIds.length ? relatedClientIds.includes(selectedClientId) : user.assignedAdminId === selectedClientId;
    });
  const dateFilteredLogs = filterWorkLogsByDate(clientFilteredLogs, dateRange);
  const logs = dateFilteredLogs.filter((log) => {
    const paid = isWorkLogPaid(log, userPayments);
    if (paymentFilter === "paid") return paid;
    if (paymentFilter === "unpaid") return !paid;
    return true;
  });
  const summary = workSummary(user, logs);
  const unpaidSummary = workSummary(user, logs.filter((log) => !isWorkLogPaid(log, userPayments)));

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
      setShowCreateModal(false);
    }
  }

  async function deleteWorkLog(log: WorkLog) {
    if (!window.confirm("Delete this unpaid work log?")) {
      return;
    }

    await onSave("deleteWorkLog", { workLogId: log.id });
  }

  return (
    <div className="dashboard-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Work Logs</h2>
            <p>Add daily work, then review every paid and unpaid log by client and date.</p>
          </div>
          <button className="primary-button compact-button" type="button" disabled={busy} onClick={() => setShowCreateModal(true)}>
            Add work log
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Work Summary</h2>
            <p>Totals update from the filters below.</p>
          </div>
        </div>
        <div className="metric-grid">
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
            <span>Total estimate</span>
            <strong>{money(summary.earned)}</strong>
          </div>
          <div className="metric">
            <span>Unpaid estimate</span>
            <strong>{money(unpaidSummary.earned)}</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Work Log History</h2>
            <p>All logs you applied, including paid and unpaid work.</p>
          </div>
          <span className="badge">{logs.length} logs</span>
        </div>
        <div className="filter-bar">
          <DateRangeFilter range={dateRange} onChange={setDateRange} embedded />
          <label className="field">
            <span>Client filter</span>
            <select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
              <option value="all">All clients</option>
              {clientOptions.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Paid status</span>
            <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as "all" | "paid" | "unpaid")}>
              <option value="all">Paid and unpaid</option>
              <option value="unpaid">Unpaid only</option>
              <option value="paid">Paid only</option>
            </select>
          </label>
        </div>
        <WorkLogTable
          logs={logs}
          users={[user]}
          payments={userPayments}
          showPaymentStatus
          clientLabelForLog={(log) => clientNamesForWorkLog(log, data.users, data.contracts || [], data.payments || [])}
          emptyMessage="No work logs match these filters."
          onEditLog={setEditingWorkLog}
          onDeleteLog={deleteWorkLog}
        />
      </section>

      {showCreateModal ? (
        <WorkLogCreateModal
          draft={draft}
          busy={busy}
          onChange={setDraft}
          onClose={() => setShowCreateModal(false)}
          onSubmit={submit}
        />
      ) : null}

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

function AdminWorkLogs({
  data,
  busy,
  onAction,
}: {
  data: PortalData;
  busy: boolean;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: "", endDate: "" });
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [reviewingWorkLog, setReviewingWorkLog] = useState<WorkLog | null>(null);
  const logUsers = data.users.filter(isWorkerUser);
  const userFilteredLogs = data.workLogs.filter((log) => selectedUserId === "all" || log.userId === selectedUserId);
  const logs = filterWorkLogsByDate(userFilteredLogs, dateRange);
  const canReviewWorkLogs = isClientRole(data.currentUser.role);

  async function approveWorkLog(log: WorkLog) {
    await onAction("reviewWorkLog", {
      workLogId: log.id,
      reviewStatus: "approved",
      reviewNote: "",
    });
  }

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
      <WorkLogTable
        logs={logs}
        users={data.users}
        payments={data.payments}
        emptyMessage="No work logs match this date filter."
        onApproveLog={canReviewWorkLogs ? approveWorkLog : undefined}
        onRequestEditLog={canReviewWorkLogs ? setReviewingWorkLog : undefined}
      />
      {reviewingWorkLog ? (
        <WorkLogReviewModal
          log={reviewingWorkLog}
          user={userById(data.users, reviewingWorkLog.userId)}
          busy={busy}
          onClose={() => setReviewingWorkLog(null)}
          onSave={async (payload) => {
            const nextData = await onAction("reviewWorkLog", payload);
            if (nextData) {
              setReviewingWorkLog(null);
            }
          }}
        />
      ) : null}
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
          <option value="today">Today</option>
          <option value="thisWeek">This week</option>
          <option value="lastWeek">Last week</option>
          <option value="last3Days">Last 3 days</option>
          <option value="last7Days">Last 7 days</option>
          <option value="lastMonth">Last 1 month</option>
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

type WorkLogDraft = {
  workDate: string;
  sheetLink: string;
  appliedJobs: string;
  interviewsScheduled: string;
  notes: string;
};

function WorkLogCreateModal({
  draft,
  busy,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: WorkLogDraft;
  busy: boolean;
  onChange: (draft: WorkLogDraft) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <ModalFrame title="Add Work Log" subtitle="Attach the Google Sheet and enter daily totals." onClose={onClose}>
      <form className="form-grid" onSubmit={onSubmit}>
        <label className="field">
          <span>Date</span>
          <input type="date" value={draft.workDate} onChange={(event) => onChange({ ...draft, workDate: event.target.value })} required />
        </label>
        <label className="field">
          <span>Applied jobs</span>
          <input type="number" min="0" value={draft.appliedJobs} onChange={(event) => onChange({ ...draft, appliedJobs: event.target.value })} required />
        </label>
        <label className="field">
          <span>Interviews scheduled</span>
          <input type="number" min="0" value={draft.interviewsScheduled} onChange={(event) => onChange({ ...draft, interviewsScheduled: event.target.value })} required />
        </label>
        <label className="field">
          <span>Google Sheet link</span>
          <input type="url" value={draft.sheetLink} onChange={(event) => onChange({ ...draft, sheetLink: event.target.value })} placeholder="https://docs.google.com/spreadsheets/..." required />
        </label>
        <label className="field full">
          <span>Notes</span>
          <textarea value={draft.notes} onChange={(event) => onChange({ ...draft, notes: event.target.value })} />
        </label>
        <div className="actions full">
          <button className="primary-button" type="submit" disabled={busy}>
            Save daily log
          </button>
          <button className="ghost-button" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </ModalFrame>
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
    <ModalFrame title="Edit Work Log" subtitle="Update this unpaid work log before it is paid." onClose={onClose}>
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
    </ModalFrame>
  );
}

function WorkLogReviewModal({
  log,
  user,
  busy,
  onClose,
  onSave,
}: {
  log: WorkLog;
  user?: PortalUser;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [reviewNote, setReviewNote] = useState(log.reviewNote || "");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({
      workLogId: log.id,
      reviewStatus: "changes_requested",
      reviewNote,
    });
  }

  return (
    <ModalFrame title="Request Work Log Edit" subtitle={`${user?.name || "Bidder"} - ${shortDate(log.workDate)}`} onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <label className="field full">
          <span>Suggestion</span>
          <textarea
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
            placeholder="Explain what should be corrected before approval."
            required
          />
        </label>
        <div className="actions full">
          <button className="primary-button" type="submit" disabled={busy || !reviewNote.trim()}>
            Send edit request
          </button>
          <button className="ghost-button" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

function WorkLogTable({
  logs,
  users,
  payments = [],
  showPaymentStatus = false,
  clientLabelForLog,
  emptyMessage = "No work logs yet.",
  onEditLog,
  onDeleteLog,
  onApproveLog,
  onRequestEditLog,
}: {
  logs: WorkLog[];
  users: PortalUser[];
  payments?: PaymentRecord[];
  showPaymentStatus?: boolean;
  clientLabelForLog?: (log: WorkLog) => string;
  emptyMessage?: string;
  onEditLog?: (log: WorkLog) => void;
  onDeleteLog?: (log: WorkLog) => void;
  onApproveLog?: (log: WorkLog) => void;
  onRequestEditLog?: (log: WorkLog) => void;
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
            {clientLabelForLog ? <th>Client</th> : null}
            <th>Sheet</th>
            <th>Applied</th>
            <th>Interviews</th>
            <th>Review</th>
            {showPaymentStatus ? <th>Status</th> : null}
            <th>Notes</th>
            {onEditLog || onDeleteLog || onApproveLog || onRequestEditLog ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const user = userById(users, log.userId);
            const paid = isWorkLogPaid(log, payments);
            const reviewStatus = workLogReviewStatus(log, paid);
            const actionItems: ActionMenuItem[] = [
              ...(onApproveLog
                ? [{ label: "Approve", disabled: paid || reviewStatus === "approved", onClick: () => onApproveLog(log) }]
                : []),
              ...(onRequestEditLog
                ? [{ label: "Request edit", disabled: paid, onClick: () => onRequestEditLog(log) }]
                : []),
              ...(onEditLog ? [{ label: "Edit", disabled: paid, onClick: () => onEditLog(log) }] : []),
              ...(onDeleteLog ? [{ label: "Delete", danger: true, disabled: paid, onClick: () => onDeleteLog(log) }] : []),
            ];
            return (
              <tr key={log.id}>
                <td>{shortDate(log.workDate)}</td>
                <td>{user?.name || "Unknown"}</td>
                {clientLabelForLog ? <td>{clientLabelForLog(log)}</td> : null}
                <td><a href={log.sheetLink} target="_blank" rel="noreferrer">Open sheet</a></td>
                <td>{log.appliedJobs}</td>
                <td>{log.interviewsScheduled}</td>
                <td>
                  <span className={`badge ${workLogReviewClass(log, paid)}`}>{workLogReviewLabel(log, paid)}</span>
                  {log.reviewedAt ? <span className="table-subtext">{dateTime(log.reviewedAt)}</span> : null}
                </td>
                {showPaymentStatus ? (
                  <td><span className={`badge ${paid ? "bidder" : "pending"}`}>{paid ? "Paid" : "Unpaid"}</span></td>
                ) : null}
                <td>
                  {log.notes || "-"}
                  {log.reviewNote ? <span className="table-subtext">Suggestion: {log.reviewNote}</span> : null}
                </td>
                {actionItems.length ? (
                  <td>
                    <ActionMenu items={actionItems} />
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
  if (isSuperAdminRole(data.currentUser.role)) {
    return <SuperAdminBillingManagementView data={data} busy={busy} onAction={onAction} />;
  }

  if (isClientRole(data.currentUser.role)) {
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
  const [currency, setCurrency] = useState(editingMethod?.currency || "USDT");
  const [network, setNetwork] = useState(editingMethod?.network || "TRON");
  const [address, setAddress] = useState(editingMethod?.address || "");
  const isEditing = Boolean(editingMethod);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const method = `${currency} ${network}`.trim();
    const nextData = await onSave("savePaymentMethod", {
      methodId: editingMethod?.id,
      method,
      currency,
      network,
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
        <span>Payout coin</span>
        <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
          {payoutCurrencies.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Crypto type / network</span>
        <select value={network} onChange={(event) => setNetwork(event.target.value)}>
          {payoutNetworkOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <label className="field full">
        <span>Wallet address</span>
        <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Crypto wallet address for Cryptomus payout" required />
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
            <strong>{payoutMethodLabel(method)}</strong>
            <span className="muted">Wallet: {method.address}</span>
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

function WithdrawalRequestModal({
  methods,
  balance,
  busy,
  onClose,
  onSave,
}: {
  methods: PaymentMethod[];
  balance: number;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const primaryMethod = methods.find((method) => method.isPrimary) || methods[0];
  const [draft, setDraft] = useState({
    amount: balance > 0 ? balance.toFixed(2) : "",
    paymentMethodId: primaryMethod?.id || "",
    memo: "",
  });
  const selectedMethod = methods.find((method) => method.id === draft.paymentMethodId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({
      amount: Number(draft.amount),
      paymentMethodId: draft.paymentMethodId,
      memo: draft.memo,
    });
  }

  return (
    <ModalFrame title="Request Withdrawal" subtitle="Super admin will complete the payout and add the payment link." onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <div className="status-strip compact full">
          Available money credit: {money(balance)}
        </div>
        <label className="field">
          <span>Amount</span>
          <input
            type="number"
            min="0"
            max={balance}
            step="0.01"
            value={draft.amount}
            onChange={(event) => setDraft({ ...draft, amount: event.target.value })}
            required
          />
        </label>
        <label className="field">
          <span>Payout wallet</span>
          <select value={draft.paymentMethodId} onChange={(event) => setDraft({ ...draft, paymentMethodId: event.target.value })} required>
            {methods.map((method) => (
              <option key={method.id} value={method.id}>
                {payoutMethodLabel(method)} - {method.address}
              </option>
            ))}
          </select>
        </label>
        {selectedMethod ? (
          <div className="status-strip compact full">
            {payoutMethodLabel(selectedMethod)}: {selectedMethod.address}
          </div>
        ) : null}
        <label className="field full">
          <span>Memo</span>
          <textarea value={draft.memo} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} placeholder="Optional note for super admin" />
        </label>
        <div className="actions full">
          <button className="primary-button" type="submit" disabled={busy || !methods.length || Number(draft.amount) <= 0 || Number(draft.amount) > balance}>
            Request withdrawal
          </button>
          <button className="ghost-button" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

function ConvertPostCreditModal({
  balances,
  busy,
  onClose,
  onSave,
}: {
  balances: { moneyCreditBalance: number; postCreditBalance: number };
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const maxCredits = Math.floor((balances.moneyCreditBalance || 0) / postCreditMoneyPrice);
  const [postCreditAmount, setPostCreditAmount] = useState(maxCredits > 0 ? String(Math.min(10, maxCredits)) : "");
  const creditAmount = Math.max(0, Math.floor(Number(postCreditAmount) || 0));
  const moneyCost = Math.round(creditAmount * postCreditMoneyPrice * 100) / 100;

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({ postCreditAmount: creditAmount });
  }

  return (
    <ModalFrame title="Convert to Post Credit" subtitle="$0.10 money credit converts to 1 post credit." onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <div className="metric-grid full" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <div className="metric">
            <span>Money credit</span>
            <strong>{money(balances.moneyCreditBalance)}</strong>
          </div>
          <div className="metric">
            <span>Post credit</span>
            <strong>{postCreditCount(balances.postCreditBalance)}</strong>
          </div>
        </div>
        <label className="field">
          <span>Post credits to add</span>
          <input
            type="number"
            min="1"
            max={maxCredits || undefined}
            step="1"
            value={postCreditAmount}
            onChange={(event) => setPostCreditAmount(event.target.value)}
            placeholder="10"
            required
          />
        </label>
        <label className="field">
          <span>Money credit cost</span>
          <input value={money(moneyCost)} readOnly />
        </label>
        <DismissibleNotice id="post-credit-conversion-price-info" className="compact full">
          Price: {money(postCreditMoneyPrice)} = 1 post credit. You can convert up to {postCreditCount(maxCredits)} now.
        </DismissibleNotice>
        <div className="actions full">
          <button className="primary-button" type="submit" disabled={busy || creditAmount <= 0 || moneyCost > balances.moneyCreditBalance}>
            Convert credit
          </button>
          <button className="ghost-button" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </ModalFrame>
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
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const earned = estimateForUser(user, data.workLogs);
  const paid = paidForUser(user.id, data.payments);
  const scheduled = scheduledForUser(user.id, data.payments);
  const open = Math.max(0, earned - paid);
  const balances = userCreditBalances(user, data);
  const userPayments = paymentsForUser(user, data.payments);
  const pendingWithdrawals = userPayments.filter((payment) => isWithdrawalPayment(payment) && payment.status === "processing");

  async function requestWithdrawal(payload: Record<string, unknown>) {
    const nextData = await onAction("requestWithdrawal", payload);
    if (nextData) {
      setShowWithdrawalModal(false);
    }
  }

  async function convertPostCredit(payload: Record<string, unknown>) {
    const nextData = await onAction("convertMoneyToPostCredit", payload);
    if (nextData) {
      setShowConvertModal(false);
    }
  }

  return (
    <div className="two-column">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Payment Method</h2>
            <p>Select the crypto coin and wallet address super admin will use for withdrawals.</p>
          </div>
          <button
            className="primary-button compact-button"
            type="button"
            disabled={busy || !methods.length || balances.moneyCreditBalance <= 0}
            onClick={() => setShowWithdrawalModal(true)}
          >
            Request withdrawal
          </button>
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
          <div className="actions">
            <span className="badge pending">{shortDate(user.nextPaymentDate)}</span>
            <button
              className="ghost-button compact-button"
              type="button"
              disabled={busy || balances.moneyCreditBalance < postCreditMoneyPrice}
              onClick={() => setShowConvertModal(true)}
            >
              Convert to post credit
            </button>
          </div>
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
          <div className="metric">
            <span>Money credit</span>
            <strong>{money(balances.moneyCreditBalance)}</strong>
          </div>
          <div className="metric">
            <span>Post credit</span>
            <strong>{postCreditCount(balances.postCreditBalance)}</strong>
          </div>
          <div className="metric">
            <span>Pending withdrawal</span>
            <strong>{money(pendingWithdrawals.reduce((total, payment) => total + payment.amount, 0))}</strong>
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
        <PaymentTable payments={userPayments} users={[user]} />
      </section>

      {showWithdrawalModal ? (
        <WithdrawalRequestModal
          methods={methods}
          balance={balances.moneyCreditBalance}
          busy={busy}
          onClose={() => setShowWithdrawalModal(false)}
          onSave={requestWithdrawal}
        />
      ) : null}
      {showConvertModal ? (
        <ConvertPostCreditModal
          balances={balances}
          busy={busy}
          onClose={() => setShowConvertModal(false)}
          onSave={convertPostCredit}
        />
      ) : null}
    </div>
  );
}

function SuperAdminCreditManagementView({
  data,
  busy,
  onAction,
}: {
  data: PortalData;
  busy: boolean;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const creditClientUsers = data.users.filter((user) => isClientRole(user.role));
  const creditBidderUsers = data.users.filter((user) => user.role === "bidder");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "client" | "bidder">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [balanceFilter, setBalanceFilter] = useState<"all" | "money" | "post" | "empty">("all");
  const [selectedCreditUser, setSelectedCreditUser] = useState<PortalUser | null>(null);
  const creditUsers = [...creditClientUsers, ...creditBidderUsers];

  function creditUserMatchesFilters(user: PortalUser) {
    const balances = userCreditBalances(user, data);
    const roleMatches =
      roleFilter === "all" ||
      (roleFilter === "client" && isClientRole(user.role)) ||
      (roleFilter === "bidder" && user.role === "bidder");
    const balanceMatches =
      balanceFilter === "all" ||
      (balanceFilter === "money" && balances.moneyCreditBalance > 0) ||
      (balanceFilter === "post" && balances.postCreditBalance > 0) ||
      (balanceFilter === "empty" && balances.moneyCreditBalance <= 0 && balances.postCreditBalance <= 0);

    return (
      userMatchesSearch(user, query) &&
      roleMatches &&
      (statusFilter === "all" || normalizeAccountStatus(user.status) === statusFilter) &&
      balanceMatches
    );
  }

  const filteredClientUsers = creditClientUsers.filter(creditUserMatchesFilters);
  const filteredBidderUsers = creditBidderUsers.filter(creditUserMatchesFilters);
  const filteredCreditUserCount = filteredClientUsers.length + filteredBidderUsers.length;
  const hasCreditFilters = Boolean(query || roleFilter !== "all" || statusFilter !== "all" || balanceFilter !== "all");

  return (
    <div className="dashboard-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Credit Management</h2>
            <p>Select a client or bidder to add or deduct money credit and post credit.</p>
          </div>
        </div>
        <div className="filter-bar">
          <label className="field">
            <span>Search credit users</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, email, user ID" />
          </label>
          <label className="field">
            <span>User type</span>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "all" | "client" | "bidder")}>
              <option value="all">All user types</option>
              <option value="client">Clients only</option>
              <option value="bidder">Bidders only</option>
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | UserStatus)}>
              <option value="all">All statuses</option>
              {accountStatusOptions.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Credit balance</span>
            <select value={balanceFilter} onChange={(event) => setBalanceFilter(event.target.value as "all" | "money" | "post" | "empty")}>
              <option value="all">Any balance</option>
              <option value="money">Has money credit</option>
              <option value="post">Has post credit</option>
              <option value="empty">No credit</option>
            </select>
          </label>
          <button
            className="ghost-button compact-button"
            type="button"
            disabled={!hasCreditFilters}
            onClick={() => {
              setQuery("");
              setRoleFilter("all");
              setStatusFilter("all");
              setBalanceFilter("all");
            }}
          >
            Clear filters
          </button>
        </div>
        <div className="table-toolbar">
          <span>{filteredCreditUserCount} of {creditUsers.length} credit users shown</span>
          <span>Search by name, email, user ID, type, status, or balance.</span>
        </div>
      </section>

      {roleFilter !== "bidder" ? (
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Client Credit Balances</h2>
            <p>Money credit and post credit available to client accounts.</p>
          </div>
        </div>
        <CreditBalanceTable
          users={filteredClientUsers}
          data={data}
          emptyMessage="No clients match this search."
          onSelect={setSelectedCreditUser}
        />
      </section>
      ) : null}

      {roleFilter !== "client" ? (
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Bidder Credit Balances</h2>
            <p>Money credit and post credit available to bidder accounts.</p>
          </div>
        </div>
        <CreditBalanceTable
          users={filteredBidderUsers}
          data={data}
          emptyMessage="No bidders match this search."
          onSelect={setSelectedCreditUser}
        />
      </section>
      ) : null}

      {selectedCreditUser ? (
        <CreditAdjustmentModal
          user={selectedCreditUser}
          data={data}
          busy={busy}
          onClose={() => setSelectedCreditUser(null)}
          onSave={async (payload) => {
            const nextData = await onAction("adjustCredit", payload);
            if (nextData) {
              setSelectedCreditUser(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function CreditBalanceTable({
  users,
  data,
  emptyMessage,
  onSelect,
}: {
  users: PortalUser[];
  data: PortalData;
  emptyMessage: string;
  onSelect?: (user: PortalUser) => void;
}) {
  if (!users.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>User ID</th>
            <th>Status</th>
            <th>Money credit</th>
            <th>Post credit</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const balances = userCreditBalances(user, data);
            return (
              <tr className={onSelect ? "clickable-row" : ""} key={user.id} onClick={() => onSelect?.(user)}>
                <td>
                  <strong>{user.name}</strong>
                  <span className="table-subtext">{user.email}</span>
                </td>
                <td><span className="table-subtext">{displayUserId(user)}</span></td>
                <td><span className={`badge ${normalizeAccountStatus(user.status)}`}>{statusLabel(user.status)}</span></td>
                <td>{money(balances.moneyCreditBalance)}</td>
                <td>{postCreditCount(balances.postCreditBalance)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CreditAdjustmentModal({
  user,
  data,
  busy,
  onClose,
  onSave,
}: {
  user: PortalUser;
  data: PortalData;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const balances = userCreditBalances(user, data);
  const [draft, setDraft] = useState({
    creditType: "money",
    direction: "add",
    amount: "",
    referenceLink: "",
    memo: "",
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({
      targetUserId: user.id,
      creditType: draft.creditType,
      direction: draft.direction,
      amount: Number(draft.amount),
      referenceLink: draft.referenceLink,
      memo: draft.memo,
    });
  }

  return (
    <ModalFrame title="Credit Adjustment" subtitle="Add or deduct credit for the selected account." onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <div className="status-strip compact full">
          {user.name} - {roleLabel(user.role)} - User ID: {displayUserId(user)}
        </div>
        <div className="metric-grid full" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <div className="metric">
            <span>Money credit</span>
            <strong>{money(balances.moneyCreditBalance)}</strong>
          </div>
          <div className="metric">
            <span>Post credit</span>
            <strong>{postCreditCount(balances.postCreditBalance)}</strong>
          </div>
        </div>
        <label className="field">
          <span>Credit type</span>
          <select value={draft.creditType} onChange={(event) => setDraft({ ...draft, creditType: event.target.value })}>
            <option value="money">Money credit</option>
            <option value="post">Post credit</option>
          </select>
        </label>
        <label className="field">
          <span>Action</span>
          <select value={draft.direction} onChange={(event) => setDraft({ ...draft, direction: event.target.value })}>
            <option value="add">Add</option>
            <option value="deduct">Deduct</option>
          </select>
        </label>
        <label className="field">
          <span>{draft.creditType === "post" ? "Credit count" : "Amount"}</span>
          <input type="number" min="0" step={draft.creditType === "post" ? "1" : "0.01"} value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} required />
        </label>
        <label className="field">
          <span>Reference link</span>
          <input value={draft.referenceLink} onChange={(event) => setDraft({ ...draft, referenceLink: event.target.value })} placeholder="Optional receipt or note link" />
        </label>
        <label className="field full">
          <span>Memo</span>
          <textarea value={draft.memo} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} />
        </label>
        <div className="actions full">
          <button className="primary-button" type="submit" disabled={busy || !draft.amount}>
            Save credit adjustment
          </button>
          <button className="ghost-button" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

function SuperAdminBillingManagementView({
  data,
  busy,
  onAction,
}: {
  data: PortalData;
  busy: boolean;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const pendingPayments = data.payments.filter((payment) => payment.status === "processing");
  const completedPayments = data.payments.filter((payment) => payment.status === "paid");
  const [completingPayment, setCompletingPayment] = useState<PaymentRecord | null>(null);

  return (
    <div className="dashboard-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Pending Withdrawal Requests</h2>
            <p>Bidders request withdrawals here. Add the payment link when the payout is completed.</p>
          </div>
          <span className="badge pending">{pendingPayments.length} pending</span>
        </div>
        <PaymentTable
          payments={pendingPayments}
          users={data.users}
          onComplete={setCompletingPayment}
          emptyMessage="No pending withdrawal requests need completion."
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Completed Billing History</h2>
            <p>Completed withdrawals, work-credit releases, and receipt references.</p>
          </div>
          <span className="badge paid">{completedPayments.length} completed</span>
        </div>
        <PaymentTable
          payments={completedPayments}
          users={data.users}
          emptyMessage="No completed payouts yet."
        />
      </section>

      {completingPayment ? (
        <PaymentCompleteModal
          payment={completingPayment}
          user={userById(data.users, completingPayment.userId)}
          busy={busy}
          onClose={() => setCompletingPayment(null)}
          onSave={async (payload) => {
            const nextData = await onAction("completePayment", payload);
            if (nextData) {
              setCompletingPayment(null);
            }
          }}
        />
      ) : null}
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
  const canAddManualPayment = isSuperAdminRole(data.currentUser.role);
  const canReleasePayments = isClientRole(data.currentUser.role);
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
  const [releaseDraft, setReleaseDraft] = useState({
    userId: payableUsers[0]?.id || "",
    periodStart: today(),
    periodEnd: today(),
    baseAmount: "",
    tipAmount: "",
    sourcePaymentId: "",
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
  const [manualCreditDraft, setManualCreditDraft] = useState({
    amount: "",
    referenceLink: "",
    memo: "",
  });
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  const selectedUser = payableUsers.find((user) => user.id === draft.userId);
  const selectedReleaseUser = payableUsers.find((user) => user.id === releaseDraft.userId);
  const paymentClientId = isSuperAdminRole(data.currentUser.role)
    ? selectedUser?.assignedAdminId || depositDraft.clientId
    : data.currentUser.id;
  const depositClientId = isSuperAdminRole(data.currentUser.role) ? depositDraft.clientId : data.currentUser.id;
  const paymentClient = paymentClientId ? userById(data.users, paymentClientId) : undefined;
  const depositClient = depositClientId ? userById(data.users, depositClientId) : undefined;
  const paymentClientBalances = paymentClient ? userCreditBalances(paymentClient, data) : null;
  const depositClientBalances = depositClient ? userCreditBalances(depositClient, data) : null;
  const creditBalance = paymentClientBalances?.moneyCreditBalance || 0;
  const releaseCreditBalance = depositClientBalances?.moneyCreditBalance || 0;
  const releasePostCreditBalance = depositClientBalances?.postCreditBalance || 0;
  const depositAmount = Number(depositDraft.amount) || 0;
  const depositFee = Math.round(depositAmount * 0.05 * 100) / 100;
  const depositCredit = Math.max(0, Math.round((depositAmount - depositFee) * 100) / 100);
  const releaseBaseAmount = releaseDraft.baseAmount !== ""
    ? Number(releaseDraft.baseAmount) || 0
    : selectedReleaseUser
      ? estimateForUserInRange(selectedReleaseUser, data.workLogs, releaseDraft.periodStart, releaseDraft.periodEnd)
      : 0;
  const releaseTipAmount = Number(releaseDraft.tipAmount) || 0;
  const releaseTotalAmount = Math.max(0, Math.round((releaseBaseAmount + releaseTipAmount) * 100) / 100);
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
        periodStart: payment.periodStart,
        periodEnd: payment.periodEnd,
        amount: payment.amount,
        daysUntil: daysUntil(payment.scheduledDate),
        description: `${shortDate(payment.periodStart)} - ${shortDate(payment.periodEnd)}`,
        sourceLabel: "Scheduled record",
        sourcePaymentId: payment.id,
      };
    });
  const scheduledKeys = new Set(
    scheduledPaymentItems.map((item) => `${item.user?.id || "unknown"}:${item.scheduledDate}`)
  );
  const paydayItems: UpcomingPaymentItem[] = payableUsers
    .filter((user) => user.nextPaymentDate && !scheduledKeys.has(`${user.id}:${user.nextPaymentDate}`))
    .map((user) => {
      const unpaidLogs = data.workLogs
        .filter((log) => log.userId === user.id && isWorkLogApproved(log) && !isWorkLogPaid(log, data.payments))
        .sort((left, right) => left.workDate.localeCompare(right.workDate));
      const periodStart = unpaidLogs[0]?.workDate || user.nextPaymentDate;
      const periodEnd = unpaidLogs[unpaidLogs.length - 1]?.workDate || user.nextPaymentDate;

      return {
        id: `payday-${user.id}`,
        user,
        scheduledDate: user.nextPaymentDate,
        periodStart,
        periodEnd,
        amount: Math.max(0, estimateForUser(user, unpaidLogs)),
        daysUntil: daysUntil(user.nextPaymentDate),
        description: unpaidLogs.length ? `${shortDate(periodStart)} - ${shortDate(periodEnd)}` : user.paymentSchedule || "From next payment date",
        sourceLabel: "Needs payment record",
      };
    });
  const upcomingPayments = [...scheduledPaymentItems, ...paydayItems]
    .filter((item) => item.daysUntil >= 0 && item.amount > 0)
    .sort((left, right) => left.daysUntil - right.daysUntil || left.scheduledDate.localeCompare(right.scheduledDate))
    .slice(0, 10);
  const paydayReminders = [...scheduledPaymentItems, ...paydayItems]
    .filter((item) => item.daysUntil <= 1 && item.amount > 0)
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

  async function submitReleasePayment(event: FormEvent) {
    event.preventDefault();
    const nextData = await onAction("releasePayment", {
      userId: releaseDraft.userId,
      periodStart: releaseDraft.periodStart,
      periodEnd: releaseDraft.periodEnd,
      baseAmount: releaseBaseAmount,
      tipAmount: Number(releaseDraft.tipAmount),
      sourcePaymentId: releaseDraft.sourcePaymentId,
      memo: releaseDraft.memo,
    });
    if (nextData) {
      setReleaseDraft({ ...releaseDraft, tipAmount: "", memo: "", sourcePaymentId: "" });
      setShowReleaseModal(false);
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

  async function submitManualCredit(event: FormEvent) {
    event.preventDefault();
    const nextData = await onAction("addManualCredit", {
      clientId: depositClientId,
      amount: Number(manualCreditDraft.amount),
      referenceLink: manualCreditDraft.referenceLink,
      memo: manualCreditDraft.memo,
    });
    if (nextData) {
      setManualCreditDraft({ amount: "", referenceLink: "", memo: "" });
    }
  }

  async function convertPostCredit(payload: Record<string, unknown>) {
    const nextData = await onAction("convertMoneyToPostCredit", payload);
    if (nextData) {
      setShowConvertModal(false);
    }
  }

  function handleUserChange(userId: string) {
    const nextUser = payableUsers.find((user) => user.id === userId);
    setDraft({ ...draft, userId, scheduledDate: nextUser?.nextPaymentDate || draft.scheduledDate || today() });
  }

  function handleReleaseUserChange(userId: string) {
    setReleaseDraft({ ...releaseDraft, userId, baseAmount: "", sourcePaymentId: "" });
  }

  function setReleasePeriod(field: "periodStart" | "periodEnd", value: string) {
    setReleaseDraft({ ...releaseDraft, [field]: value, baseAmount: "", sourcePaymentId: "" });
  }

  function openReleaseModal(item?: UpcomingPaymentItem) {
    const nextUser = item?.user || selectedReleaseUser || payableUsers[0];
    if (!nextUser) {
      return;
    }

    setReleaseDraft({
      userId: nextUser.id,
      periodStart: item?.periodStart || today(),
      periodEnd: item?.periodEnd || today(),
      baseAmount: item ? item.amount.toFixed(2) : "",
      tipAmount: "",
      sourcePaymentId: item?.sourcePaymentId || "",
      memo: item ? `${item.sourceLabel} - ${item.description}` : "",
    });
    setShowReleaseModal(true);
  }

  return (
    <div className="two-column">
      <PaydayReminder reminders={paydayReminders} onRelease={canReleasePayments ? openReleaseModal : undefined} />

      {canReleasePayments ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Release Payment</h2>
              <p>Click an upcoming payment to autofill the payout, or release a custom date range.</p>
            </div>
            <div className="actions">
              <span className="badge paid">{money(releaseCreditBalance)} credits</span>
              <button className="primary-button compact-button" type="button" disabled={busy || !payableUsers.length} onClick={() => openReleaseModal()}>
                Release payment
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {canAddManualPayment ? (
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
        <UpcomingPaymentsPanel payments={upcomingPayments} onRelease={canReleasePayments ? openReleaseModal : undefined} />

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Credit Wallet</h2>
              <p>Deposit through Cryptomus. A 5% platform fee is deducted before credits are added.</p>
            </div>
            {!isSuperAdminRole(data.currentUser.role) ? (
              <button
                className="ghost-button compact-button"
                type="button"
                disabled={busy || releaseCreditBalance < postCreditMoneyPrice}
                onClick={() => setShowConvertModal(true)}
              >
                Convert to post credit
              </button>
            ) : null}
          </div>
          <div className="metric-grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            <div className="metric">
              <span>Money credit</span>
              <strong>{money(releaseCreditBalance)}</strong>
            </div>
            <div className="metric">
              <span>Post credit</span>
              <strong>{postCreditCount(releasePostCreditBalance)}</strong>
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
              <span>Crypto type / network</span>
              <select value={depositDraft.network} onChange={(event) => setDepositDraft({ ...depositDraft, network: event.target.value })}>
                {depositNetworkOptions.map((option) => (
                  <option key={option.value || "any"} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <div className="actions full">
              <button className="primary-button" type="submit" disabled={busy || !creditClients.length}>
                Create Cryptomus invoice
              </button>
            </div>
          </form>
          {isSuperAdminRole(data.currentUser.role) ? (
            <div className="manual-credit-box">
              <div className="section-heading compact-heading">
                <div>
                  <h3>Charge client credit</h3>
                  <p>Super admin can charge credits directly to a client without creating a Cryptomus invoice.</p>
                </div>
              </div>
              <form className="form-grid" onSubmit={submitManualCredit}>
                <label className="field">
                  <span>Credit amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualCreditDraft.amount}
                    onChange={(event) => setManualCreditDraft({ ...manualCreditDraft, amount: event.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span>Reference link</span>
                  <input
                    value={manualCreditDraft.referenceLink}
                    onChange={(event) => setManualCreditDraft({ ...manualCreditDraft, referenceLink: event.target.value })}
                    placeholder="Optional receipt or note link"
                  />
                </label>
                <label className="field full">
                  <span>Memo</span>
                  <textarea value={manualCreditDraft.memo} onChange={(event) => setManualCreditDraft({ ...manualCreditDraft, memo: event.target.value })} />
                </label>
                <div className="actions full">
                  <button className="secondary-button" type="submit" disabled={busy || !depositClientId}>
                    Charge credit
                  </button>
                </div>
              </form>
            </div>
          ) : null}
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
                    <span className="muted">{primary ? `${payoutMethodLabel(primary)}: ${primary.address}` : "No method saved"}</span>
                  </div>
                  <span className={`badge ${normalizeAccountStatus(user.status)}`}>{statusLabel(user.status)}</span>
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

      {showConvertModal && depositClientBalances ? (
        <ConvertPostCreditModal
          balances={depositClientBalances}
          busy={busy}
          onClose={() => setShowConvertModal(false)}
          onSave={convertPostCredit}
        />
      ) : null}

      {showReleaseModal ? (
        <ModalFrame title="Release Payment" subtitle="Move client credits into the bidder money-credit wallet." onClose={() => setShowReleaseModal(false)}>
          <form className="form-grid" onSubmit={submitReleasePayment}>
            <DismissibleNotice id="release-payment-credit-transfer-info" className="compact full">
              This deducts client money credit and adds the same amount to the bidder. The bidder can request a withdrawal later.
            </DismissibleNotice>
            <label className="field full">
              <span>Bidder</span>
              <select value={releaseDraft.userId} onChange={(event) => handleReleaseUserChange(event.target.value)} required>
                {payableUsers.map((user) => (
                  <option key={user.id} value={user.id}>{user.name} - {roleLabel(user.role)}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Period start</span>
              <input type="date" value={releaseDraft.periodStart} onChange={(event) => setReleasePeriod("periodStart", event.target.value)} required />
            </label>
            <label className="field">
              <span>Period end</span>
              <input type="date" value={releaseDraft.periodEnd} onChange={(event) => setReleasePeriod("periodEnd", event.target.value)} required />
            </label>
            <label className="field">
              <span>Work amount</span>
              <input value={money(releaseBaseAmount)} readOnly />
            </label>
            <label className="field">
              <span>Tip</span>
              <input type="number" min="0" step="0.01" value={releaseDraft.tipAmount} onChange={(event) => setReleaseDraft({ ...releaseDraft, tipAmount: event.target.value })} placeholder="$0.00" />
            </label>
            <label className="field">
              <span>Total release</span>
              <input value={money(releaseTotalAmount)} readOnly />
            </label>
            <label className="field full">
              <span>Memo</span>
              <textarea value={releaseDraft.memo} onChange={(event) => setReleaseDraft({ ...releaseDraft, memo: event.target.value })} />
            </label>
            <div className="actions full">
              <button
                className="primary-button"
                type="submit"
                disabled={busy || !payableUsers.length || releaseTotalAmount <= 0 || releaseTotalAmount > releaseCreditBalance}
              >
                Release payment
              </button>
            </div>
          </form>
        </ModalFrame>
      ) : null}

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

function PaydayReminder({
  reminders,
  onRelease,
}: {
  reminders: UpcomingPaymentItem[];
  onRelease?: (item: UpcomingPaymentItem) => void;
}) {
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
          <button
            className="payment-row urgent payment-row-button"
            key={item.id}
            type="button"
            disabled={!onRelease}
            onClick={() => onRelease?.(item)}
          >
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
          </button>
        ))}
      </div>
    </section>
  );
}

function UpcomingPaymentsPanel({
  payments,
  onRelease,
}: {
  payments: UpcomingPaymentItem[];
  onRelease?: (item: UpcomingPaymentItem) => void;
}) {
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
            <button
              className="payment-row payment-row-button"
              key={item.id}
              type="button"
              disabled={!onRelease}
              onClick={() => onRelease?.(item)}
            >
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
            </button>
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
    <ModalFrame title="Edit Payment" subtitle="Update the payout record and receipt link." onClose={onClose}>
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
            <span>Payment date</span>
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
    </ModalFrame>
  );
}

function PaymentCompleteModal({
  payment,
  user,
  busy,
  onClose,
  onSave,
}: {
  payment: PaymentRecord;
  user?: PortalUser;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [paymentLink, setPaymentLink] = useState(payment.paymentLink || payment.payoutTxid || payment.payoutUuid || "");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({
      paymentId: payment.id,
      paymentLink,
    });
  }

  return (
    <ModalFrame title={isWithdrawalPayment(payment) ? "Complete Withdrawal" : "Mark Payment Completed"} subtitle="Add the receipt or transaction link before completing this payout." onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <div className="status-strip compact full">
          {user?.name || "Unknown user"} - {paymentTypeLabel(payment)} - {money(payment.amount)} - {shortDate(payment.periodStart)} to {shortDate(payment.periodEnd)}
        </div>
        <label className="field full">
          <span>Payment link *</span>
          <input
            value={paymentLink}
            onChange={(event) => setPaymentLink(event.target.value)}
            placeholder="Receipt, transaction, or transfer link"
            required
          />
        </label>
        <div className="actions full">
          <button className="primary-button" type="submit" disabled={busy || !paymentLink.trim()}>
            Mark completed
          </button>
          <button className="ghost-button" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

function PaymentTable({
  payments,
  users,
  onEdit,
  onComplete,
  onDelete,
  emptyMessage = "No payment history yet.",
}: {
  payments: PaymentRecord[];
  users: PortalUser[];
  onEdit?: (payment: PaymentRecord) => void;
  onComplete?: (payment: PaymentRecord) => void;
  onDelete?: (payment: PaymentRecord) => void;
  emptyMessage?: string;
}) {
  if (!payments.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Type</th>
            <th>Period</th>
            <th>Payment date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Link</th>
            <th>Memo</th>
            {onEdit || onComplete || onDelete ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => {
            const user = userById(users, payment.userId);
            const linkValue = payment.paymentLink || payment.payoutTxid || payment.payoutUuid || "";
            const isWebLink = /^https?:\/\//i.test(linkValue);
            const actionItems: ActionMenuItem[] = [
              ...(onComplete && payment.status === "processing" ? [{ label: "Mark completed", onClick: () => onComplete(payment) }] : []),
              ...(onEdit ? [{ label: "Edit", onClick: () => onEdit(payment) }] : []),
              ...(onDelete ? [{ label: "Delete", danger: true, onClick: () => onDelete(payment) }] : []),
            ];
            return (
              <tr key={payment.id}>
                <td>{user?.name || "Unknown"}</td>
                <td>{paymentTypeLabel(payment)}</td>
                <td>{shortDate(payment.periodStart)} - {shortDate(payment.periodEnd)}</td>
                <td>{shortDate(payment.scheduledDate)}</td>
                <td>
                  {money(payment.amount)}
                  {payment.tipAmount ? <span className="table-subtext">Tip: {money(payment.tipAmount)}</span> : null}
                </td>
                <td><span className={`badge ${paymentStatusClass(payment.status)}`}>{paymentStatusLabel(payment.status)}</span></td>
                <td>{linkValue ? (isWebLink ? <a href={linkValue} target="_blank" rel="noreferrer">Open link</a> : <span>{linkValue}</span>) : "-"}</td>
                <td>{payment.memo || "-"}</td>
                {actionItems.length ? (
                  <td>
                    <ActionMenu items={actionItems} />
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
        const sourceLabel = deposit.provider === "manual" ? "manual credit" : "Cryptomus deposit";
        const paymentMethod = [deposit.toCurrency, cryptoNetworkLabel(deposit.network)].filter(Boolean).join(" ");
        return (
          <div className="payment-row" key={deposit.id}>
            <div>
              <strong>{money(deposit.creditAmount)} credits</strong>
              <span className="muted">
                {client?.name || "Client"} - {money(deposit.amount)} {paymentMethod} {sourceLabel} - {deposit.providerStatus || deposit.status}
              </span>
              {deposit.memo ? <span className="table-subtext">{deposit.memo}</span> : null}
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
type AttachmentPreviewKind = "image" | "text" | "document" | "file";

type AttachmentPreviewItem = {
  attachment: ChatAttachmentDraft;
  kind: AttachmentPreviewKind;
  textPreview?: string;
};

type PendingAttachmentPreview = {
  attachments: ChatAttachmentDraft[];
  previews: AttachmentPreviewItem[];
  body: string;
  source: "clipboard" | "file";
};

const textPreviewBytes = 12000;
const textPreviewExtensions = new Set([
  "txt",
  "md",
  "csv",
  "json",
  "log",
  "xml",
  "html",
  "css",
  "js",
  "jsx",
  "ts",
  "tsx",
  "yml",
  "yaml",
]);
const documentPreviewExtensions = new Set(["pdf", "doc", "docx", "rtf", "odt"]);

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("File could not be read."));
    reader.readAsDataURL(file);
  });
}

function dataUrlSize(dataUrl: string, fallbackSize: number) {
  const [, payload = ""] = dataUrl.split(",");
  if (!payload) {
    return fallbackSize;
  }

  return Math.round((payload.length * 3) / 4);
}

function fileExtension(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
}

function extensionForMimeType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("text/")) return "txt";
  return "";
}

function fileNameForAttachment(file: File, source: "clipboard" | "file", index: number) {
  if (file.name && file.name !== "blob") {
    return file.name;
  }

  const extension = extensionForMimeType(file.type);
  const baseName = source === "clipboard" ? "clipboard-attachment" : "attachment";
  return `${baseName}-${index + 1}${extension ? `.${extension}` : ""}`;
}

function previewKindForFile(file: File): AttachmentPreviewKind {
  const type = file.type.toLowerCase();
  const extension = fileExtension(file.name);

  if (type.startsWith("image/")) {
    return "image";
  }
  if (type.startsWith("text/") || type.includes("json") || textPreviewExtensions.has(extension)) {
    return "text";
  }
  if (
    type === "application/pdf" ||
    type.includes("msword") ||
    type.includes("wordprocessingml") ||
    type.includes("opendocument") ||
    type === "application/rtf" ||
    documentPreviewExtensions.has(extension)
  ) {
    return "document";
  }

  return "file";
}

function readFileAsTextPreview(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    const previewBlob = file.size > textPreviewBytes ? file.slice(0, textPreviewBytes) : file;
    reader.onload = () => {
      const suffix = file.size > textPreviewBytes ? "\n\n... Preview truncated." : "";
      resolve(`${String(reader.result || "")}${suffix}`);
    };
    reader.onerror = () => reject(new Error("Text preview could not be loaded."));
    reader.readAsText(previewBlob);
  });
}

async function readChatImageAsCompressedDataUrl(file: File) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return readFileAsDataUrl(file);
  }

  const dataUrl = await readFileAsDataUrl(file);
  return new Promise<string>((resolve) => {
    const image = new window.Image();
    image.onload = () => {
      const scale = Math.min(1, maxChatImageDimension / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(dataUrl);
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL("image/webp", 0.82);
      resolve(dataUrlSize(compressedDataUrl, file.size) < file.size ? compressedDataUrl : dataUrl);
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

async function prepareChatAttachment(file: File, source: "clipboard" | "file", index: number): Promise<AttachmentPreviewItem> {
  const kind = previewKindForFile(file);
  const dataUrl = kind === "image" ? await readChatImageAsCompressedDataUrl(file) : await readFileAsDataUrl(file);
  const compressedImage = kind === "image" && dataUrl.startsWith("data:image/webp");
  const originalName = fileNameForAttachment(file, source, index);
  const attachmentName = compressedImage ? originalName.replace(/\.[^.]+$/, "") + ".webp" : originalName;
  const attachment = {
    name: attachmentName,
    type: compressedImage ? "image/webp" : file.type || "application/octet-stream",
    size: compressedImage ? dataUrlSize(dataUrl, file.size) : file.size,
    dataUrl,
  };
  const textPreview = kind === "text" ? await readFileAsTextPreview(file) : undefined;

  return { attachment, kind, textPreview };
}

async function resizeProfileImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a PNG, JPG, or WebP image.");
  }

  const dataUrl = await readFileAsDataUrl(file);
  return new Promise<string>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const maxSize = 160;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Profile image could not be resized."));
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/webp", 0.78));
    };
    image.onerror = () => reject(new Error("Profile image could not be loaded."));
    image.src = dataUrl;
  });
}

function ChatAttachmentView({ attachment, onPreview }: { attachment: ChatAttachmentDraft; onPreview?: (attachment: ChatAttachmentDraft) => void }) {
  const isImage = attachment.type.startsWith("image/");
  const isAudio = attachment.type.startsWith("audio/");

  return (
    <div className={`chat-attachment ${isImage ? "image" : ""}`}>
      {isImage ? (
        <button className="attachment-image-button" type="button" onClick={() => onPreview?.(attachment)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={attachment.dataUrl} alt={attachment.name} />
        </button>
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
  const [previewImage, setPreviewImage] = useState<ChatAttachmentDraft | null>(null);

  if (!attachments.length) {
    return null;
  }

  return (
    <>
      <div className="chat-attachments">
        {attachments.map((attachment, index) => (
          <ChatAttachmentView
            key={attachment.id || `${attachment.name}-${attachment.size}-${index}`}
            attachment={attachment}
            onPreview={setPreviewImage}
          />
        ))}
      </div>
      {previewImage ? (
        <ModalFrame title={previewImage.name || "Image preview"} onClose={() => setPreviewImage(null)}>
          <div className="image-preview-modal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage.dataUrl} alt={previewImage.name || "Uploaded image"} />
          </div>
        </ModalFrame>
      ) : null}
    </>
  );
}

function AttachmentPreviewModal({
  pending,
  busy,
  canSend,
  onBodyChange,
  onSend,
  onAttach,
  onClose,
}: {
  pending: PendingAttachmentPreview;
  busy: boolean;
  canSend: boolean;
  onBodyChange: (body: string) => void;
  onSend: () => void;
  onAttach: () => void;
  onClose: () => void;
}) {
  const title = pending.attachments.length === 1 ? pending.attachments[0].name : `${pending.attachments.length} attachments`;

  return (
    <ModalFrame title={title} onClose={onClose}>
      <div className="attachment-preview-modal-grid">
        <div className="attachment-preview-stack">
          {pending.previews.map(({ attachment, kind, textPreview }, index) => {
            const isPdf = attachment.type === "application/pdf" || attachment.name.toLowerCase().endsWith(".pdf");

            return (
              <article className={`attachment-preview-panel ${kind}`} key={`${attachment.name}-${attachment.size}-${index}`}>
                <div className="attachment-preview-heading">
                  <strong>{attachment.name}</strong>
                  <span>{formatBytes(attachment.size)}</span>
                </div>

                {kind === "image" ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={attachment.dataUrl} alt={attachment.name} />
                  </>
                ) : kind === "text" ? (
                  <pre className="text-file-preview">{textPreview || "Text preview unavailable."}</pre>
                ) : kind === "document" && isPdf ? (
                  <iframe className="document-file-preview" title={attachment.name} src={attachment.dataUrl} />
                ) : kind === "document" ? (
                  <div className="document-preview-card">
                    <strong>Document ready</strong>
                    <span>{attachment.name}</span>
                    <a href={attachment.dataUrl} target="_blank" rel="noreferrer">
                      Open file
                    </a>
                  </div>
                ) : (
                  <div className="document-preview-card">
                    <strong>File attached</strong>
                    <span>{attachment.name}</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <label className="attachment-preview-caption">
          <span>Message</span>
          <textarea
            value={pending.body}
            onChange={(event) => onBodyChange(event.target.value)}
            placeholder="Add a message"
            autoFocus
          />
        </label>

        <div className="modal-actions">
          <button className="ghost-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="ghost-button" type="button" onClick={onAttach}>
            Add to message
          </button>
          <button className="primary-button" type="button" disabled={busy || !canSend} onClick={onSend}>
            Send
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function HelpView({
  data,
  busy,
  onSend,
}: {
  data: PortalData;
  busy: boolean;
  onSend: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const isSuperAdmin = isSuperAdminRole(data.currentUser.role);

  return (
    <div className="dashboard-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{isSuperAdmin ? "Help Center" : "How This Works"}</h2>
            <p>{isSuperAdmin ? "Review the operating guide and respond to support messages." : "Use this guide to set up your account and work through the portal."}</p>
          </div>
        </div>

        <div className="help-grid">
          <article className="profile-card help-card">
            <h3>Client Setup</h3>
            <p>Complete your profile with name, company, country, timezone, and preferences. Add money credit from Billing before releasing bidder payments.</p>
            <p>Create or review bidder posts, open a contract, set rates, set the next payday, and release payment after approving work logs.</p>
          </article>
          <article className="profile-card help-card">
            <h3>Bidder Setup</h3>
            <p>Complete your profile with country, timezone, skills, and languages. Add a crypto payout method from Payments so clients can release payouts.</p>
            <p>Log daily work with the Google Sheet link, applied jobs, interviews scheduled, and notes. Work logs must be approved before payment.</p>
          </article>
          <article className="profile-card help-card">
            <h3>Contracts</h3>
            <p>Contracts connect one client and one bidder with criteria, rates, bonus, schedule, and next payday. A bidder can hold more than one contract.</p>
            <p>Each contract has a contract ID. Use it when discussing work, payment, disputes, or support questions.</p>
          </article>
          <article className="profile-card help-card">
            <h3>Support</h3>
            <p>Support messages are separate from the Inbox. Inbox is only for client-bidder communication.</p>
            <p>Use the Support Center below when you need help from the super admin.</p>
          </article>
        </div>
      </section>

      <SupportCenter data={data} busy={busy} onSend={onSend} />
    </div>
  );
}

function SupportCenter({
  data,
  busy,
  onSend,
}: {
  data: PortalData;
  busy: boolean;
  onSend: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const currentUser = data.currentUser;
  const isSuperAdmin = isSuperAdminRole(currentUser.role);
  const supportContacts = data.supportContacts || [];
  const supportMessages = data.supportMessages || [];
  const [selectedUserId, setSelectedUserId] = useState("");
  const [body, setBody] = useState("");
  const selectedSupportUser = isSuperAdmin
    ? supportContacts.find((contact) => contact.id === selectedUserId) || supportContacts[0]
    : supportContacts[0];
  const activeConversationId = selectedSupportUser
    ? supportConversationIdForUser(isSuperAdmin ? selectedSupportUser.id : currentUser.id)
    : "";
  const activeMessages = activeConversationId
    ? supportMessages.filter((message) => chatConversationIdForMessage(message) === activeConversationId)
    : [];
  const supportConversations = supportContacts.map((contact) => {
    const conversationId = supportConversationIdForUser(contact.id);
    const messages = supportMessages.filter((message) => chatConversationIdForMessage(message) === conversationId);
    const latestMessage = messages[messages.length - 1];
    return {
      contact,
      conversationId,
      messageCount: messages.length,
      preview: latestMessage?.deletedAt ? "Message deleted" : latestMessage?.body || "No messages yet",
    };
  });

  async function sendSupportMessage(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() || !selectedSupportUser) {
      return;
    }

    const nextData = await onSend("addSupportMessage", {
      recipientId: isSuperAdmin ? selectedSupportUser.id : "",
      body,
      authorTimeZone: browserTimeZone(),
    });
    if (nextData) {
      setBody("");
    }
  }

  return (
    <section className="panel support-center-panel">
      <div className="panel-header">
        <div>
          <h2>Support Center</h2>
          <p>{isSuperAdmin ? "Support messages from users are managed here, separate from Inbox." : "Message the super admin for account, contract, billing, or work-log help."}</p>
        </div>
        <span className="badge">{activeMessages.length} messages</span>
      </div>

      <div className={`support-layout ${isSuperAdmin ? "" : "single"}`}>
        {isSuperAdmin ? (
          <div className="conversation-list support-list" aria-label="Support conversations">
            {supportConversations.map((conversation) => (
              <button
                className={`conversation-button ${selectedSupportUser?.id === conversation.contact.id ? "active" : ""}`}
                key={conversation.conversationId}
                type="button"
                onClick={() => setSelectedUserId(conversation.contact.id)}
              >
                <MemberAvatar user={conversation.contact} size="md" />
                <span>
                  <strong>{userDisplayName(conversation.contact)}</strong>
                  <small>{conversation.preview}</small>
                </span>
                <span className="conversation-badge">{conversation.messageCount}</span>
              </button>
            ))}
            {!supportConversations.length ? <div className="empty-state compact">No support messages yet.</div> : null}
          </div>
        ) : null}

        <div className="messages support-messages">
          {selectedSupportUser ? (
            <div className="chat-context-card">
              <div className="person-title">
                <div>
                  <h3>{isSuperAdmin ? userDisplayName(selectedSupportUser) : "Super Admin Support"}</h3>
                  <p>{isSuperAdmin ? selectedSupportUser.email : "This thread is separate from your client-bidder inbox."}</p>
                </div>
                <span className={`badge ${isSuperAdmin ? selectedSupportUser.role : "super_admin"}`}>{isSuperAdmin ? roleLabel(selectedSupportUser.role) : "Support"}</span>
              </div>
            </div>
          ) : null}

          {activeMessages.map((message) => {
            const isMine = message.userId === currentUser.id;
            const author = userById([currentUser, ...data.users, ...supportContacts], message.userId);
            const messageAttachments = message.attachments || [];
            const isCompactTextMessage = !message.deletedAt && Boolean(message.body) && !messageAttachments.length;
            return (
              <div className={`message-row ${isMine ? "mine" : ""}`} key={message.id}>
                {!isMine ? <MemberAvatar user={author} size="sm" /> : null}
                <div className={`message ${isMine ? "mine" : ""} ${message.deletedAt ? "deleted" : ""} ${isCompactTextMessage ? "compact-text-message" : ""}`}>
                  {message.deletedAt ? <p className="muted">Message deleted</p> : <p>{message.body}</p>}
                  <ChatAttachments attachments={messageAttachments} />
                  <div className="message-footer">
                    <span className="message-time">{messageTimeInZone(message.createdAt, browserTimeZone())}</span>
                  </div>
                </div>
                {isMine ? <MemberAvatar user={currentUser} size="sm" /> : null}
              </div>
            );
          })}
          {selectedSupportUser && !activeMessages.length ? <div className="empty-state">No support messages yet.</div> : null}

          <form className="chat-composer support-composer" onSubmit={sendSupportMessage}>
            <div className="composer-shell">
              <textarea
                aria-label="Support message"
                placeholder={selectedSupportUser ? "Message support" : "Select a support conversation"}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                disabled={busy || !selectedSupportUser}
                required
              />
              <button className="primary-button" type="submit" disabled={busy || !selectedSupportUser || !body.trim()}>
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

function ChatProfileContext({
  user,
  currentUser,
  users,
  contracts,
}: {
  user: PortalUser;
  currentUser: PortalUser;
  users: PortalUser[];
  contracts: ContractRecord[];
}) {
  const profileTags = [
    ...(user.clientPreferences || []),
    ...(user.profileSkills || []),
    ...(user.profileLanguages || []),
  ].slice(0, 6);
  const userContracts = contracts.filter((contract) => contract.clientId === user.id || contract.workerId === user.id);
  const currentContracts = userContracts.filter((contract) => ["requested", "active"].includes(contract.status));
  const pastContracts = userContracts.filter((contract) => ["rejected", "ended"].includes(contract.status));
  const allUsers = [currentUser, ...users];

  return (
    <div className="chat-context-card">
      <div className="person-title">
        <div>
          <h3>{userDisplayName(user)}</h3>
          <p>{roleLabel(user.role)} - {user.companyName || user.profileTitle || user.email}</p>
        </div>
        <span className={`badge ${user.role}`}>{roleLabel(user.role)}</span>
      </div>
      <div className="mini-metrics">
        <span><strong>{user.country || user.profileLocation || "Not set"}</strong> location</span>
        <span><strong>{timeZoneDisplay(user.profileTimeZone)}</strong> timezone</span>
        <span><strong>{user.allowDirectMessages === false ? "Off" : "On"}</strong> direct messages</span>
        <span><strong>{currentContracts.length}</strong> current contracts</span>
      </div>
      {user.profileBio ? <p>{user.profileBio}</p> : null}
      {profileTags.length ? (
        <div className="badge-row">
          {profileTags.map((tag) => (
            <span className="badge" key={tag}>{tag}</span>
          ))}
        </div>
      ) : null}
      <div className="chat-contract-history">
        <h4>Current contracts</h4>
        {currentContracts.slice(0, 3).map((contract) => {
          const otherMember = userById(allUsers, contract.clientId === user.id ? contract.workerId : contract.clientId);
          return (
            <div className="mini-contract-row" key={contract.id}>
              <strong>{contract.title}</strong>
              <span>Contract ID: {contract.id}</span>
              <span>{otherMember?.name || "Member"} - {contractStatusLabel(contract.status)} - {shortDate(contract.nextPaymentDate)}</span>
            </div>
          );
        })}
        {!currentContracts.length ? <p>No current contracts.</p> : null}
        <h4>Past contracts</h4>
        {pastContracts.slice(0, 3).map((contract) => {
          const otherMember = userById(allUsers, contract.clientId === user.id ? contract.workerId : contract.clientId);
          return (
            <div className="mini-contract-row" key={contract.id}>
              <strong>{contract.title}</strong>
              <span>Contract ID: {contract.id}</span>
              <span>{otherMember?.name || "Member"} - {contractStatusLabel(contract.status)}</span>
            </div>
          );
        })}
        {!pastContracts.length ? <p>No past contracts yet.</p> : null}
      </div>
    </div>
  );
}

function ChatPostContext({ post, author }: { post: PortalPost; author?: PortalUser }) {
  return (
    <div className="chat-context-card post-context-card">
      <div className="person-title">
        <div>
          <h3>Related post</h3>
          <p>{post.title} - {author?.name || "Unknown author"}</p>
        </div>
        <span className={`badge ${post.status === "active" ? "approved" : "paused"}`}>{titleCase(post.status)}</span>
      </div>
      <p>{post.criteria}</p>
      <div className="mini-metrics">
        <span><strong>{money(post.preferredRate || 0)}</strong> rate</span>
        <span><strong>{money(post.bonusPerInterview || 0)}</strong> bonus</span>
        <span><strong>{paymentScheduleLabel(post.paymentFrequency, post.paymentWeekday) || "Flexible"}</strong> schedule</span>
      </div>
    </div>
  );
}

function ChatContractCard({
  contract,
  client,
  bidder,
  currentUser,
  busy,
  onAction,
}: {
  contract: ContractRecord;
  client?: PortalUser;
  bidder?: PortalUser;
  currentUser: PortalUser;
  busy: boolean;
  onAction: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const canRespond =
    contract.status === "requested" &&
    !isSuperAdminRole(currentUser.role) &&
    contract.requestedByUserId !== currentUser.id &&
    (contract.clientId === currentUser.id || contract.workerId === currentUser.id);

  async function updateStatus(status: ContractRecord["status"]) {
    await onAction("updateContractStatus", { contractId: contract.id, status });
  }

  return (
    <div className="chat-contract-card">
      <div className="person-title">
        <div>
          <h3>{contract.title}</h3>
          <p>Contract ID: {contract.id}</p>
        </div>
        <span className={`badge ${contractStatusClass(contract.status)}`}>{contractStatusLabel(contract.status)}</span>
      </div>
      <p>{contract.criteria}</p>
      <div className="mini-metrics compact-metrics">
        <span><strong>{client?.name || "Client"}</strong> client</span>
        <span><strong>{bidder?.name || "Bidder"}</strong> bidder</span>
        <span><strong>{contractPayTerms(contract)}</strong> pay terms</span>
        <span><strong>{contractPaymentStyleLabel(contract.paymentStyle)}</strong> style</span>
        <span><strong>{paymentScheduleLabel(contract.paymentFrequency, contract.paymentWeekday)}</strong> schedule</span>
        <span><strong>{shortDate(contract.nextPaymentDate)}</strong> next payday</span>
        <span><strong>{contractTimelineLabel(contract)}</strong> timeline</span>
      </div>
      {contract.status === "ended" ? (
        <div className="status-strip compact">
          <strong>{titleCase(contract.endType || "completed")}</strong>
          {" - "}
          {contract.paidBeforeEnding ? "Paid before ending" : "Not paid before ending"}
          {contract.endFeedback ? ` - ${contract.endFeedback}` : ""}
          {contract.endReason ? ` - ${contract.endReason}` : ""}
        </div>
      ) : null}
      {canRespond ? (
        <div className="actions">
          <button className="primary-button compact-button" type="button" disabled={busy} onClick={() => void updateStatus("active")}>
            Accept contract
          </button>
          <button className="ghost-button compact-button" type="button" disabled={busy} onClick={() => void updateStatus("rejected")}>
            Reject
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ChatView({
  data,
  busy,
  onSend,
  requestedRecipientId,
  requestedPostId,
}: {
  data: PortalData;
  busy: boolean;
  onSend: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
  requestedRecipientId: string;
  requestedPostId: string;
}) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachmentDraft[]>([]);
  const [pendingAttachmentPreview, setPendingAttachmentPreview] = useState<PendingAttachmentPreview | null>(null);
  const [chatError, setChatError] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editBody, setEditBody] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [readReceipts, setReadReceipts] = useState<Record<string, string>>(() => loadChatReadReceipts(data.currentUser.id));
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const markReadSignatureRef = useRef("");
  const currentUser = data.currentUser;
  const canSend = isActiveAccount(currentUser);
  const userTimeZone = browserTimeZone();
  const membersById = new Map<string, PortalUser>();
  [currentUser, ...data.users, ...(data.chatContacts || [])].forEach((user) => {
    membersById.set(user.id, user);
  });
  const contactUsers = (data.chatContacts || []).filter((user) => {
    if (user.id === currentUser.id || isSuperAdminRole(currentUser.role) || isSuperAdminRole(user.role)) {
      return false;
    }

    const conversationId = inboxConversationId(currentUser.id, user.id);
    const hasConversation = data.chatMessages.some((message) => chatConversationIdForMessage(message) === conversationId);
    const isRequestedRecipient = user.id === requestedRecipientId;

    if (isClientRole(currentUser.role) && !isWorkerUser(user)) {
      return false;
    }

    if (isWorkerUser(currentUser) && !isClientRole(user.role)) {
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
      title: userDisplayName(contact),
      subtitle: contact.companyName || contact.profileTitle || contact.email,
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
          const participantNames = participantIds.map((id) => userDisplayName(membersById.get(id)));
          const participantAvatar = participantIds
            .map((id) => initialsForName(membersById.get(id)?.name || ""))
            .filter(Boolean)
            .slice(0, 2)
            .join("/");

          return {
            id: `monitor:${conversationId}`,
            conversationId,
            recipientId: "",
            recipientAllowsContact: false,
            title: participantNames.join(" / ") || "Monitored conversation",
            subtitle: "Monitored conversation",
            preview: latestMessage?.deletedAt ? "Message deleted" : latestMessage?.body || latestMessage?.attachments?.[0]?.name || "No messages yet",
            avatar: participantAvatar || "IN",
            unreadCount: 0,
            monitored: true,
          };
        })
    : [];
  const conversations = [...directConversations, ...monitoredConversations];
  const activeConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) || conversations[0];
  const activeConversationId = activeConversation?.conversationId || "";
  const activeMessages = activeConversationId
    ? data.chatMessages.filter((message) => chatConversationIdForMessage(message) === activeConversationId)
    : [];
  const activeRecipient = activeConversation?.recipientId ? membersById.get(activeConversation.recipientId) : null;
  const activeParticipantIds = activeConversation?.monitored
    ? Array.from(new Set(activeMessages.flatMap((message) => [message.userId, message.recipientId || ""]).filter(Boolean)))
    : [];
  const activeParticipants = activeParticipantIds
    .map((participantId) => membersById.get(participantId))
    .filter((participant): participant is PortalUser => Boolean(participant));
  const activeRelatedPostId =
    requestedPostId ||
    [...activeMessages].reverse().find((message) => message.relatedPostId)?.relatedPostId ||
    "";
  const activeRelatedPost = data.posts.find((post) => {
    if (post.id !== activeRelatedPostId) {
      return false;
    }
    if (activeConversation?.monitored) {
      return activeParticipantIds.includes(post.authorId);
    }
    return post.authorId === currentUser.id || post.authorId === activeConversation?.recipientId;
  });
  const activeCanSendMessage =
    canSend &&
    Boolean(activeConversation) &&
    !activeConversation.monitored &&
    activeConversation.recipientAllowsContact &&
    Boolean(activeConversation.recipientId);
  const canSubmit = activeCanSendMessage && Boolean(body.trim() || attachments.length);
  const latestIncomingMessage = [...activeMessages]
    .reverse()
    .find((message) => message.userId !== currentUser.id && !message.deletedAt);
  const latestIncomingCreatedAt = latestIncomingMessage?.createdAt || "";
  const unreadIncomingSignature = activeMessages
    .filter(
      (message) => message.userId !== currentUser.id && !message.deletedAt && !message.readAt
    )
    .map((message) => message.id)
    .join("|");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [activeConversation?.id, activeMessages.length]);

  useEffect(() => {
    const conversationId = activeConversationId;
    if (!conversationId || !activeMessages.length) {
      return;
    }

    if (!latestIncomingCreatedAt || readReceipts[conversationId] === latestIncomingCreatedAt) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setReadReceipts((current) => {
        const nextReceipts = { ...current, [conversationId]: latestIncomingCreatedAt };
        saveChatReadReceipts(currentUser.id, nextReceipts);
        return nextReceipts;
      });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [activeConversationId, activeMessages.length, currentUser.id, latestIncomingCreatedAt, readReceipts]);

  useEffect(() => {
    if (!activeConversationId || activeConversation?.monitored) {
      return;
    }

    if (!unreadIncomingSignature || markReadSignatureRef.current === unreadIncomingSignature) {
      return;
    }

    markReadSignatureRef.current = unreadIncomingSignature;
    const timeout = window.setTimeout(() => {
      void onSend("markChatConversationRead", { conversationId: activeConversationId });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [activeConversation?.monitored, activeConversationId, onSend, unreadIncomingSignature]);

  function selectConversation(conversationId: string) {
    setSelectedConversationId(conversationId);
    setProfilePanelOpen(false);
    setEditingMessageId("");
    setEditBody("");
    setPendingAttachmentPreview(null);
    setChatError("");
  }

  async function sendMessageWithContent(messageBody: string, messageAttachments: ChatAttachmentDraft[]) {
    if (!activeCanSendMessage || busy || (!messageBody.trim() && !messageAttachments.length)) {
      return;
    }

    const nextData = await onSend("addChatMessage", {
      recipientId: activeConversation?.recipientId || "",
      body: messageBody,
      attachments: messageAttachments,
      relatedPostId: activeRelatedPost?.id || "",
      authorTimeZone: userTimeZone,
    });
    if (nextData) {
      setBody("");
      setAttachments([]);
      setPendingAttachmentPreview(null);
      setChatError("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function sendMessage() {
    await sendMessageWithContent(body, attachments);
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

  async function handleAttachmentFiles(selectedFiles: File[], source: "clipboard" | "file") {
    if (!selectedFiles.length) {
      return;
    }

    const remainingSlots = chatAttachmentLimit - attachments.length;
    const acceptedFiles = selectedFiles.slice(0, Math.max(0, remainingSlots));
    const skippedCount = selectedFiles.length - acceptedFiles.length;
    const nextPreviewItems: AttachmentPreviewItem[] = [];
    let nextError = skippedCount > 0 ? `Only ${chatAttachmentLimit} files can be attached to one message.` : "";

    for (const [index, file] of acceptedFiles.entries()) {
      if (file.size > maxChatAttachmentBytes) {
        nextError = "Each chat file must be 2 MB or smaller.";
        continue;
      }

      try {
        nextPreviewItems.push(await prepareChatAttachment(file, source, index));
      } catch (fileError) {
        nextError = fileError instanceof Error ? fileError.message : "File could not be read.";
      }
    }

    if (nextPreviewItems.length) {
      const hasPreviewableFile = nextPreviewItems.some((item) => item.kind !== "file");
      const nextAttachments = nextPreviewItems.map((item) => item.attachment);

      if (hasPreviewableFile) {
        setPendingAttachmentPreview({
          attachments: nextAttachments,
          previews: nextPreviewItems,
          body,
          source,
        });
      } else {
        setAttachments((current) => [...current, ...nextAttachments]);
      }
    }
    setChatError(nextError);
  }

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);
    await handleAttachmentFiles(selectedFiles, "file");
    event.target.value = "";
  }

  function handleComposerPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pastedFiles = Array.from(event.clipboardData.files || []);
    if (!pastedFiles.length) {
      return;
    }

    event.preventDefault();
    void handleAttachmentFiles(pastedFiles, "clipboard");
  }

  function updatePendingAttachmentBody(messageBody: string) {
    setPendingAttachmentPreview((current) => (current ? { ...current, body: messageBody } : current));
  }

  function addPendingAttachmentsToComposer() {
    if (!pendingAttachmentPreview) {
      return;
    }

    setBody(pendingAttachmentPreview.body);
    setAttachments((current) => [...current, ...pendingAttachmentPreview.attachments]);
    setPendingAttachmentPreview(null);
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

  async function deleteConversationById(conversationId: string) {
    if (!conversationId || !window.confirm("Delete this entire chat conversation? This removes all messages in this thread.")) {
      return;
    }

    const nextData = await onSend("deleteChatConversation", { conversationId });
    if (nextData) {
      setSelectedConversationId("");
      setEditingMessageId("");
      setEditBody("");
      setPendingAttachmentPreview(null);
      setChatError("");
    }
  }

  return (
    <section className="panel chat-panel">
      <div className={`inbox-layout ${profilePanelOpen && activeRecipient ? "profile-open" : ""}`}>
        <div className="conversation-list" aria-label="Inbox conversations">
          <div className="conversation-list-header">
            <div>
              <h2>Inbox</h2>
              <p>{conversations.length} chats</p>
            </div>
          </div>
          {conversations.map((conversation) => {
            const conversationUser = conversation.recipientId ? membersById.get(conversation.recipientId) : null;
            return (
              <div
                className={`conversation-entry ${activeConversation?.id === conversation.id ? "active" : ""}`}
                key={conversation.id}
              >
                <button
                  type="button"
                  className="conversation-button"
                  onClick={() => selectConversation(conversation.id)}
                >
                  {conversationUser ? <MemberAvatar user={conversationUser} size="md" /> : <span className="conversation-avatar">{conversation.avatar}</span>}
                  <span>
                    <strong>{conversation.title}</strong>
                    <small>{conversation.preview}</small>
                  </span>
                  {conversation.unreadCount ? <span className="conversation-badge">{conversation.unreadCount}</span> : null}
                </button>
                {isSuperAdminRole(currentUser.role) ? (
                  <ActionMenu
                    items={[
                      {
                        label: "Delete chat",
                        danger: true,
                        disabled: busy,
                        onClick: () => void deleteConversationById(conversation.conversationId),
                      },
                    ]}
                  />
                ) : null}
              </div>
            );
          })}
          {!conversations.length ? (
            <div className="empty-state compact">No inbox contacts yet.</div>
          ) : null}
        </div>

        <div className="chat-main-pane">
          <div className="chat-toolbar">
            <div className="telegram-chat-title">
              {activeRecipient ? (
                <button
                  className="telegram-avatar profile-avatar-button"
                  type="button"
                  aria-label={`Show ${userDisplayName(activeRecipient)} profile`}
                  aria-expanded={profilePanelOpen}
                  onClick={() => setProfilePanelOpen((open) => !open)}
                >
                  <MemberAvatar user={activeRecipient} size="md" />
                </button>
              ) : (
                <div className="telegram-avatar">{activeConversation?.avatar || "IN"}</div>
              )}
              {activeRecipient ? (
                <button
                  className="chat-title-button"
                  type="button"
                  aria-label={`Show ${userDisplayName(activeRecipient)} profile`}
                  onClick={() => setProfilePanelOpen((open) => !open)}
                >
                  <h2>{activeConversation?.title || "Inbox"}</h2>
                  <p>{activeConversation ? `${activeConversation.subtitle} - ${activeMessages.length} messages` : ""}</p>
                </button>
              ) : (
                <div>
                  <h2>{activeConversation?.title || "Inbox"}</h2>
                  <p>
                    {activeConversation
                      ? `${activeConversation.subtitle} - ${activeMessages.length} messages`
                      : "Choose an active member to start a conversation."}
                  </p>
                </div>
              )}
            </div>
            <div className="actions">
              {isSuperAdminRole(currentUser.role) && activeConversation ? (
                <ActionMenu
                  items={[
                    {
                      label: "Delete chat",
                      danger: true,
                      disabled: busy,
                      onClick: () => void deleteConversationById(activeConversationId),
                    },
                  ]}
                />
              ) : null}
            </div>
          </div>

          <div className="messages">
          {activeConversation?.monitored && activeParticipants.length ? (
            <div className="chat-context-card">
              <div className="person-title">
                <div>
                  <h3>Monitored conversation</h3>
                  <p>Super admin can review client-bidder communication but cannot send direct messages.</p>
                </div>
                <span className="badge super_admin">Read only</span>
              </div>
              <div className="badge-row">
                {activeParticipants.map((participant) => (
                  <span className={`badge ${participant.role}`} key={participant.id}>
                    {userDisplayName(participant)} - {roleLabel(participant.role)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {activeMessages.map((message) => {
            const deleted = Boolean(message.deletedAt);
            const isMine = message.userId === currentUser.id;
            const relatedContract = message.relatedContractId
              ? data.contracts.find((contract) => contract.id === message.relatedContractId)
              : null;
            const canEdit = !deleted && !message.relatedContractId && (isMine || isSuperAdminRole(currentUser.role));
            const canDelete = !deleted && isSuperAdminRole(currentUser.role);
            const isEditing = editingMessageId === message.id;
            const messageAttachments = message.attachments || [];
            const menuItems: ActionMenuItem[] = [];
            const authorUser = membersById.get(message.userId);
            const isCompactTextMessage = !deleted && !isEditing && Boolean(message.body) && !relatedContract && !messageAttachments.length;

            if (canEdit) {
              menuItems.push({ label: "Edit", onClick: () => startEditing(message) });
            }
            if (canDelete) {
              menuItems.push({ label: "Delete", danger: true, disabled: busy, onClick: () => void deleteMessage(message) });
            }

            return (
              <div className={`message-row ${isMine ? "mine" : ""}`} key={message.id}>
                {!isMine ? <MemberAvatar user={authorUser} size="sm" /> : null}
                <div className={`message ${isMine ? "mine" : ""} ${deleted ? "deleted" : ""} ${isCompactTextMessage ? "compact-text-message" : ""}`}>
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
                      {relatedContract ? (
                        <ChatContractCard
                          contract={relatedContract}
                          client={membersById.get(relatedContract.clientId)}
                          bidder={membersById.get(relatedContract.workerId)}
                          currentUser={currentUser}
                          busy={busy}
                          onAction={onSend}
                        />
                      ) : null}
                      <ChatAttachments attachments={messageAttachments} />
                    </>
                  )}

                  <div className="message-footer">
                    <span className="message-time">{messageTimeInZone(message.createdAt, userTimeZone)}</span>
                    {isMine ? (
                      <span
                        className={`message-check ${message.readAt ? "read" : "sent"}`}
                        aria-label={message.readAt ? "Read" : "Sent"}
                        title={message.readAt ? "Read" : "Sent"}
                      >
                        {"\u2713"}
                      </span>
                    ) : null}
                    {message.editedAt ? <span>Edited</span> : null}
                    {menuItems.length ? <ActionMenu items={menuItems} /> : null}
                  </div>
                </div>
                {isMine ? <MemberAvatar user={currentUser} size="sm" /> : null}
              </div>
            );
          })}
          {activeConversation && !activeMessages.length ? <div className="empty-state">No messages yet.</div> : null}
          <div ref={messagesEndRef} />

          {activeConversation && !activeConversation.monitored ? (
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
                  disabled={!canSend || !activeConversation.recipientAllowsContact || attachments.length >= chatAttachmentLimit}
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
                  onPaste={handleComposerPaste}
                  disabled={!canSend || !activeConversation.recipientAllowsContact}
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
                disabled={!canSend || !activeConversation.recipientAllowsContact}
                onChange={handleFileSelection}
              />
              {!canSend ? <span className="muted">Approval is required before sending inbox messages.</span> : null}
              {!activeConversation.recipientAllowsContact ? (
                <span className="muted">This member is not accepting direct messages.</span>
              ) : null}
              {chatError ? <div className="error full">{chatError}</div> : null}
              {pendingAttachmentPreview ? (
                <AttachmentPreviewModal
                  pending={pendingAttachmentPreview}
                  busy={busy}
                  canSend={activeCanSendMessage && Boolean(pendingAttachmentPreview.body.trim() || pendingAttachmentPreview.attachments.length)}
                  onBodyChange={updatePendingAttachmentBody}
                  onSend={() =>
                    void sendMessageWithContent(pendingAttachmentPreview.body, [
                      ...attachments,
                      ...pendingAttachmentPreview.attachments,
                    ])
                  }
                  onAttach={addPendingAttachmentsToComposer}
                  onClose={() => setPendingAttachmentPreview(null)}
                />
              ) : null}
            </form>
          ) : (
            <div className="chat-composer read-only-composer">
              <span className="muted">
                {activeConversation?.monitored
                  ? "Read-only monitoring. Client and bidder messages stay in their own direct thread."
                  : "No active inbox contacts are available yet."}
              </span>
            </div>
          )}
        </div>
        </div>

        {profilePanelOpen && activeRecipient ? (
          <aside className="chat-side-panel" aria-label={`${userDisplayName(activeRecipient)} profile`}>
            <div className="chat-side-header">
              <div>
                <h3>Profile info</h3>
                <p>{userDisplayName(activeRecipient)}</p>
              </div>
              <button className="icon-button" type="button" aria-label="Close profile" onClick={() => setProfilePanelOpen(false)}>
                x
              </button>
            </div>
            <ChatProfileContext
              user={activeRecipient}
              currentUser={currentUser}
              users={data.users}
              contracts={data.contracts}
            />
            {activeRelatedPost ? (
              <ChatPostContext post={activeRelatedPost} author={membersById.get(activeRelatedPost.authorId)} />
            ) : null}
          </aside>
        ) : null}
      </div>
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
        <h2>Account pending review</h2>
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
