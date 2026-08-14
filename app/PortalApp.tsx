"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import type {
  ChatAttachment,
  ChatMessage,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
  PortalData,
  PortalUser,
  Role,
  UserStatus,
  WorkLog,
} from "./portal-types";

type AuthMode = "signIn" | "signUp";

const paymentMethods = ["Payoneer", "BEP20", "Wise", "PayPal", "Bank transfer", "USDT TRC20", "Other"];
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

const demoAccounts = [
  { label: "Admin", email: "admin@portal.local", name: "Admin Owner" },
  { label: "Approved bidder", email: "maya.bidder@example.com", name: "Maya Bidder" },
  { label: "Pending bidder", email: "pending.bidder@example.com", name: "Pending Bidder" },
];

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

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function roleLabel(role: Role) {
  if (role === "admin") return "Admin";
  if (role === "developer") return "Developer";
  return "Bidder";
}

function statusLabel(status: UserStatus) {
  return titleCase(status);
}

function viewTitle(view: string) {
  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    overview: "Operations",
    people: "People",
    work: "Work Logs",
    payments: "Payments",
    chat: "Group Chat",
  };
  return titles[view] || "Portal";
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

function userById(users: PortalUser[], userId: string) {
  return users.find((user) => user.id === userId);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dateAtMidnight(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
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
};

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

  if (range.startDate && !range.endDate) {
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
  const [activeView, setActiveView] = useState("overview");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() =>
    typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"
  );
  const latestChatMessageIdRef = useRef("");

  const refreshPortalData = useCallback(async (email: string, silent = false) => {
    if (!email) {
      return;
    }

    if (!silent) {
      setBusy(true);
      setError("");
    }

    try {
      const response = await fetch(`${portalApiUrl}?email=${encodeURIComponent(email)}`);
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
    if (!data?.currentUser.email) {
      return;
    }

    const email = data.currentUser.email;
    const interval = window.setInterval(() => {
      void refreshPortalData(email, true);
    }, chatPollIntervalMs);

    return () => window.clearInterval(interval);
  }, [data?.currentUser.email, refreshPortalData]);

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

      if (incomingMessages.length && activeView !== "chat") {
        window.setTimeout(() => setChatUnreadCount((count) => count + incomingMessages.length), 0);
        const lastIncoming = incomingMessages[incomingMessages.length - 1];
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("Bidder Portal", { body: chatNotificationText(lastIncoming) });
        }
      }

      latestChatMessageIdRef.current = latestMessage.id;
    }

    if (activeView === "chat") {
      window.setTimeout(() => setChatUnreadCount(0), 0);
    }
  }, [activeView, data]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.title = chatUnreadCount > 0 ? `(${chatUnreadCount}) Bidder Work Portal` : "Bidder Work Portal";
  }, [chatUnreadCount]);

  async function enableChatNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
  }

  async function postAction(action: string, payload: Record<string, unknown> = {}) {
    if (!data && action !== "signIn" && action !== "signUp") {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const email = action === "signIn" || action === "signUp" ? loginEmail : data?.currentUser.email;
      const response = await fetch(portalApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email, ...payload }),
      });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Portal API returned ${contentType || "non-JSON"} from ${portalApiUrl}. Check NEXT_PUBLIC_API_BASE_URL.`);
      }

      const nextData = await response.json();
      if (!response.ok) {
        throw new Error(nextData.error || "Action failed.");
      }

      setData(nextData);
      setLoginEmail(nextData.currentUser.email);
      window.localStorage.setItem("bidderPortalEmail", nextData.currentUser.email);
      return nextData as PortalData;
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    window.localStorage.removeItem("bidderPortalEmail");
    setData(null);
    setActiveView("overview");
    setChatUnreadCount(0);
    latestChatMessageIdRef.current = "";
    setError("");
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    await postAction(authMode, { name: loginName });
  }

  function switchAuthMode(nextAuthMode: AuthMode) {
    setAuthMode(nextAuthMode);
    setError("");
  }

  if (!data) {
    return (
      <main className="app login-page">
        <section className="login-card">
          <div className="login-story">
            <div className="brand-mark">BP</div>
            <h1>Bidder Work Portal</h1>
            <p>
              Sign in with email, log bidder work, keep payment method details in one place,
              and let admin manage approvals, rates, next payout dates, history, and chat.
            </p>
            <div className="login-stats">
              <div>
                <strong>3</strong>
                <span>Roles ready</span>
              </div>
              <div>
                <strong>Daily</strong>
                <span>Work logging</span>
              </div>
              <div>
                <strong>No Stripe</strong>
                <span>Manual payment records</span>
              </div>
            </div>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <h2>{authMode === "signUp" ? "Sign up" : "Email sign-in"}</h2>
            <p>{authMode === "signUp" ? "New users enter as pending bidders until admin approval." : "Use your approved email to enter the portal."}</p>

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

            {!isLiveMode && authMode === "signIn" ? (
              <div className="quick-login">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setLoginEmail(account.email);
                    setLoginName(account.name);
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
            </div>

            <div className="actions" style={{ marginTop: 18 }}>
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? "Please wait" : authMode === "signUp" ? "Create account" : "Sign in"}
              </button>
            </div>

            {error ? <div className="error">{error}</div> : null}
          </form>
        </section>
      </main>
    );
  }

  const currentUser = data.currentUser;
  const isAdmin = currentUser.role === "admin";
  const availableViews = isAdmin
    ? ["overview", "people", "work", "payments", "chat"]
    : currentUser.role === "bidder"
      ? ["dashboard", "work", "payments", "chat"]
      : ["payments", "chat"];
  const safeView = availableViews.includes(activeView) ? activeView : availableViews[0];

  return (
    <main className="app portal-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-mark" style={{ background: "#0f766e", color: "#fff" }}>BP</div>
          <div className="sidebar-title">
            <strong>Bidder Portal</strong>
            <span>Work and payments</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Portal navigation">
          {availableViews.map((view) => (
            <button
              key={view}
              className={`nav-button ${safeView === view ? "active" : ""}`}
              onClick={() => setActiveView(view)}
              type="button"
            >
              <span>{viewTitle(view)}</span>
              {view === "chat" && chatUnreadCount > 0 ? <span className="nav-badge">{chatUnreadCount}</span> : null}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <strong>{currentUser.name}</strong>
            <span>{currentUser.email}</span>
            <div className="badge-row">
              <span className={`badge ${currentUser.role}`}>{roleLabel(currentUser.role)}</span>
              <span className={`badge ${currentUser.status}`}>{statusLabel(currentUser.status)}</span>
            </div>
            <button className="ghost-button" type="button" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <h1>{viewTitle(safeView)}</h1>
            <p>{isAdmin ? "Approve users, set rates, schedule payouts, and keep bidder records tidy." : "Log your bidder activity and keep payment details current."}</p>
          </div>
          <div className="badge-row">
            <span className={`badge ${currentUser.role}`}>{roleLabel(currentUser.role)}</span>
            <span className={`badge ${currentUser.status}`}>{statusLabel(currentUser.status)}</span>
          </div>
        </header>

        {error ? <div className="error" style={{ marginBottom: 16 }}>{error}</div> : null}

        {!isAdmin && currentUser.status !== "approved" ? (
          <PendingView data={data} busy={busy} onSaveMethod={postAction} />
        ) : (
          <>
            {safeView === "overview" && isAdmin ? <AdminOverview data={data} /> : null}
            {safeView === "people" && isAdmin ? <PeopleView data={data} busy={busy} onSave={postAction} /> : null}
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
  const nonAdmins = data.users.filter((user) => user.role !== "admin");
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

function PeopleView({
  data,
  busy,
  onSave,
}: {
  data: PortalData;
  busy: boolean;
  onSave: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>User Management</h2>
          <p>Approve bidders, assign roles, and set payment rates.</p>
        </div>
      </div>
      <div className="people-list">
        {data.users.map((user) => (
          <UserEditor key={user.id} user={user} busy={busy} onSave={onSave} />
        ))}
      </div>
    </section>
  );
}

function UserEditor({
  user,
  busy,
  onSave,
}: {
  user: PortalUser;
  busy: boolean;
  onSave: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const [draft, setDraft] = useState({
    name: user.name,
    role: user.role,
    status: user.status,
    ratePerApplication: String(user.ratePerApplication),
    bonusPerInterview: String(user.bonusPerInterview),
    nextPaymentDate: user.nextPaymentDate,
    paymentSchedule: user.paymentSchedule,
  });

  const adminRole = draft.role === "admin";

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave("updateUser", {
      targetUserId: user.id,
      name: draft.name,
      role: draft.role,
      status: draft.status,
      ratePerApplication: Number(draft.ratePerApplication),
      bonusPerInterview: Number(draft.bonusPerInterview),
      nextPaymentDate: draft.nextPaymentDate,
      paymentSchedule: draft.paymentSchedule,
    });
  }

  return (
    <form className="person-editor" onSubmit={submit}>
      <div className="person-title">
        <div>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
        </div>
        <div className="badge-row">
          <span className={`badge ${user.role}`}>{roleLabel(user.role)}</span>
          <span className={`badge ${user.status}`}>{statusLabel(user.status)}</span>
        </div>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Name</span>
          <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </label>
        <label className="field">
          <span>Role</span>
          <select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as Role })}>
            <option value="bidder">Bidder</option>
            <option value="developer">Developer</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as UserStatus })}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paused">Paused</option>
          </select>
        </label>
        <label className="field">
          <span>Next payment</span>
          <input
            type="date"
            value={draft.nextPaymentDate}
            disabled={adminRole}
            onChange={(event) => setDraft({ ...draft, nextPaymentDate: event.target.value })}
          />
        </label>
        <label className="field">
          <span>Rate per applied job</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.ratePerApplication}
            disabled={adminRole}
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
            disabled={adminRole}
            onChange={(event) => setDraft({ ...draft, bonusPerInterview: event.target.value })}
          />
        </label>
        <label className="field full">
          <span>Payment schedule</span>
          <input
            value={draft.paymentSchedule}
            disabled={adminRole}
            onChange={(event) => setDraft({ ...draft, paymentSchedule: event.target.value })}
            placeholder="Weekly on Friday, biweekly, monthly..."
          />
        </label>
      </div>

      {draft.role === "developer" ? (
        <div className="developer-note">Developer work tracking is reserved for the next phase; payment records can still be managed manually.</div>
      ) : null}

      <div className="actions">
        <button className="primary-button" type="submit" disabled={busy}>
          Save user
        </button>
      </div>
    </form>
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
  if (data.currentUser.role === "admin") {
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
            <button className="primary-button" type="submit" disabled={busy}>Save daily log</button>
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
        <WorkLogTable logs={logs} users={[user]} emptyMessage="No unpaid work logs match this date filter." />
      </section>
    </div>
  );
}

function AdminWorkLogs({ data }: { data: PortalData }) {
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: "", endDate: "" });
  const logs = filterWorkLogsByDate(data.workLogs, dateRange);

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>All Bidder Logs</h2>
          <p>Daily Google Sheet links, applications, and scheduled interviews.</p>
        </div>
      </div>
      <DateRangeFilter range={dateRange} onChange={setDateRange} />
      <WorkLogTable logs={logs} users={data.users} emptyMessage="No work logs match this date filter." />
    </section>
  );
}

function DateRangeFilter({
  range,
  onChange,
}: {
  range: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const hasFilter = Boolean(range.startDate || range.endDate);

  return (
    <div className="filter-bar">
      <label className="field">
        <span>Date or start</span>
        <input
          type="date"
          value={range.startDate}
          onChange={(event) => onChange({ ...range, startDate: event.target.value })}
        />
      </label>
      <label className="field">
        <span>End date</span>
        <input
          type="date"
          value={range.endDate}
          onChange={(event) => onChange({ ...range, endDate: event.target.value })}
        />
      </label>
      <button
        className="ghost-button"
        type="button"
        disabled={!hasFilter}
        onClick={() => onChange({ startDate: "", endDate: "" })}
      >
        Clear
      </button>
    </div>
  );
}

function WorkLogTable({
  logs,
  users,
  payments = [],
  showPaymentStatus = false,
  emptyMessage = "No work logs yet.",
}: {
  logs: WorkLog[];
  users: PortalUser[];
  payments?: PaymentRecord[];
  showPaymentStatus?: boolean;
  emptyMessage?: string;
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
  if (data.currentUser.role === "admin") {
    return <AdminPayments data={data} busy={busy} onAction={onAction} />;
  }

  return <UserPayments data={data} busy={busy} onAction={onAction} />;
}

function PaymentMethodForm({
  busy,
  onSave,
}: {
  busy: boolean;
  onSave: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const [method, setMethod] = useState("Payoneer");
  const [address, setAddress] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextData = await onSave("savePaymentMethod", { method, address });
    if (nextData) {
      setAddress("");
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
        <button className="primary-button" type="submit" disabled={busy}>Save payment method</button>
      </div>
    </form>
  );
}

function PaymentMethodList({ methods }: { methods: PaymentMethod[] }) {
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
          {method.isPrimary ? <span className="badge bidder">Primary</span> : null}
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
        <PaymentMethodForm busy={busy} onSave={onAction} />
        <div style={{ marginTop: 16 }}>
          <PaymentMethodList methods={methods} />
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
            <p>Admin-added payout records and receipt links.</p>
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
  const payableUsers = data.users.filter((user) => user.role !== "admin");
  const [draft, setDraft] = useState({
    userId: payableUsers[0]?.id || "",
    periodStart: today(),
    periodEnd: today(),
    scheduledDate: today(),
    amount: "",
    status: "scheduled" as PaymentStatus,
    paymentLink: "",
    memo: "",
  });

  const selectedUser = payableUsers.find((user) => user.id === draft.userId);
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextData = await onAction("addPayment", {
      userId: draft.userId,
      periodStart: draft.periodStart,
      periodEnd: draft.periodEnd,
      scheduledDate: draft.scheduledDate,
      amount: Number(draft.amount),
      status: draft.status,
      paymentLink: draft.paymentLink,
      memo: draft.memo,
    });
    if (nextData) {
      setDraft({ ...draft, amount: "", paymentLink: "", memo: "" });
    }
  }

  return (
    <div className="two-column">
      <PaydayReminder reminders={paydayReminders} />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Add Payment Record</h2>
            <p>Set schedule, status, amount, and the payment link after payout.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={submit}>
          <label className="field full">
            <span>User</span>
            <select value={draft.userId} onChange={(event) => setDraft({ ...draft, userId: event.target.value })} required>
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
            <span>Scheduled date</span>
            <input type="date" value={draft.scheduledDate} onChange={(event) => setDraft({ ...draft, scheduledDate: event.target.value })} required />
          </label>
          <label className="field">
            <span>Amount</span>
            <input type="number" min="0" step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} placeholder={money(suggestedAmount)} required />
          </label>
          <label className="field">
            <span>Status</span>
            <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as PaymentStatus })}>
              <option value="scheduled">Scheduled</option>
              <option value="paid">Paid</option>
            </select>
          </label>
          <label className="field">
            <span>Payment link</span>
            <input value={draft.paymentLink} onChange={(event) => setDraft({ ...draft, paymentLink: event.target.value })} placeholder="Receipt or transfer link" />
          </label>
          <label className="field full">
            <span>Memo</span>
            <textarea value={draft.memo} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} />
          </label>
          <div className="actions full">
            <button className="primary-button" type="submit" disabled={busy || !payableUsers.length}>Save payment</button>
            <button className="ghost-button" type="button" onClick={() => setDraft({ ...draft, amount: String(suggestedAmount.toFixed(2)) })}>
              Use estimate
            </button>
          </div>
        </form>
      </section>

      <div className="payment-side-column">
        <UpcomingPaymentsPanel payments={upcomingPayments} />

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Payment Methods</h2>
              <p>Saved payout destinations from non-admin users.</p>
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
            <p>All scheduled and paid records.</p>
          </div>
        </div>
        <PaymentTable payments={data.payments} users={data.users} />
      </section>
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

function PaymentTable({ payments, users }: { payments: PaymentRecord[]; users: PortalUser[] }) {
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
            <th>Scheduled</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Link</th>
            <th>Memo</th>
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
              </tr>
            );
          })}
        </tbody>
      </table>
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
}: {
  data: PortalData;
  busy: boolean;
  notificationsEnabled: boolean;
  onEnableNotifications: () => Promise<void>;
  onSend: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachmentDraft[]>([]);
  const [chatError, setChatError] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editBody, setEditBody] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentUser = data.currentUser;
  const canSend = currentUser.status === "approved";
  const userTimeZone = browserTimeZone();
  const notificationSupported = typeof window !== "undefined" && "Notification" in window;
  const canSubmit = canSend && Boolean(body.trim() || attachments.length);

  async function sendMessage() {
    if (!canSubmit || busy) {
      return;
    }

    const nextData = await onSend("addChatMessage", {
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
        <span className="badge bidder">{data.chatMessages.length} messages</span>
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

      <div className="messages">
        {data.chatMessages.map((message) => {
          const deleted = Boolean(message.deletedAt);
          const isMine = message.userId === currentUser.id;
          const canManage = !deleted && (isMine || currentUser.role === "admin");
          const isEditing = editingMessageId === message.id;
          const messageAttachments = message.attachments || [];

          return (
            <div className={`message ${isMine ? "mine" : ""} ${deleted ? "deleted" : ""}`} key={message.id}>
              <div className="message-meta">
                <span>{message.authorName} - {roleLabel(message.authorRole)}</span>
                <span className="message-times">
                  <span>Local {dateTimeInZone(message.createdAt, message.authorTimeZone || userTimeZone)}</span>
                  <span>Admin {dateTimeInZone(message.createdAt, adminTimeZone)}</span>
                </span>
              </div>

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
                  {message.editedAt ? <span className="edited-label">Edited</span> : null}
                </>
              )}

              {canManage ? (
                <div className="message-actions">
                  <button className="ghost-button" type="button" onClick={() => startEditing(message)}>
                    Edit
                  </button>
                  <button className="danger-button" type="button" disabled={busy} onClick={() => void deleteMessage(message)}>
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
        {!data.chatMessages.length ? <div className="empty-state">No messages yet.</div> : null}
      </div>

      <form className="chat-composer" onSubmit={submit}>
        <label className="field full">
          <span>Message</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            disabled={!canSend}
            required={!attachments.length}
          />
        </label>

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

        <input
          ref={fileInputRef}
          className="file-input"
          type="file"
          multiple
          disabled={!canSend}
          onChange={handleFileSelection}
        />

        <div className="actions full">
          <button className="ghost-button" type="button" disabled={!canSend || attachments.length >= chatAttachmentLimit} onClick={() => fileInputRef.current?.click()}>
            Attach file
          </button>
          <button className="primary-button" type="submit" disabled={busy || !canSubmit}>
            Send message
          </button>
          {!canSend ? <span className="muted">Approval is required before sending group messages.</span> : null}
        </div>
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

  return (
    <div className="pending-box">
      <div className="status-strip">
        <h2>Account pending approval</h2>
        <p>
          Admin can approve your account, set your bidder rate, set your interview bonus,
          and schedule your next payment.
        </p>
      </div>

      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Payment Method</h2>
              <p>You can save payout details while waiting.</p>
            </div>
          </div>
          <PaymentMethodForm busy={busy} onSave={onSaveMethod} />
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Saved Details</h2>
              <p>Admin will see the selected method and address.</p>
            </div>
          </div>
          <PaymentMethodList methods={methods} />
        </section>
      </div>
    </div>
  );
}
