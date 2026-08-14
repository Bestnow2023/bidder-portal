import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("keeps the bidder portal as the primary screen", async () => {
  const [page, layout, portalApp, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/PortalApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<PortalApp \/>/);
  assert.match(layout, /Bidder Work Portal/);
  assert.match(portalApp, /Email sign-in/);
  assert.match(portalApp, /Sign up/);
  assert.match(portalApp, /Dashboard/);
  assert.match(portalApp, /Work Summary/);
  assert.match(portalApp, /All Work Logs/);
  assert.match(portalApp, /Unpaid Work Logs/);
  assert.match(portalApp, /Date or start/);
  assert.match(portalApp, /Daily Bidder Log/);
  assert.match(portalApp, /Payment History/);
  assert.match(portalApp, /Payday Reminder/);
  assert.match(portalApp, /Upcoming Payments/);
  assert.match(portalApp, /Group Chat/);
  assert.match(portalApp, /Enable notifications/);
  assert.match(portalApp, /Attach file/);
  assert.match(portalApp, /Save edit/);
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
    "Work Summary",
    "Daily Bidder Log",
    "Unpaid Work Totals",
    "Payment Method",
    "Payment History",
    "Group Chat",
    "Local ",
    "Admin ",
  ]) {
    assert.match(portalApp, new RegExp(label));
  }

  for (const action of [
    "updateUser",
    "signUp",
    "savePaymentMethod",
    "saveWorkLog",
    "addPayment",
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
  assert.match(portalApp, /isWorkLogPaid/);
  assert.match(portalApp, /NEXT_PUBLIC_ADMIN_TIME_ZONE/);
  assert.match(portalApp, /Notification/);
  assert.match(portalApp, /FileReader/);
  assert.match(portalApp, /authorTimeZone/);
  assert.match(portalApp, /audio controls/);
  assert.match(portalApp, /img src/);
  assert.match(envExample, /NEXT_PUBLIC_API_BASE_URL/);
  assert.match(envExample, /NEXT_PUBLIC_PORTAL_MODE/);
  assert.match(envExample, /NEXT_PUBLIC_ADMIN_TIME_ZONE/);
  assert.equal(parsedPackage.dependencies.mongodb, undefined);
  assert.equal(parsedPackage.scripts.build, "next build");
  assert.equal(parsedPackage.scripts["db:generate"], undefined);
  assert.equal(JSON.parse(vercelConfig).framework, "nextjs");
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
