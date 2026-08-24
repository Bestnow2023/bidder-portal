import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

test("renders a help-only portal", async () => {
  const [homePage, helpPage, supportPage, app, layout, globals, envExample] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/help/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/support/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HelpCenterApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../.env.local.example", import.meta.url), "utf8"),
  ]);
  const routeDirs = await readdir(new URL("../app", import.meta.url), { withFileTypes: true });
  const routedFolders = routeDirs.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

  assert.deepEqual(routedFolders, ["help", "support"]);
  assert.match(homePage, /<HelpCenterApp view="help" \/>/);
  assert.match(helpPage, /<HelpCenterApp view="help" \/>/);
  assert.match(supportPage, /<HelpCenterApp view="support" \/>/);
  assert.match(layout, /title: "Help Center"/);
  assert.match(layout, /Guides and support/);
  assert.doesNotMatch(layout, /Bidder Work Portal|cryptomus/);

  assert.match(app, /Help Center/);
  assert.match(app, /Help<\/a>/);
  assert.match(app, /Support<\/a>/);
  assert.match(app, /Sign in/);
  assert.match(app, /mainPortalUrl/);
  assert.match(app, /refreshPortal/);
  assert.match(app, /addSupportMessage/);
  assert.match(app, /supportPollIntervalMs/);
  assert.match(app, /readInitialCredentials/);
  assert.match(app, /sessionToken/);
  assert.match(app, /roleAudience/);
  assert.match(app, /ClientGuide/);
  assert.match(app, /BidderGuide/);
  assert.match(app, /SuperAdminGuide/);
  assert.match(app, /FAQ/);
  assert.match(app, /Only client-related instructions are shown/);
  assert.match(app, /Only bidder-related instructions are shown/);
  assert.match(app, /Open Help from the main portal/);
  assert.doesNotMatch(app, /PortalApp|People Management|Billing Management|Contract Management/);

  assert.match(globals, /\.help-topbar/);
  assert.match(globals, /\.help-nav/);
  assert.match(globals, /\.support-workspace/);
  assert.match(globals, /\.support-workspace\.single/);
  assert.match(globals, /\.support-chat-title/);
  assert.match(globals, /\.support-message-list/);

  assert.match(envExample, /NEXT_PUBLIC_API_BASE_URL/);
  assert.match(envExample, /NEXT_PUBLIC_MAIN_PORTAL_URL/);
  assert.match(envExample, /https:\/\/bp-be\.digniware\.com/);
  assert.match(envExample, /https:\/\/bp\.digniware\.com/);
  assert.doesNotMatch(envExample, /MONGODB_URI|BREVO_API_KEY|SUPER_ADMIN_PASSWORD/);
});
