"use client";

import { FormEvent, useState } from "react";
import type {
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
  PortalData,
  PortalUser,
  Role,
  UserStatus,
  WorkLog,
} from "./portal-types";

const paymentMethods = ["Payoneer", "BEP20", "Wise", "PayPal", "Bank transfer", "USDT TRC20", "Other"];
const defaultApiBaseUrl =
  process.env.NODE_ENV === "development" ? "http://localhost:4000" : "https://bidder-portal-be.vercel.app";
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || defaultApiBaseUrl).replace(/\/$/, "");
const portalApiUrl = `${apiBaseUrl}/api/portal`;

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

export default function PortalApp() {
  const [data, setData] = useState<PortalData | null>(null);
  const [loginEmail, setLoginEmail] = useState(() => {
    if (typeof window === "undefined") {
      return "admin@portal.local";
    }

    return window.localStorage.getItem("bidderPortalEmail") || "admin@portal.local";
  });
  const [loginName, setLoginName] = useState("");
  const [activeView, setActiveView] = useState("overview");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function postAction(action: string, payload: Record<string, unknown> = {}) {
    if (!data && action !== "signIn") {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const email = action === "signIn" ? loginEmail : data?.currentUser.email;
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
    setError("");
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    await postAction("signIn", { name: loginName });
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
            <h2>Email sign-in</h2>
            <p>New users enter as pending bidders until admin approval.</p>

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
                <span>Name</span>
                <input
                  value={loginName}
                  onChange={(event) => setLoginName(event.target.value)}
                  placeholder="Optional display name"
                />
              </label>
            </div>

            <div className="actions" style={{ marginTop: 18 }}>
              <button className="primary-button" type="submit" disabled={busy}>
                {busy ? "Signing in" : "Continue"}
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
      ? ["work", "payments", "chat"]
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
              {viewTitle(view)}
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
            {safeView === "work" ? <WorkView data={data} busy={busy} onSave={postAction} /> : null}
            {safeView === "payments" ? <PaymentsView data={data} busy={busy} onAction={postAction} /> : null}
            {safeView === "chat" ? <ChatView data={data} busy={busy} onSend={postAction} /> : null}
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

  const user = data.currentUser;
  const logs = data.workLogs.filter((log) => log.userId === user.id);
  const totalApplied = logs.reduce((total, log) => total + log.appliedJobs, 0);
  const totalInterviews = logs.reduce((total, log) => total + log.interviewsScheduled, 0);
  const earned = estimateForUser(user, logs);

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
            <h2>Bidder Totals</h2>
            <p>Your rate is visible from admin settings.</p>
          </div>
        </div>
        <div className="metric-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <div className="metric">
            <span>Applied jobs</span>
            <strong>{totalApplied}</strong>
          </div>
          <div className="metric">
            <span>Interviews</span>
            <strong>{totalInterviews}</strong>
          </div>
          <div className="metric">
            <span>Job rate</span>
            <strong>{money(user.ratePerApplication)}</strong>
          </div>
          <div className="metric">
            <span>Estimate</span>
            <strong>{money(earned)}</strong>
          </div>
        </div>
      </section>

      <section className="panel" style={{ gridColumn: "1 / -1" }}>
        <WorkLogTable logs={logs} users={[user]} />
      </section>
    </div>
  );
}

function AdminWorkLogs({ data }: { data: PortalData }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>All Bidder Logs</h2>
          <p>Daily Google Sheet links, applications, and scheduled interviews.</p>
        </div>
      </div>
      <WorkLogTable logs={data.workLogs} users={data.users} />
    </section>
  );
}

function WorkLogTable({ logs, users }: { logs: WorkLog[]; users: PortalUser[] }) {
  if (!logs.length) {
    return <div className="empty-state">No work logs yet.</div>;
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
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const user = userById(users, log.userId);
            return (
              <tr key={log.id}>
                <td>{shortDate(log.workDate)}</td>
                <td>{user?.name || "Unknown"}</td>
                <td><a href={log.sheetLink} target="_blank" rel="noreferrer">Open sheet</a></td>
                <td>{log.appliedJobs}</td>
                <td>{log.interviewsScheduled}</td>
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

function ChatView({
  data,
  busy,
  onSend,
}: {
  data: PortalData;
  busy: boolean;
  onSend: (action: string, payload: Record<string, unknown>) => Promise<PortalData | undefined>;
}) {
  const [body, setBody] = useState("");
  const currentUser = data.currentUser;
  const canSend = currentUser.status === "approved";

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextData = await onSend("addChatMessage", { body });
    if (nextData) {
      setBody("");
    }
  }

  return (
    <section className="panel chat-panel">
      <div className="messages">
        {data.chatMessages.map((message) => (
          <div className={`message ${message.userId === currentUser.id ? "mine" : ""}`} key={message.id}>
            <div className="message-meta">
              <span>{message.authorName} - {roleLabel(message.authorRole)}</span>
              <span>{dateTime(message.createdAt)}</span>
            </div>
            <p>{message.body}</p>
          </div>
        ))}
        {!data.chatMessages.length ? <div className="empty-state">No messages yet.</div> : null}
      </div>

      <form className="form-grid" onSubmit={submit}>
        <label className="field full">
          <span>Message</span>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} disabled={!canSend} required />
        </label>
        <div className="actions full">
          <button className="primary-button" type="submit" disabled={busy || !canSend}>Send message</button>
          {!canSend ? <span className="muted">Approval is required before sending group messages.</span> : null}
        </div>
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
