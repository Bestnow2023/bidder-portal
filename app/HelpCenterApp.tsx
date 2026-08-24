"use client";

import Image from "next/image";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ChatMessage, PortalData, PortalUser, Role } from "./portal-types";

type HelpView = "help" | "support";
type HelpCredentials = { email: string; sessionToken: string };

const defaultApiBaseUrl =
  process.env.NODE_ENV === "development" ? "http://localhost:4000" : "https://bp-be.digniware.com";
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || defaultApiBaseUrl).replace(/\/$/, "");
const portalApiUrl = `${apiBaseUrl}/api/portal`;
const mainPortalUrl = (process.env.NEXT_PUBLIC_MAIN_PORTAL_URL || "https://bp.digniware.com").replace(/\/$/, "");
const supportPollIntervalMs = 10000;

const publicFaq = [
  {
    question: "What is Bidder Portal?",
    answer: "Bidder Portal is the Digniware workspace for client-bidder contracts, posts, work logs, billing, reviews, and support.",
  },
  {
    question: "Do I need an account?",
    answer: "You can read public help without an account. To use support chat, contracts, billing, work logs, or private profile data, open the main portal and sign in.",
  },
  {
    question: "Why does the help site only show some guide sections?",
    answer: "When you open Help from the portal, the help site detects your signed-in role and shows only the guide content that matches your work.",
  },
  {
    question: "Where do I ask for help?",
    answer: "Use Support. It is separate from the client-bidder Inbox and is monitored by super admins.",
  },
];

const bidderFaq = [
  {
    question: "How do bidders earn?",
    answer: "Bidders earn according to the active contract payment style: fixed, hourly, per bid, per bid plus interview bonus, or regular monthly.",
  },
  {
    question: "How do I set my payout wallet?",
    answer: "Open the main portal, go to Billing or Payments, add your payout method, choose the coin and network, and save the wallet address.",
  },
  {
    question: "How do I withdraw?",
    answer: "After client releases are credited to your money balance, create a withdrawal request. Super admin reviews it, adds the payment link, and marks it completed.",
  },
  {
    question: "Can I edit a work log?",
    answer: "You can edit unpaid work logs. If a client requests changes, the notification center points you back to the exact log.",
  },
];

const clientFaq = [
  {
    question: "How do clients pay bidders?",
    answer: "Add money credit, start a contract, review approved work logs, then release payment. The bidder receives money credit and can withdraw it.",
  },
  {
    question: "How do I create posts?",
    answer: "Use Posts in the main portal. One post costs one post credit. If post credit is empty, money credit can be converted into post credit.",
  },
  {
    question: "How do bid profiles work?",
    answer: "Create reusable bid profiles with job-bidding details. Attach a profile when starting or updating a contract so the bidder can use it.",
  },
  {
    question: "How do I review work logs?",
    answer: "Open Work Logs, filter by bidder, client, or date, then approve the work log or request edits from the bidder.",
  },
];

const adminFaq = [
  {
    question: "What does super admin manage?",
    answer: "Super admin manages people, support messages, monitored inboxes, posts, contracts, disputes, credit adjustments, and billing completion.",
  },
  {
    question: "Where are user approvals?",
    answer: "Use the people area in the main portal. User statuses are pending review, active, temporarily restricted, suspended, and closed.",
  },
];

function roleLabel(role?: Role) {
  if (role === "super_admin") return "Super Admin";
  if (role === "client" || role === "admin") return "Client";
  if (role === "bidder") return "Bidder";
  if (role === "developer") return "Developer";
  return "Visitor";
}

function roleAudience(user?: PortalUser | null) {
  if (!user) return "public";
  if (user.role === "client" || user.role === "admin") return "client";
  if (user.role === "bidder" || user.role === "developer") return "bidder";
  if (user.role === "super_admin") return "super_admin";
  return "public";
}

function supportConversationIdForUser(userId: string) {
  return `support__${userId}`;
}

function chatConversationIdForMessage(message: ChatMessage) {
  if (message.conversationId) {
    return message.conversationId;
  }
  return message.recipientId ? [message.userId, message.recipientId].sort().join("__") : "";
}

function userDisplayName(user?: PortalUser | null) {
  return user?.name || user?.email || "Member";
}

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function messageTime(value: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "HC";
}

function readInitialCredentials(): HelpCredentials {
  if (typeof window === "undefined") {
    return { email: "", sessionToken: "" };
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const hashEmail = hashParams.get("email") || "";
  const hashSessionToken = hashParams.get("sessionToken") || "";
  if (hashEmail && hashSessionToken) {
    window.localStorage.setItem("bidderPortalHelpEmail", hashEmail);
    window.localStorage.setItem("bidderPortalHelpSessionToken", hashSessionToken);
    window.history.replaceState({}, "", window.location.pathname);
    return { email: hashEmail, sessionToken: hashSessionToken };
  }

  return {
    email: window.localStorage.getItem("bidderPortalHelpEmail") || "",
    sessionToken: window.localStorage.getItem("bidderPortalHelpSessionToken") || "",
  };
}

function Avatar({ user }: { user?: PortalUser | null }) {
  return (
    <span className="help-avatar">
      {user?.profileImageDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.profileImageDataUrl} alt={userDisplayName(user)} />
      ) : (
        initials(userDisplayName(user))
      )}
    </span>
  );
}

export default function HelpCenterApp({ view }: { view: HelpView }) {
  const [credentials, setCredentials] = useState<HelpCredentials>({ email: "", sessionToken: "" });
  const [data, setData] = useState<PortalData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadPortalData = useCallback(async (nextCredentials: HelpCredentials, quiet = false) => {
    if (!nextCredentials.email || !nextCredentials.sessionToken) {
      return;
    }

    if (!quiet) {
      setBusy(true);
    }
    setError("");

    try {
      const response = await fetch(portalApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refreshPortal",
          email: nextCredentials.email,
          sessionToken: nextCredentials.sessionToken,
        }),
      });
      const nextData = await response.json();
      if (!response.ok) {
        throw new Error(nextData.error || "Could not connect your portal session.");
      }
      setData(nextData);
      if (nextData.sessionToken) {
        const syncedCredentials = { email: nextData.currentUser.email, sessionToken: nextData.sessionToken };
        setCredentials(syncedCredentials);
        window.localStorage.setItem("bidderPortalHelpEmail", syncedCredentials.email);
        window.localStorage.setItem("bidderPortalHelpSessionToken", syncedCredentials.sessionToken);
      }
    } catch (loadError) {
      if (!quiet) {
        setError(loadError instanceof Error ? loadError.message : "Could not connect your portal session.");
      }
    } finally {
      if (!quiet) {
        setBusy(false);
      }
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextCredentials = readInitialCredentials();
      setCredentials(nextCredentials);
      void loadPortalData(nextCredentials);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadPortalData]);

  useEffect(() => {
    if (!data || view !== "support") {
      return;
    }

    const interval = window.setInterval(() => {
      void loadPortalData(credentials, true);
    }, supportPollIntervalMs);
    return () => window.clearInterval(interval);
  }, [credentials, data, loadPortalData, view]);

  async function sendSupportMessage(payload: Record<string, unknown>) {
    if (!credentials.email || !credentials.sessionToken) {
      setError("Open Help from the main portal to start a support chat.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch(portalApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addSupportMessage",
          email: credentials.email,
          sessionToken: credentials.sessionToken,
          ...payload,
        }),
      });
      const nextData = await response.json();
      if (!response.ok) {
        throw new Error(nextData.error || "Could not send support message.");
      }
      setData(nextData);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send support message.");
    } finally {
      setBusy(false);
    }
  }

  const currentUser = data?.currentUser || null;
  const audience = roleAudience(currentUser);

  return (
    <main className="help-shell">
      <header className="help-topbar">
        <a className="help-brand" href="/help">
          <Image className="help-logo" src="/digniware-logo-light.png" alt="Digniware" width={52} height={52} />
          <span>
            <strong>Help Center</strong>
            <small>Bidder Portal guides and support</small>
          </span>
        </a>
        <nav className="help-nav" aria-label="Help Center navigation">
          <a className={view === "help" ? "active" : ""} href="/help">Help</a>
          <a className={view === "support" ? "active" : ""} href="/support">Support</a>
        </nav>
        <div className="help-user-chip">
          {currentUser ? (
            <>
              <Avatar user={currentUser} />
              <span>
                <strong>{userDisplayName(currentUser)}</strong>
                <small>{roleLabel(currentUser.role)}</small>
              </span>
            </>
          ) : (
            <a className="ghost-button compact-button" href={mainPortalUrl} target="_blank" rel="noreferrer">
              Open Portal
            </a>
          )}
        </div>
      </header>

      {error ? <div className="help-alert">{error}</div> : null}

      {view === "support" ? (
        <SupportCenter
          data={data}
          busy={busy}
          onSend={sendSupportMessage}
          onReconnect={() => void loadPortalData(credentials)}
        />
      ) : (
        <HelpDashboard currentUser={currentUser} audience={audience} busy={busy} />
      )}
    </main>
  );
}

function HelpDashboard({
  currentUser,
  audience,
  busy,
}: {
  currentUser: PortalUser | null;
  audience: string;
  busy: boolean;
}) {
  const faqItems = useMemo(() => {
    if (audience === "client") return clientFaq;
    if (audience === "bidder") return bidderFaq;
    if (audience === "super_admin") return adminFaq;
    return publicFaq;
  }, [audience]);

  return (
    <>
      <section className="help-hero">
        <div>
          <span className="eyebrow">Digniware LLC</span>
          <h1>Help Center</h1>
          <p>
            Learn how Bidder Portal works, how to set up your account, and how to use support without exposing the full portal on the help domain.
          </p>
          <div className="help-actions">
            <a className="primary-button compact-button" href="/support">Open Support</a>
            <a className="ghost-button compact-button" href="https://digniware.com" target="_blank" rel="noreferrer">Digniware.com</a>
          </div>
        </div>
        <div className="help-session-card">
          <strong>{currentUser ? `Signed in as ${roleLabel(currentUser.role)}` : "Public guide"}</strong>
          <span>
            {currentUser
              ? "Your guide is filtered to your portal role."
              : busy
                ? "Checking your portal session..."
                : "Open Help from the main portal to see role-specific instructions."}
          </span>
        </div>
      </section>

      {audience === "client" ? <ClientGuide /> : null}
      {audience === "bidder" ? <BidderGuide /> : null}
      {audience === "super_admin" ? <SuperAdminGuide /> : null}
      {audience === "public" ? <PublicGuide /> : null}

      <section className="help-panel">
        <div className="help-panel-heading">
          <h2>FAQ</h2>
          <p>{audience === "public" ? "General questions before signing in." : `${roleLabel(currentUser?.role)} questions for your workflow.`}</p>
        </div>
        <div className="faq-list">
          {faqItems.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

function PublicGuide() {
  return (
    <section className="help-grid-two">
      <article className="help-panel">
        <h2>For Clients</h2>
        <p>Clients add credit, review bidders, create contracts, approve work logs, release payments, and give feedback when contracts end.</p>
        <ul>
          <li>Create or fund your account in the main portal.</li>
          <li>Search bidders and review profiles, current contracts, work history summaries, and reviews.</li>
          <li>Start contracts with payment terms and timelines.</li>
        </ul>
      </article>
      <article className="help-panel">
        <h2>For Bidders</h2>
        <p>Bidders create profiles, receive contracts, log work, manage payout wallets, and withdraw money credit after client releases.</p>
        <ul>
          <li>Complete your profile and payout method.</li>
          <li>Review contract details and assigned bid profiles.</li>
          <li>Submit work logs and respond to edit requests.</li>
        </ul>
      </article>
    </section>
  );
}

function ClientGuide() {
  return (
    <section className="help-panel">
      <div className="help-panel-heading">
        <h2>Client Setup Guide</h2>
        <p>Only client-related instructions are shown for your account.</p>
      </div>
      <div className="step-grid">
        <article><strong>1. Complete profile</strong><span>Add name, company, country, timezone, and preferences.</span></article>
        <article><strong>2. Add credit</strong><span>Use Billing to add money credit. Post credit can be used for posting.</span></article>
        <article><strong>3. Find bidders</strong><span>Search by skills, location, timezone, rate, rating, and current contract status.</span></article>
        <article><strong>4. Start contract</strong><span>Set payment style, rates, bonus, next payday, timeline, and attached bid profile.</span></article>
        <article><strong>5. Review work</strong><span>Approve work logs or request edits. Approved logs can be paid.</span></article>
        <article><strong>6. Release payment</strong><span>Money credit moves from client balance to bidder balance. Super admin completes withdrawals later.</span></article>
      </div>
    </section>
  );
}

function BidderGuide() {
  return (
    <section className="help-panel">
      <div className="help-panel-heading">
        <h2>Bidder Setup Guide</h2>
        <p>Only bidder-related instructions are shown for your account.</p>
      </div>
      <div className="step-grid">
        <article><strong>1. Complete profile</strong><span>Add name, country, timezone, skills, language level, and profile image.</span></article>
        <article><strong>2. Set payout wallet</strong><span>Add your crypto payout method, coin, network, and wallet address.</span></article>
        <article><strong>3. Review contracts</strong><span>Open contract details to see criteria, pay style, timeline, next payday, and client bid profile.</span></article>
        <article><strong>4. Log work</strong><span>Add work logs by client and date with sheet link, applied jobs, interviews, and notes.</span></article>
        <article><strong>5. Watch notifications</strong><span>You will be notified for contract updates, work-log edit requests, client messages, and payments.</span></article>
        <article><strong>6. Withdraw balance</strong><span>Request withdrawal from your money credit balance after client releases are credited.</span></article>
      </div>
    </section>
  );
}

function SuperAdminGuide() {
  return (
    <section className="help-panel">
      <div className="help-panel-heading">
        <h2>Super Admin Guide</h2>
        <p>Use the main portal to manage people, support, monitored inboxes, contracts, posts, disputes, credit, and billing.</p>
      </div>
      <div className="step-grid">
        <article><strong>People</strong><span>Activate, restrict, suspend, close, or remove accounts.</span></article>
        <article><strong>Support</strong><span>Reply to support conversations from the help center.</span></article>
        <article><strong>Billing</strong><span>Mark withdrawals completed and add payment links.</span></article>
      </div>
    </section>
  );
}

function SupportCenter({
  data,
  busy,
  onSend,
  onReconnect,
}: {
  data: PortalData | null;
  busy: boolean;
  onSend: (payload: Record<string, unknown>) => Promise<void>;
  onReconnect: () => void;
}) {
  const [body, setBody] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const currentUser = data?.currentUser || null;
  const isSuperAdmin = currentUser?.role === "super_admin";
  const contacts = data?.supportContacts || [];
  const messages = data?.supportMessages || [];
  const selectedContact = isSuperAdmin
    ? contacts.find((contact) => contact.id === selectedUserId) || contacts[0]
    : contacts[0];
  const conversationId = selectedContact
    ? supportConversationIdForUser(isSuperAdmin ? selectedContact.id : currentUser?.id || "")
    : "";
  const activeMessages = conversationId
    ? messages.filter((message) => chatConversationIdForMessage(message) === conversationId)
    : [];

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!body.trim() || !currentUser || !selectedContact) {
      return;
    }
    await onSend({
      recipientId: isSuperAdmin ? selectedContact.id : "",
      body,
      authorTimeZone: browserTimeZone(),
    });
    setBody("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  if (!currentUser) {
    return (
      <section className="help-panel support-gate">
        <h1>Support Center</h1>
        <p>Open Help from the main portal to start support chat with your signed-in account.</p>
        <div className="help-actions">
          <a className="primary-button compact-button" href={mainPortalUrl} target="_blank" rel="noreferrer">Open Portal</a>
          <button className="ghost-button compact-button" type="button" onClick={onReconnect} disabled={busy}>Reconnect session</button>
        </div>
      </section>
    );
  }

  return (
    <section className="support-workspace">
      {isSuperAdmin ? (
        <aside className="support-sidebar">
          <h2>Support chats</h2>
          {contacts.map((contact) => (
            <button
              className={selectedContact?.id === contact.id ? "active" : ""}
              key={contact.id}
              type="button"
              onClick={() => setSelectedUserId(contact.id)}
            >
              <Avatar user={contact} />
              <span>
                <strong>{userDisplayName(contact)}</strong>
                <small>{roleLabel(contact.role)}</small>
              </span>
            </button>
          ))}
          {!contacts.length ? <p className="muted">No support conversations yet.</p> : null}
        </aside>
      ) : null}

      <div className="support-chat">
        <div className="support-chat-header">
          <div>
            <h1>Support Center</h1>
            <p>{isSuperAdmin ? "Reply to user support requests." : "Chat with super admin support."}</p>
          </div>
          <span className="badge">{activeMessages.length} messages</span>
        </div>

        <div className="support-message-list">
          {activeMessages.map((message) => {
            const mine = message.userId === currentUser.id;
            return (
              <div className={`support-message-row ${mine ? "mine" : ""}`} key={message.id}>
                <div className={`support-message ${mine ? "mine" : ""}`}>
                  <p>{message.deletedAt ? "Message deleted" : message.body}</p>
                  <span>{messageTime(message.createdAt)}</span>
                </div>
              </div>
            );
          })}
          {!activeMessages.length ? <div className="empty-state">No support messages yet.</div> : null}
        </div>

        <form className="support-composer" onSubmit={submit}>
          <textarea
            aria-label="Support message"
            placeholder={selectedContact ? "Message support" : "No support contact available"}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={busy || !selectedContact}
          />
          <button className="primary-button compact-button" type="submit" disabled={busy || !body.trim() || !selectedContact}>Send</button>
        </form>
      </div>
    </section>
  );
}
