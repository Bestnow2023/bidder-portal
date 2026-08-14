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
  assert.match(portalApp, /Daily Bidder Log/);
  assert.match(portalApp, /Payment History/);
  assert.match(portalApp, /Group Chat/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(`${page}\n${layout}\n${portalApp}`, /codex-preview|Your site is taking shape/i);
});

test("declares the requested records", async () => {
  const [schema, route, store] = await Promise.all([
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/portal/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/portal-store.ts", import.meta.url), "utf8"),
  ]);

  for (const table of [
    "portalUsers",
    "portalPaymentMethods",
    "portalWorkLogs",
    "portalPayments",
    "portalChatMessages",
  ]) {
    assert.match(schema, new RegExp(table));
  }

  for (const action of [
    "updateUser",
    "savePaymentMethod",
    "saveWorkLog",
    "addPayment",
    "addChatMessage",
  ]) {
    assert.match(route, new RegExp(action));
    assert.match(store, new RegExp(action));
  }
});

test("does not keep starter preview files", async () => {
  const entries = await readdir(new URL("../app/", import.meta.url), {
    recursive: true,
  });

  assert.equal(entries.some((entry) => String(entry).includes("SkeletonPreview.tsx")), false);
  assert.equal(entries.some((entry) => String(entry).includes("preview.css")), false);
});
