import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("keeps the bidder portal as the primary screen", async () => {
  const [page, operationsPage, chatPage, layout, portalApp, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/operations/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/chat/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/PortalApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<PortalApp \/>/);
  assert.match(operationsPage, /<PortalApp \/>/);
  assert.match(chatPage, /<PortalApp \/>/);
  assert.match(layout, /Bidder Work Portal/);
  assert.match(layout, /favicon\.png/);
  assert.match(portalApp, /digniware-logo-dark\.png/);
  assert.match(portalApp, /digniware-logo-light\.png/);
  assert.match(portalApp, /Email and password sign-in/);
  assert.match(portalApp, /Password/);
  assert.match(portalApp, /Sign up/);
  assert.match(portalApp, /Requested role/);
  assert.match(portalApp, /Super Admin/);
  assert.match(portalApp, /Assigned client/);
  assert.match(portalApp, /Dashboard/);
  assert.match(portalApp, /My Profile/);
  assert.match(portalApp, /Client Search/);
  assert.match(portalApp, /Work Summary/);
  assert.match(portalApp, /Bidder Settings/);
  assert.match(portalApp, /All Work Logs/);
  assert.match(portalApp, /Unpaid Work Logs/);
  assert.match(portalApp, /Select bidder/);
  assert.match(portalApp, /Date filter/);
  assert.match(portalApp, /Specific date/);
  assert.match(portalApp, /This week/);
  assert.match(portalApp, /Last week/);
  assert.match(portalApp, /Last 7 days/);
  assert.match(portalApp, /Yesterday/);
  assert.match(portalApp, /Custom range/);
  assert.match(portalApp, /Daily Bidder Log/);
  assert.match(portalApp, /Payment History/);
  assert.match(portalApp, /Payday Reminder/);
  assert.match(portalApp, /Upcoming Payments/);
  assert.match(portalApp, /Group Chat/);
  assert.match(portalApp, /Bidder Group/);
  assert.match(portalApp, /Enable notifications/);
  assert.match(portalApp, /Attach/);
  assert.match(portalApp, /aria-label="Actions"/);
  assert.match(portalApp, /Save edit/);
  assert.match(portalApp, /Save changes/);
  assert.match(portalApp, /Forgot password/);
  assert.match(portalApp, /Send verification/);
  assert.match(portalApp, /Set password/);
  assert.match(portalApp, /Check your email/);
  assert.match(portalApp, /Email verified successfully/);
  assert.match(portalApp, /Continue to sign in/);
  assert.match(portalApp, /Frequency/);
  assert.match(portalApp, /Weekday/);
  assert.match(portalApp, /Save paid payment/);
  assert.match(portalApp, /Save escrow/);
  assert.match(portalApp, /Escrow History/);
  assert.match(portalApp, /Edit Payment/);
  assert.match(portalApp, /Edit User/);
  assert.match(portalApp, /Edit Bidder Settings/);
  assert.match(portalApp, /Remove/);
  assert.match(portalApp, /Delete/);
  assert.doesNotMatch(portalApp, /Roles ready|Work logging|No Stripe|set payment rates/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(`${page}\n${layout}\n${portalApp}`, /codex-preview|Your site is taking shape/i);
});

test("declares the requested frontend records", async () => {
  const [portalApp, packageJson, vercelConfig, envExample, appEntries] = await Promise.all([
    readFile(new URL("../app/PortalApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
    readFile(new URL("../.env.local.example", import.meta.url), "utf8"),
    readdir(new URL("../app/", import.meta.url), { recursive: true }),
  ]);

  for (const label of [
    "User Management",
    "Manage accounts, approval status, roles, passwords, and email verification.",
    "My Profile",
    "Client Search",
    "Assigned client",
    "Bidder Settings",
    "Work Summary",
    "Daily Bidder Log",
    "Unpaid Work Totals",
    "Payment Method",
    "Payment History",
    "Escrow History",
    "Save paid payment",
    "Save escrow",
    "Edit Payment",
    "Edit User",
    "Edit Bidder Settings",
    "Remove",
    "Actions",
    "Payment link",
    "Group Chat",
    "Bidder Group",
    "Local ",
    "Client time ",
  ]) {
    assert.match(portalApp, new RegExp(label));
  }

  for (const action of [
    "refreshPortal",
    "requestPasswordReset",
    "resetPassword",
    "verifyEmail",
    "signIn",
    "updateUser",
    "setUserPassword",
    "deleteUser",
    "requestEmailVerification",
    "signUp",
    "saveProfile",
    "addEscrow",
    "savePaymentMethod",
    "saveWorkLog",
    "deleteWorkLog",
    "addPayment",
    "editPayment",
    "deletePayment",
    "addChatMessage",
    "editChatMessage",
    "deleteChatMessage",
  ]) {
    assert.match(portalApp, new RegExp(action));
  }

  const parsedPackage = JSON.parse(packageJson);
  assert.match(portalApp, /NEXT_PUBLIC_API_BASE_URL/);
  assert.match(portalApp, /NEXT_PUBLIC_PORTAL_MODE/);
  assert.match(portalApp, /\/api\/portal/);
  assert.match(portalApp, /filterWorkLogsByDate/);
  assert.match(portalApp, /dateRangeFromPreset/);
  assert.match(portalApp, /selectedUserId/);
  assert.match(portalApp, /isWorkLogPaid/);
  assert.match(portalApp, /NEXT_PUBLIC_ADMIN_TIME_ZONE/);
  assert.match(portalApp, /assignedAdminId/);
  assert.match(portalApp, /profileCompletedAt/);
  assert.match(portalApp, /clientStats/);
  assert.match(portalApp, /clientUsers/);
  assert.match(portalApp, /EscrowTable/);
  assert.match(portalApp, /isAdminRole/);
  assert.match(portalApp, /isWorkerUser/);
  assert.match(portalApp, /Notification/);
  assert.match(portalApp, /FileReader/);
  assert.match(portalApp, /authorTimeZone/);
  assert.match(portalApp, /sessionToken/);
  assert.match(portalApp, /workLogId/);
  assert.match(portalApp, /ActionMenu/);
  assert.match(portalApp, /viewRoutes/);
  assert.match(portalApp, /routeViews/);
  assert.match(portalApp, /navigateToView/);
  assert.match(portalApp, /\/bidder-settings/);
  assert.match(portalApp, /\/payments/);
  assert.match(portalApp, /\/profile/);
  assert.match(portalApp, /\/clients/);
  assert.match(portalApp, /aria-haspopup="menu"/);
  assert.match(portalApp, /fixed z-50/);
  assert.match(portalApp, /hover:bg-white\/80/);
  assert.match(portalApp, /auth-logo/);
  assert.match(portalApp, /sidebar-logo/);
  assert.match(portalApp, /telegram-chat-title/);
  assert.match(portalApp, /composer-shell/);
  assert.match(portalApp, /message-row/);
  assert.match(portalApp, /verificationPendingEmail/);
  assert.match(portalApp, /verificationSuccessEmail/);
  assert.match(portalApp, /paymentFrequency/);
  assert.match(portalApp, /paymentWeekday/);
  assert.match(portalApp, /nextPaymentDateFromSchedule/);
  assert.match(portalApp, /modal-panel/);
  assert.match(portalApp, /Cancel/);
  assert.match(portalApp, /audio controls/);
  assert.match(portalApp, /img src/);
  assert.match(envExample, /NEXT_PUBLIC_API_BASE_URL/);
  assert.match(envExample, /NEXT_PUBLIC_PORTAL_MODE/);
  assert.match(envExample, /NEXT_PUBLIC_ADMIN_TIME_ZONE/);
  assert.equal(parsedPackage.dependencies.mongodb, undefined);
  assert.equal(parsedPackage.scripts.build, "next build");
  assert.equal(parsedPackage.scripts["db:generate"], undefined);
  assert.equal(JSON.parse(vercelConfig).framework, "nextjs");
  for (const routePage of [
    "operations/page.tsx",
    "dashboard/page.tsx",
    "profile/page.tsx",
    "clients/page.tsx",
    "people/page.tsx",
    "bidder-settings/page.tsx",
    "work/page.tsx",
    "payments/page.tsx",
    "chat/page.tsx",
  ]) {
    assert.equal(appEntries.some((entry) => String(entry) === routePage), true);
  }
  assert.equal(appEntries.some((entry) => String(entry) === "api/portal/route.ts"), false);
  assert.doesNotMatch(`${portalApp}\n${packageJson}\n${envExample}`, /@neondatabase|drizzle|DATABASE_URL|MONGODB_URI|cloudflare:workers|env\.DB/);
});

test("does not keep starter preview files", async () => {
  const entries = await readdir(new URL("../app/", import.meta.url), {
    recursive: true,
  });

  assert.equal(entries.some((entry) => String(entry).includes("SkeletonPreview.tsx")), false);
  assert.equal(entries.some((entry) => String(entry).includes("preview.css")), false);
});
